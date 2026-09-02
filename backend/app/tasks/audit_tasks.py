import asyncio
from typing import Optional
from app.db.session import SessionLocal
from app.models.audit import AuditLog


async def _save_audit_log_async(
    action: str,
    user_id: Optional[int],
    resource_type: Optional[str],
    resource_id: Optional[str],
    details: Optional[dict],
    ip_address: Optional[str],
    user_agent: Optional[str],
):
    try:
        # Prevent mapper errors by importing repository-based models here.
        # Yan etki importu: isimler kullanılmıyor, SQLAlchemy mapper'ının
        # çözülmesi için yüklenmeleri gerekiyor — silinmemeli.
        from app.repositories.patient.models import Hasta  # noqa: F401
        from app.models.appointment import Randevu  # noqa: F401

        async with SessionLocal() as session:
            if user_id:
                from app.models.user import User
                from sqlalchemy import select

                user_res = await session.execute(
                    select(User).filter(User.id == user_id)
                )
                user = user_res.scalars().first()
                if user and user.skip_audit:
                    return None

            audit_log = AuditLog(
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                details=details,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            session.add(audit_log)
            await session.commit()

    except Exception as e:
        print(f"🔥 [CRITICAL AUDIT DROP] Audit kütüğüne yazılamadı: {e}")


def process_audit_log(
    action: str,
    user_id: Optional[int],
    resource_type: Optional[str],
    resource_id: Optional[str],
    details: Optional[dict],
    ip_address: Optional[str],
    user_agent: Optional[str],
):
    """
    Kayıpsız Audit Log yazımı için senkron sarmalayıcı.
    Gerçek DB yazımını asenkron loop üzerinden yapar.
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(
                _save_audit_log_async(
                    action, user_id, resource_type, resource_id,
                    details, ip_address, user_agent,
                )
            )
        else:
            asyncio.run(
                _save_audit_log_async(
                    action, user_id, resource_type, resource_id,
                    details, ip_address, user_agent,
                )
            )
    except RuntimeError:
        asyncio.run(
            _save_audit_log_async(
                action, user_id, resource_type, resource_id,
                details, ip_address, user_agent,
            )
        )
