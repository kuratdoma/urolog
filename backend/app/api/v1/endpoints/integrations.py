from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from google_auth_oauthlib.flow import Flow
import os
import json
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.config import settings
from app.api import deps
from app.models.user_oauth import UserOAuth
from app.models.user import User
from sqlalchemy.future import select

router = APIRouter()

SCOPES = ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar"]


async def _get_google_client_credentials(db: AsyncSession):
    """Google OAuth Client ID ve Secret değerlerini DB'den (şifreli) veya fallback olarak env'den okur."""
    from app.repositories.setting_repository import SettingRepository
    from app.core.security import decrypt_value
    
    repo = SettingRepository(db)
    client_id_setting = await repo.get("google_client_id")
    client_secret_setting = await repo.get("google_client_secret")
    
    client_id = settings.GOOGLE_CLIENT_ID
    client_secret = settings.GOOGLE_CLIENT_SECRET
    
    if client_id_setting and client_id_setting.value:
        try:
            client_id = decrypt_value(client_id_setting.value)
        except Exception:
            client_id = client_id_setting.value
            
    if client_secret_setting and client_secret_setting.value:
        try:
            client_secret = decrypt_value(client_secret_setting.value)
        except Exception:
            client_secret = client_secret_setting.value
            
    return client_id, client_secret


@router.get("/google/config-status")
async def get_google_config_status(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Google Client ID ve Client Secret ayarlarının girilip girilmediğini kontrol eder."""
    client_id, client_secret = await _get_google_client_credentials(db)
    has_client_id = bool(client_id)
    has_client_secret = bool(client_secret)
    
    return {
        "configured": has_client_id and has_client_secret,
        "has_client_id": has_client_id,
        "has_client_secret": has_client_secret
    }


@router.get("/google/auth-url")
async def get_google_auth_url(
    target_user_id: Optional[int] = Query(None, description="Admin tarafından başka bir kullanıcı adına bağlanmak için user ID"),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Google OAuth login URL'ini oluşturur. target_user_id verilirse o kullanıcı adına bağlan."""
    client_id, client_secret = await _get_google_client_credentials(db)
    if not client_id or not client_secret:
        raise HTTPException(status_code=400, detail="Google API ayarları eksik. Lütfen Client ID ve Client Secret ayarlarını girin.")

    # Hedef kullanıcıyı belirle (admin ise başkası adına bağlanabilir)
    bind_user_id = current_user.id
    if target_user_id and target_user_id != current_user.id:
        # Admin kontrolü: sadece admin/superuser başkası adına bağlanabilir
        if not current_user.is_superuser and not getattr(current_user, 'is_admin', False):
            raise HTTPException(status_code=403, detail="Başka kullanıcı adına Google bağlantısı oluşturma yetkiniz yok")
        bind_user_id = target_user_id

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
            }
        },
        scopes=SCOPES,
    )
    flow.redirect_uri = settings.GOOGLE_REDIRECT_URI

    # State parametresini HMAC ile imzalayarak IDOR'ü engelliyoruz
    import time
    import hmac
    import hashlib
    import secrets
    
    code_verifier = secrets.token_urlsafe(64)
    flow.code_verifier = code_verifier
    
    state_payload = {
        "user_id": bind_user_id,
        "timestamp": int(time.time()),
        "nonce": os.urandom(8).hex(),
        "code_verifier": code_verifier
    }
    state_json = json.dumps(state_payload, separators=(',', ':'), sort_keys=True)
    signature = hmac.new(
        settings.SECRET_KEY.encode(),
        state_json.encode(),
        hashlib.sha256
    ).hexdigest()
    signed_state = json.dumps({"payload": state_payload, "sig": signature})

    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=signed_state,
    )

    return {"url": authorization_url, "state": state}


@router.get("/google/callback")
async def google_callback(
    code: str, state: str, db: AsyncSession = Depends(deps.get_db)
):
    """Google'dan dönen callback'i işler."""
    import time
    import hmac
    import hashlib

    try:
        state_obj = json.loads(state)
        payload = state_obj.get("payload", {})
        received_sig = state_obj.get("sig", "")
        
        # İmza doğrulaması (IDOR koruması)
        expected_json = json.dumps(payload, separators=(',', ':'), sort_keys=True)
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode(),
            expected_json.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(received_sig, expected_sig):
            raise HTTPException(status_code=400, detail="Geçersiz state imzası")
        
        if int(time.time()) - payload.get("timestamp", 0) > 300:
            raise HTTPException(status_code=400, detail="State süresi dolmuş")
            
        user_id = payload.get("user_id")
        code_verifier = payload.get("code_verifier")
    except (json.JSONDecodeError, KeyError, Exception):
        raise HTTPException(status_code=400, detail="Geçersiz state parametresi")

    if not user_id:
        raise HTTPException(
            status_code=400, detail="State içinde kullanıcı ID bulunamadı"
        )

    client_id, client_secret = await _get_google_client_credentials(db)
    if not client_id or not client_secret:
        raise HTTPException(status_code=400, detail="Google API ayarları eksik")

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
    )
    flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
    flow.code_verifier = code_verifier

    flow.fetch_token(code=code)
    credentials = flow.credentials

    # Veritabanına kaydet/güncelle
    result = await db.execute(
        select(UserOAuth).filter(
            UserOAuth.user_id == user_id, UserOAuth.provider == "google"
        )
    )
    db_oauth = result.scalars().first()

    expiry = datetime.now(timezone.utc) + timedelta(
        seconds=(
            credentials.expiry.timestamp() - datetime.now().timestamp()
            if credentials.expiry
            else 3600
        )
    )

    if db_oauth:
        db_oauth.access_token = credentials.token
        if credentials.refresh_token:
            db_oauth.refresh_token = credentials.refresh_token
        db_oauth.token_expiry = expiry
    else:
        db_oauth = UserOAuth(
            user_id=user_id,
            provider="google",
            access_token=credentials.token,
            refresh_token=credentials.refresh_token,
            token_expiry=expiry,
            scopes=",".join(credentials.scopes),
        )
        db.add(db_oauth)

    await db.commit()

    # Frontend'e geri yönlendir
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/settings?google_sync=success")


@router.get("/google/status")
async def get_google_status(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Bağlantı durumunu döner."""
    result = await db.execute(
        select(UserOAuth).filter(
            UserOAuth.user_id == current_user.id, UserOAuth.provider == "google"
        )
    )
    db_oauth = result.scalars().first()

    if not db_oauth:
        return {"connected": False}

    return {
        "connected": True,
        "expiry": db_oauth.token_expiry,
        "is_expired": db_oauth.token_expiry < datetime.now(timezone.utc),
    }


@router.get("/google/all-users-status")
async def get_all_users_google_status(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
):
    """Tüm kullanıcıların Google bağlantı durumunu döner (Admin)."""
    from app.models.user import User as UserModel
    
    users_result = await db.execute(
        select(UserModel).filter(UserModel.is_active == True).order_by(UserModel.full_name)
    )
    users = users_result.scalars().all()
    
    oauth_result = await db.execute(
        select(UserOAuth).filter(UserOAuth.provider == "google")
    )
    oauth_records = {r.user_id: r for r in oauth_result.scalars().all()}
    
    now = datetime.now(timezone.utc)
    return [
        {
            "user_id": u.id,
            "user_name": u.full_name,
            "user_email": u.email,
            "connected": u.id in oauth_records,
            "is_expired": u.id in oauth_records and oauth_records[u.id].token_expiry < now,
            "has_refresh_token": u.id in oauth_records and bool(oauth_records[u.id].refresh_token),
        }
        for u in users
    ]


@router.delete("/google/disconnect")
async def disconnect_google(
    target_user_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Google bağlantısını kaldır."""
    user_id_to_disconnect = current_user.id
    if target_user_id and target_user_id != current_user.id:
        if not current_user.is_superuser and not getattr(current_user, 'is_admin', False):
            raise HTTPException(status_code=403, detail="Başka kullanıcının bağlantısını kesme yetkiniz yok")
        user_id_to_disconnect = target_user_id
    
    result = await db.execute(
        select(UserOAuth).filter(
            UserOAuth.user_id == user_id_to_disconnect, UserOAuth.provider == "google"
        )
    )
    db_oauth = result.scalars().first()
    if not db_oauth:
        raise HTTPException(status_code=404, detail="Bağlantı bulunamadı")
    
    await db.delete(db_oauth)
    await db.commit()
    return {"status": "ok"}
