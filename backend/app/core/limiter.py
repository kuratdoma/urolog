"""
Rate limiter yapılandırması.

Sayaçlar Redis'te tutulur. slowapi'nin varsayılanı süreç içi bellektir; o
durumda her uvicorn/gunicorn worker'ı kendi sayacını tutar (4 worker =
limitin 4 katı) ve her deploy'da sayaçlar sıfırlanır. Redis zaten cache ve
Celery için ayakta olduğundan aynı örneği paylaşıyoruz.

Redis'e ulaşılamazsa uygulama açılışta patlamak yerine bellek içi sayaca
düşer: rate limit doğruluğu düşer ama servis ayakta kalır. Bu durum WARNING
olarak loglanır.
"""

import logging

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

logger = logging.getLogger("urolog_backend")


def _storage_uri() -> str:
    """Redis erişilebilirse Redis URI'si, değilse bellek içi depolama döner."""
    try:
        from limits.storage import storage_from_string

        storage = storage_from_string(settings.REDIS_URL)
        if storage.check():
            return settings.REDIS_URL
        raise RuntimeError("Redis ping başarısız")
    except Exception as exc:  # pragma: no cover - altyapı durumuna bağlı
        logger.warning(
            "Rate limiter Redis'e bağlanamadı (%s). Bellek içi sayaca düşülüyor — "
            "limitler worker'lar arasında paylaşılmayacak.",
            exc,
        )
        return "memory://"


limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],
    storage_uri=_storage_uri(),
)
