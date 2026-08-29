from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user, require_role
from app.core.permissions import UserRole
from app.repositories.setting_repository import SettingRepository
from app.schemas.setting import SystemSetting, SystemSettingCreate

router = APIRouter(
    # RBAC: Only ADMIN and DOCTOR can access system settings
    dependencies=[Depends(require_role(UserRole.ADMIN, UserRole.DOCTOR))],
    redirect_slashes=False
)


@router.get("", response_model=List[SystemSetting])
async def read_settings(db: AsyncSession = Depends(get_db)):
    """
    Get all system settings.
    """
    repo = SettingRepository(db)
    settings = await repo.get_all()
    for s in settings:
        db.expunge(s)  # Detach from session to prevent mutating the DB
        if s.key == "system_logo_url" and s.value and len(s.value) > 1000:
            s.value = "[large_logo_placeholder]"
        if s.key in ["google_api_key", "google_client_id", "google_client_secret"] and s.value:
            s.value = "••••••••••••••••"
    return settings


@router.get("/{key}", response_model=SystemSetting)
async def read_setting(key: str, db: AsyncSession = Depends(get_db)):
    """
    Get a specific setting by key.
    """
    repo = SettingRepository(db)
    setting = await repo.get(key)
    if not setting:
        return {"key": key, "value": "", "description": ""}
    db.expunge(setting)  # Detach from session to prevent mutating the DB
    if setting.key in ["google_api_key", "google_client_id", "google_client_secret"] and setting.value:
        setting.value = "••••••••••••••••"
    return setting


@router.post("", response_model=SystemSetting)
async def create_or_update_setting(
    setting_in: SystemSettingCreate, db: AsyncSession = Depends(get_db)
):
    """
    Create or update a system system setting.
    """
    repo = SettingRepository(db)
    
    if setting_in.key in ["google_api_key", "google_client_id", "google_client_secret"] and (not setting_in.value or setting_in.value == "••••••••••••••••"):
        existing = await repo.get(setting_in.key)
        if existing:
            db.expunge(existing)  # Detach from session
            existing.value = "••••••••••••••••"
            return existing
        else:
            setting_in.value = ""

    setting = await repo.create_or_update(
        key=setting_in.key, value=setting_in.value, description=setting_in.description
    )
    db.expunge(setting)  # Detach from session to prevent mutating the DB
    if setting.key in ["google_api_key", "google_client_id", "google_client_secret"] and setting.value:
        setting.value = "••••••••••••••••"
    return setting


@router.post("/batch", response_model=List[SystemSetting])
async def batch_update_settings(
    settings_in: List[SystemSettingCreate], db: AsyncSession = Depends(get_db)
):
    """
    Update multiple settings at once.
    """
    repo = SettingRepository(db)
    results = []
    import logging
    logger = logging.getLogger("urolog_backend")
    for s in settings_in:
        if s.key == "google_api_key":
            logger.info(f"Received google_api_key to save: length={len(s.value) if s.value else 0}, value_prefix={s.value[:4] if s.value else 'None'}")
        
        if s.key in ["google_api_key", "google_client_id", "google_client_secret"] and (not s.value or s.value == "••••••••••••••••"):
            existing = await repo.get(s.key)
            if existing:
                db.expunge(existing)  # Detach from session
                existing.value = "••••••••••••••••"
                results.append(existing)
            continue
            
        res = await repo.create_or_update(
            key=s.key, value=s.value, description=s.description
        )
        db.expunge(res)  # Detach from session to prevent mutating the DB
        if res.key in ["google_api_key", "google_client_id", "google_client_secret"] and res.value:
            res.value = "••••••••••••••••"
        results.append(res)
    return results
