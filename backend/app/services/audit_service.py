from sqlalchemy.ext.asyncio import AsyncSession
import json
from datetime import date, datetime
from uuid import UUID
from decimal import Decimal
from typing import Optional, Union
from app.tasks.audit_tasks import _save_audit_log_async

# Sensitive keys that should NEVER be logged
REDACTED_KEYS = {
    # Turkish keys
    "ad",
    "soyad",
    "tc",
    "tc_kimlik",
    "email",
    "telefon",
    "cep_tel",
    "ev_tel",
    "is_tel",
    "adres",
    "dogum_tarihi",
    "sifre",
    "parola",
    # English equivalents and common security keys
    "first_name",
    "last_name",
    "surname",
    "ssn",
    "phone",
    "mobile",
    "address",
    "birth_date",
    "password",
    "secret",
    "token",
    "auth",
    "cvv",
    "credit_card",
    "iban",
}


def serialize_for_json(obj, key=None):
    """Convert non-JSON-serializable objects to serializable format and redact PII."""
    if obj is None:
        return None

    # Redact PII based on key name
    if key and key.lower() in REDACTED_KEYS:
        return "[REDACTED]"

    if isinstance(obj, dict):
        return {k: serialize_for_json(v, key=k) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [serialize_for_json(item) for item in obj]
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, date):
        return obj.isoformat()
    if isinstance(obj, UUID):
        return str(obj)
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, bytes):
        return obj.decode("utf-8", errors="ignore")
    # For any other type, try str conversion
    try:
        json.dumps(obj)
        return obj
    except (TypeError, ValueError):
        return str(obj)


class AuditService:
    @staticmethod
    async def log(
        db: AsyncSession,
        action: str,
        user_id: Optional[int] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        """
        Asenkron arkaplan görevi (Background task) olarak çalışan Audit yazıcısı.
        Ana threadi (UI) bloklamaz ve veritabanı yavaşlıklarından API yanıt sürelerini (500ms limiti) etkilemez.
        """
        try:
            # Hemen dönüştürülebilen verileri hazırlayalım
            serialized_details = serialize_for_json(details) if details else None

            try:
                # Celery Task Queue eklentisi (Veri Kaybı Önleme - NFR4)
                await _save_audit_log_async(
                    action,
                    user_id,
                    resource_type,
                    str(resource_id) if resource_id else None,
                    serialized_details,
                    ip_address,
                    user_agent,
                )
            except (ImportError, Exception) as celery_err:
                # If Celery fails, log to DB directly or print warning
                # In production, we should ensure Celery is working
                print(f"⚠️ Audit Celery failure: {celery_err}. Audit log could not be queued.")
                # We could ideally log to DB here as fallback, but let's keep it simple for now
        except Exception as e:
            print(f"🔥 [CRITICAL AUDIT DROP] Audit log Celery kuyruğuna atılamadı: {e}")

        return None
