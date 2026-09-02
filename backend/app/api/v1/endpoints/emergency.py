import logging
from typing import Any
import asyncpg

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext

from app.api import deps
from app.core.config import settings
from app.models.user import User
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class EmergencyDropRequest(BaseModel):
    password: str
    confirmation_phrase: str


@router.post("/drop-database")
async def drop_database(
    request: Request,
    data: EmergencyDropRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    EMERGENCY ENDPOINT: Drops the active database.
    Requires Superuser permissions, password re-verification, and phrase matching.
    """

    # 1. Verify password again
    if not pwd_context.verify(data.password, current_user.hashed_password):
        # Audit Log: Failed Verification
        await AuditService.log(
            db=db,
            action="EMERGENCY_DATABASE_DROP",
            user_id=current_user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"error": "Password verification failed"},
        )
        raise HTTPException(status_code=401, detail="Şifre hatalı")

    # 2. Check phrase
    if data.confirmation_phrase != "VERİTABANINI SİLMEK GERİ DÖNÜŞÜMSÜZDÜR":
        # Audit Log: Failed Phrase
        await AuditService.log(
            db=db,
            action="EMERGENCY_DATABASE_DROP",
            user_id=current_user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"error": "Confirmation phrase mismatch"},
        )
        raise HTTPException(status_code=400, detail="Onay cümlesi eşleşmiyor.")

    # 3. Last Audit Log before drop
    # Because we're dropping the DB, this log might not survive if it's on the same DB,
    # but UroLog usually runs a separate Redis/Celery queue. We try to log it before termination.
    try:
        await AuditService.log(
            db=db,
            action="EMERGENCY_DATABASE_DROP",
            user_id=current_user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"status": "executing", "db_name": settings.DB_NAME},
        )
        await db.commit()  # Force commit local session
    except Exception as e:
        logger.error(f"Failed to save pre-drop audit log: {e}")

    # 4. Perform actual DB Drop using raw connection to 'postgres'
    db_name_to_drop = settings.DB_NAME
    conn = None
    try:
        # We must connect to a different database to drop the target DB.
        # Connecting to the default 'postgres' database or 'template1'
        logger.warning(f"EMERGENCY DROP INITIATED FOR DB: {db_name_to_drop} BY USER: {current_user.email}")

        conn = await asyncpg.connect(
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database="postgres",
            host=settings.DB_HOST,
            port=settings.DB_PORT
        )

        # Terminate all connections to the target DB
        terminate_query = """
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1 AND pid <> pg_backend_pid();
        """
        await conn.execute(terminate_query, db_name_to_drop)

        # Drop the database (cannot be parameterized directly in asyncpg, so string format)
        drop_query = f'DROP DATABASE "{db_name_to_drop}"'  # Using quotes in case of hyphens etc.
        await conn.execute(drop_query)

        logger.critical(f"DATABASE {db_name_to_drop} DROPPED SUCCESSFULLY.")

    except Exception as e:
        logger.error(f"Emergency Drop Failed: {e}")
        # The system might still be alive if drop failed, throw error
        raise HTTPException(status_code=500, detail=f"Veritabanı silme işlemi başarısız oldu: {str(e)}")
    finally:
        if conn:
            await conn.close()

    # IF we reach here, the DB is gone. The backend will crash on next request.
    return {"status": "dropped"}
