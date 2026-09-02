import logging
from typing import Any, List, Optional
from datetime import datetime, timedelta, timezone
import secrets
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, ConfigDict
from app.core.limiter import limiter
from app.core.config import settings

from app.api import deps
from app.core.permissions import UserRole
from app.services.auth_service import AuthService
from app.repositories.user_repository import UserRepository
from app.models.user import User
from app.models.password_reset import PasswordResetToken
import traceback
from app.services.audit_service import AuditService
from app.services.email_service import send_password_reset_email, send_username_reminder
from app.core.security_helpers import validate_password
from app.core.pii_scrubber import mask_identifiers

logger = logging.getLogger("urolog_backend")

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# SEC: refresh token artık response body'de değil, httpOnly cookie'de
# taşınıyor (access token JS'de kalmaya devam ediyor — bkz. PR notu).
# Path sadece auth endpoint'lerine sınırlı, her API isteğinde gitmez.
_REFRESH_COOKIE_NAME = "refresh_token"
_REFRESH_COOKIE_PATH = "/api/v1/auth"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=_REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        path=_REFRESH_COOKIE_PATH,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )


from app.schemas.user import UserCreate, UserUpdate, User as UserSchema


# Redefine UserResponse to include role if needed, or use UserSchema
class UserResponse(UserSchema):
    role: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


@router.post("/login", response_model=dict)
@limiter.limit("5/minute")
async def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    user_repo = UserRepository(db)
    auth_service = AuthService(user_repo)
    try:
        # Note: OAuth2PasswordRequestForm uses 'username' field, which can be email or username
        identifier = form_data.username.strip()
        result = await auth_service.authenticate_user(identifier, form_data.password)

        # Audit Log: Login Success — kullanıcıyı AuthService zaten yükledi,
        # yeniden sorgulamıyoruz.
        await AuditService.log(
            db=db,
            action="USER_LOGIN",
            user_id=result["user_id"],
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"identifier": identifier},
        )

        # SEC: refresh token body'de dönmüyor, httpOnly cookie'ye taşınıyor.
        _set_refresh_cookie(response, result["refresh_token"])
        return {"access_token": result["access_token"], "token_type": result["token_type"]}
    except HTTPException as e:
        # Audit Log: Login Failed (Generic)
        await AuditService.log(
            db=db,
            action="USER_LOGIN_FAILED",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"identifier": form_data.username.strip(), "error": e.detail},
        )
        raise e
    except Exception as e:
        # SEC-13: dosyaya yazma, yalnız sunucu log'una. print() yerine
        # yapılandırılmış logger kullanılıyor ki satır formatlayıcıdan geçsin;
        # traceback frame'leri gönderilen kimlik bilgisini taşıyabildiği için
        # AGENTS.md §4.5 gereği pii_scrubber'dan geçiriliyor.
        logger.exception(
            "[LOGIN ERROR] %s", mask_identifiers(traceback.format_exc())
        )
        raise e


@router.post("/refresh", response_model=dict)
@limiter.limit("10/minute")
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    SEC-CRIT-01: Refresh token rotation.
    Refresh token httpOnly cookie'den okunur (artık body'de gelmiyor).
    Geçerliyse invalidate edilir, yeni access token + rotasyonlu cookie döner.
    If a used token is replayed, the user's entire token family is revoked.
    """
    from app.core.security import decode_refresh_token, create_access_token, create_refresh_token
    from app.core.token_manager import mark_token_used, is_token_used, is_user_revoked, revoke_user_tokens
    from jose import JWTError

    credentials_exception = HTTPException(
        status_code=401,
        detail="Geçersiz veya süresi dolmuş refresh token.",
    )

    incoming_refresh_token = request.cookies.get(_REFRESH_COOKIE_NAME)
    if not incoming_refresh_token:
        raise credentials_exception

    try:
        payload = decode_refresh_token(incoming_refresh_token)
    except (JWTError, ValueError):
        raise credentials_exception

    user_id = payload.get("sub")
    jti = payload.get("jti")
    iat = payload.get("iat", 0)

    if not user_id or not jti:
        raise credentials_exception

    # Check if token was already used (replay attack detection)
    if await is_token_used(jti):
        # SECURITY: A used token was replayed — revoke ALL tokens for this user
        await revoke_user_tokens(int(user_id))
        await AuditService.log(
            db=db,
            action="TOKEN_REPLAY_DETECTED",
            user_id=int(user_id),
            ip_address=request.client.host if request.client else None,
            details={"jti": jti, "action": "all_tokens_revoked"},
        )
        raise HTTPException(
            status_code=401,
            detail="Güvenlik ihlali tespit edildi. Tüm oturumlar sonlandırıldı.",
        )

    # Check if user's tokens were globally revoked (logout/password change)
    if await is_user_revoked(int(user_id), iat):
        raise credentials_exception

    # Verify user still exists and is active
    result = await db.execute(select(User).filter(User.id == int(user_id)))
    user = result.scalars().first()
    if not user or not user.is_active:
        raise credentials_exception

    # Mark old token as used (rotation)
    await mark_token_used(jti, int(user_id))

    # Issue new token pair
    new_access = create_access_token(
        user.id,
        name=user.full_name or user.email,
        username=user.username,
        email=user.email,
        role=user.role,
        clinic_id=user.clinic_id,
        is_superuser=user.is_superuser,
    )
    new_refresh = create_refresh_token(
        user.id,
        name=user.full_name or user.email,
        username=user.username,
        email=user.email,
        role=user.role,
        clinic_id=user.clinic_id,
        is_superuser=user.is_superuser,
    )

    _set_refresh_cookie(response, new_refresh)
    return {
        "access_token": new_access,
        "token_type": "bearer",
    }


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> dict:
    """
    Logout: Revoke all refresh tokens for the current user, clear the
    refresh token cookie.
    """
    from app.core.token_manager import revoke_user_tokens

    await revoke_user_tokens(current_user.id)
    response.delete_cookie(key=_REFRESH_COOKIE_NAME, path=_REFRESH_COOKIE_PATH)

    await AuditService.log(
        db=db,
        action="USER_LOGOUT",
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return {"message": "Oturum başarıyla sonlandırıldı."}


@router.get("/me", response_model=UserResponse)
async def get_current_user(current_user: User = Depends(deps.get_current_user)) -> Any:
    """Get current logged-in user info."""
    return current_user


@router.get("/me/permissions")
async def get_my_permissions(current_user: User = Depends(deps.get_current_user)) -> dict:
    """
    Returns the current user's accessible modules and their allowed CRUD actions.
    Frontend uses this to filter sidebar items and control UI element visibility.
    """
    from app.core.permissions import PERMISSION_MATRIX, get_accessible_modules

    role = deps._resolve_role(current_user)
    accessible = get_accessible_modules(role)

    # Build detailed permission map: { module: ["read", "create", ...] }
    module_permissions = {}
    for module in accessible:
        perms = PERMISSION_MATRIX.get(module, {})
        actions = perms.get(role, frozenset())
        module_permissions[module] = sorted(a.value for a in actions)

    return {
        "role": role.value,
        "modules": module_permissions,
    }


class VerifyPasswordRequest(BaseModel):
    password: str


class ForgotUsernameRequest(BaseModel):
    email: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/verify-password")
async def verify_password(
    request: Request,
    data: VerifyPasswordRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> dict:
    """
    Verify current user's password without generating new tokens.
    Used for sensitive operations like viewing audit logs.
    """
    if not pwd_context.verify(data.password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Şifre hatalı")

    return {"valid": True, "is_superuser": current_user.is_superuser}


@router.post("/forgot-username")
@limiter.limit("3/minute")
async def forgot_username(
    request: Request,
    data: ForgotUsernameRequest,
    db: AsyncSession = Depends(deps.get_db),
) -> dict:
    """
    Send username reminder to email address via Brevo SMTP.
    """
    result = await db.execute(select(User).filter(User.email == data.email))
    user = result.scalars().first()

    if user:
        # Send actual email
        email_sent = await send_username_reminder(data.email, user.username)

        # Audit Log
        await AuditService.log(
            db=db,
            action="FORGOT_USERNAME_REQUEST",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"email": data.email, "found": True, "email_sent": email_sent},
        )
    else:
        # Don't reveal if email exists or not (security)
        print(f"[FORGOT-USERNAME] Email: {data.email} -> Not found")

    # Always return success message to prevent email enumeration
    return {
        "message": "Eğer bu email adresi kayıtlıysa, kullanıcı adınız gönderilecektir."
    }


@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(deps.get_db),
) -> dict:
    """
    Request password reset. Sends email with reset link.
    Token expires in 5 minutes.
    """
    user_repo = UserRepository(db)
    user = await user_repo.get_by_email(data.email)

    if user:
        # Generate secure token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

        # Invalidate any existing tokens for this user
        existing_tokens = await db.execute(
            select(PasswordResetToken).filter(
                PasswordResetToken.user_id == user.id, PasswordResetToken.used == False
            )
        )
        for existing_token in existing_tokens.scalars().all():
            existing_token.used = True

        # Create new token
        reset_token = PasswordResetToken(
            user_id=user.id, token=token, expires_at=expires_at
        )
        db.add(reset_token)
        await db.commit()

        # Build reset URL
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"

        # Send email
        email_sent = await send_password_reset_email(
            to_email=data.email,
            reset_url=reset_url,
            user_name=user.full_name or user.email,
        )

        # Audit Log
        await AuditService.log(
            db=db,
            action="PASSWORD_RESET_REQUEST",
            user_id=user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"email": data.email, "email_sent": email_sent},
        )
    else:
        # Don't reveal if email exists (security)
        print(f"[FORGOT-PASSWORD] Email not found: {data.email}")

    # Always return success to prevent email enumeration
    return {
        "message": "Eğer bu email adresi kayıtlıysa, şifre sıfırlama linki gönderilecektir."
    }


@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(deps.get_db),
) -> dict:
    """
    Reset password using token from email.
    """
    # Find token
    result = await db.execute(
        select(PasswordResetToken).filter(
            PasswordResetToken.token == data.token, PasswordResetToken.used == False
        )
    )
    reset_token = result.scalars().first()

    if not reset_token:
        raise HTTPException(status_code=400, detail="Geçersiz veya kullanılmış token.")

    # Check expiration
    if datetime.now(timezone.utc) > reset_token.expires_at:
        reset_token.used = True
        await db.commit()
        raise HTTPException(
            status_code=400,
            detail="Token süresi dolmuş. Lütfen yeni bir şifre sıfırlama talebi oluşturun.",
        )

    # Get user
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(reset_token.user_id)

    if not user:
        raise HTTPException(status_code=400, detail="Kullanıcı bulunamadı.")

    # SEC-06: Güçlü şifre politikası doğrulaması
    validate_password(data.new_password)

    # Update password
    hashed_password = pwd_context.hash(data.new_password)
    await user_repo.update_password(user, hashed_password)

    # Mark token as used
    reset_token.used = True
    await db.commit()

    # SEC: Şifre sıfırlandıktan sonra mevcut tüm refresh token'ları iptal et
    # (çalınmış bir token'ın şifre değişse bile geçerli kalmasını engeller)
    from app.core.token_manager import revoke_user_tokens
    await revoke_user_tokens(user.id)

    # Audit Log
    await AuditService.log(
        db=db,
        action="PASSWORD_RESET_COMPLETE",
        user_id=user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"email": user.email},
    )

    return {
        "message": "Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz."
    }


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.require_role(UserRole.ADMIN, UserRole.DOCTOR)),
) -> Any:
    """List all users (requires ADMIN or DOCTOR role)."""
    # Filter hidden users
    result = await db.execute(
        select(User).filter(User.is_hidden.is_not(True)).order_by(User.id)
    )
    return result.scalars().all()


@router.post("/users", response_model=UserResponse)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.require_role(UserRole.ADMIN, UserRole.DOCTOR)),
) -> Any:
    """Create a new user (requires ADMIN or DOCTOR role)."""

    # Privilege escalation guard: only ADMIN can create ADMIN users or superusers
    caller_role = deps._resolve_role(current_user)
    requested_role = getattr(user_in, "role", UserRole.DOCTOR) or UserRole.DOCTOR
    if requested_role == UserRole.ADMIN and caller_role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Sadece ADMIN yetkisi olanlar ADMIN rolünde kullanıcı oluşturabilir.")
    if user_in.is_superuser and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Sadece süper yöneticiler süper yönetici oluşturabilir.")

    # Check if username exists
    result = await db.execute(select(User).filter(User.username == user_in.username))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Bu kullanıcı adı zaten mevcut.")

    # Check if email exists (if provided)
    if user_in.email:
        result = await db.execute(select(User).filter(User.email == user_in.email))
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Bu email zaten kullanılıyor.")

    # SEC-06: Şifre politikası doğrulaması
    validate_password(user_in.password)

    # Create user
    hashed_password = pwd_context.hash(user_in.password)
    new_user = User(
        username=user_in.email,  # Enforce email as username
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        email=user_in.email,
        is_active=user_in.is_active if user_in.is_active is not None else True,
        is_superuser=user_in.is_superuser if current_user.is_superuser else False,
        role=requested_role,
    )
    if getattr(user_in, "clinic_id", None) is not None:
        new_user.clinic_id = user_in.clinic_id

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Audit Log
    await AuditService.log(
        db=db,
        action="USER_CREATE",
        user_id=current_user.id,
        resource_type="user",
        resource_id=str(new_user.id),
        details={
            "username": new_user.username,
            "email": new_user.email,
            "role": new_user.role.value if hasattr(new_user.role, 'value') else str(new_user.role),
        },
    )

    return new_user


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.require_role(UserRole.ADMIN, UserRole.DOCTOR)),
) -> Any:
    """Delete a user (requires ADMIN or DOCTOR role)."""

    # Check if user exists
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    # Prevent self-deletion
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Kendi hesabınızı silemezsiniz.")

    # Only ADMIN can delete ADMIN users
    target_role = deps._resolve_role(user)
    caller_role = deps._resolve_role(current_user)
    if target_role == UserRole.ADMIN and caller_role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="ADMIN kullanıcıları sadece başka bir ADMIN silebilir.")

    await db.delete(user)

    # Audit Log
    await AuditService.log(
        db=db,
        action="USER_DELETE",
        user_id=current_user.id,
        resource_type="user",
        resource_id=str(user_id),
        details={"deleted_username": user.username},
    )

    await db.commit()
    return {"message": "Kullanıcı silindi."}


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Update a user. Self-edit allowed for name/email/password. Role/status changes require ADMIN or DOCTOR."""
    caller_role = deps._resolve_role(current_user)
    is_self_edit = current_user.id == user_id
    is_privileged = caller_role in (UserRole.ADMIN, UserRole.DOCTOR)

    if not is_self_edit and not is_privileged:
        raise HTTPException(
            status_code=403, detail="Kullanıcı güncelleme yetkiniz yok."
        )

    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    # Basic fields: anyone can update their own
    if user_in.full_name is not None:
        user.full_name = user_in.full_name
    if user_in.email is not None:
        user.email = user_in.email
        user.username = user_in.email  # Keep identity synced
    if user_in.password:
        validate_password(user_in.password)
        user.hashed_password = pwd_context.hash(user_in.password)

    # Privileged fields: only ADMIN/DOCTOR can change others' role, status
    if is_privileged and not is_self_edit:
        target_role = deps._resolve_role(user)
        if target_role == UserRole.ADMIN and caller_role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="ADMIN kullanıcılarını sadece başka bir ADMIN düzenleyebilir.")

        if user_in.is_active is not None:
            user.is_active = user_in.is_active
        if user_in.role is not None:
            # Privilege escalation guard: only ADMIN can assign ADMIN role
            if user_in.role == UserRole.ADMIN and caller_role != UserRole.ADMIN:
                raise HTTPException(status_code=403, detail="Sadece ADMIN, başka bir kullanıcıya ADMIN rolü atayabilir.")
            user.role = user_in.role
        if getattr(user_in, "clinic_id", None) is not None:
            user.clinic_id = user_in.clinic_id

    # Superuser flag: only actual superusers can grant/revoke
    if user_in.is_superuser is not None and current_user.is_superuser:
        user.is_superuser = user_in.is_superuser

    await db.commit()
    await db.refresh(user)

    # Audit Log
    await AuditService.log(
        db=db,
        action="USER_UPDATE",
        user_id=current_user.id,
        resource_type="user",
        resource_id=str(user.id),
        details={"username": user.username},
    )

    return user
