from celery import Celery
from app.core.config import settings

# Initialize Celery app
# Defaults to normal redis string construction if REDIS_URL has complex chars?
# Using settings.REDIS_URL directly is fine for Celery broker.
celery_app = Celery("uro_worker", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Worker configuration
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)
