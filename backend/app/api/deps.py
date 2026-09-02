from typing import Generator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.db.session import SessionLocal
from app.core.config import settings
from app.models.user import User
from app.core.permissions import UserRole, Action, has_permission

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_db() -> Generator[AsyncSession, None, None]:
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
) -> User:
    return await validate_token(token, db)


async def get_current_user_from_token(
    token: str, db: AsyncSession = Depends(get_db)
) -> User:
    """Validate JWT token from query parameter."""
    return await validate_token(token, db)


async def validate_token(token: str, db: AsyncSession) -> User:
    """Helper to validate JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Kimlik doğrulama başarısız.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if token is None:
        raise credentials_exception

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")

        if user_id is None or token_type != "access":
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).filter(User.id == int(user_id)))
    user = result.scalars().first()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Kullanıcı devre dışı.")

    return user


async def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için süper yönetici yetkisi gereklidir.",
        )
    return current_user


# ─── RBAC Dependency Factories ────────────────────────────────────

def _resolve_role(user: User) -> UserRole:
    """
    Safely convert the user's role string to UserRole enum.
    Falls back to most restrictive role if value is unknown.
    """
    # getattr: role alanı hiç bulunmayan bir nesne AttributeError ile 500'e
    # yol açıyordu; docstring "bilinmeyen değerde en kısıtlayıcıya düş" diyor.
    raw = getattr(user, "role", None)
    if isinstance(raw, UserRole):
        return raw
    try:
        return UserRole(raw)
    except (ValueError, KeyError):
        return UserRole.FRONTDESK


def require_role(*allowed_roles: UserRole):
    """
    Module-level gate: checks if the current user's role is in the whitelist.

    Usage:
        @router.get("/finance", dependencies=[Depends(require_role(UserRole.ADMIN, UserRole.DOCTOR))])
        async def finance_dashboard(...):
    """
    async def _guard(current_user: User = Depends(get_current_user)) -> User:
        role = _resolve_role(current_user)
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bu modüle erişim yetkiniz bulunmuyor. Gerekli rol: {', '.join(r.value for r in allowed_roles)}",
            )
        return current_user

    return _guard


def require_permission(module: str, action: Action):
    """
    Granular CRUD-level gate: checks the permission matrix.

    Usage:
        @router.post("/patients", dependencies=[Depends(require_permission("patients", Action.CREATE))])
        async def create_patient(...):
    """
    async def _guard(current_user: User = Depends(get_current_user)) -> User:
        role = _resolve_role(current_user)
        if not has_permission(role, module, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bu işlem için yetkiniz bulunmuyor ({module}/{action.value}).",
            )
        return current_user

    return _guard
