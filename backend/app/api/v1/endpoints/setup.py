"""
İlk kurulum endpoint'i.
Sadece veritabanında hiç kullanıcı yoksa çalışır.
Auth gerektirmez — kurulum tamamlandıktan sonra bu endpoint etkisiz hale gelir.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from app.api import deps
from app.models.user import User, UserRole
from app.core.security import get_password_hash

router = APIRouter()


class SetupCheckResponse(BaseModel):
    needs_setup: bool


class InitialSetupRequest(BaseModel):
    email: str
    username: str
    full_name: str
    password: str


async def _user_count(db: AsyncSession) -> int:
    result = await db.execute(select(func.count()).select_from(User))
    return result.scalar() or 0


@router.get("/check", response_model=SetupCheckResponse)
async def setup_check(db: AsyncSession = Depends(deps.get_db)):
    """Kurulum gerekip gerekmediğini döner. Auth gerekmez."""
    count = await _user_count(db)
    return {"needs_setup": count == 0}


@router.post("/initialize")
async def initialize_system(
    data: InitialSetupRequest,
    db: AsyncSession = Depends(deps.get_db),
):
    """
    İlk admin kullanıcısını oluşturur.
    Yalnızca veritabanında hiç kullanıcı yoksa çalışır.
    """
    count = await _user_count(db)
    if count > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Kurulum zaten tamamlanmış. Yeni kullanıcı eklemek için giriş yapın.",
        )

    if len(data.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Şifre en az 8 karakter olmalıdır.",
        )

    user = User(
        email=data.email,
        username=data.username,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        role=UserRole.ADMIN,
        is_superuser=True,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    return {"message": "Kurulum tamamlandı. Giriş yapabilirsiniz."}
