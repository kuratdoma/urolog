import os
import traceback
import logging

from app.core.logging_config import setup_logging, request_id_ctx_var

# Configure structured logging for production
setup_logging()
logger = logging.getLogger("urolog_backend")
from fastapi import FastAPI, Depends, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from starlette.middleware.gzip import GZipMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.core.config import settings
from app.core.exceptions import AppError, app_error_handler
import app.db.base

from app.api.v1.endpoints import (
    auth,
    patients,
    clinical,
    lab,
    finance,
    appointments,
    documents,
    dashboard,
    settings as settings_endpoint,
    reports,
    system,
    integrations,
    audit,
    stock,
    ai_scribe,
    patient_report,
    lab_analysis,
    definitions,
    emergency,
    consent_forms,
    hpv_briefing,
    insurance_provision,
    setup,
    personal_notes,
)
import app.db.base

# ... (omitted headers)


from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.limiter import limiter
from sqlalchemy import text
from app.schemas.health import HealthResponse, ServicesStatus, HealthStatus

from redis import asyncio as aioredis
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from app.core.cache_key_builder import cache_key_builder

from contextlib import asynccontextmanager


from app.db.session import SessionLocal

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Database connectivity check
    try:
        async with SessionLocal() as db:
            await db.execute(text("SELECT 1"))
            logger.info("Database connection verified.")
    except Exception as db_err:
        logger.error(f"Database connection failed: {db_err}")

    try:
        redis = aioredis.from_url(
            settings.REDIS_URL
        )
        # Check connection
        await redis.ping()
        FastAPICache.init(
            RedisBackend(redis), prefix="fastapi-cache", key_builder=cache_key_builder
        )
        app.state.redis = redis
        logger.info(
            f"Redis cache initialized on {settings.REDIS_HOST}:{settings.REDIS_PORT}"
        )
    except Exception as e:
        logger.warning(
            f"Redis is not available ({e}). Caching is disabled. System will run normally without cache."
        )
        # Initialize with dummy or null backend if possible, or just skip
        from fastapi_cache.backends.inmemory import InMemoryBackend

        FastAPICache.init(
            InMemoryBackend(), prefix="fastapi-cache", key_builder=cache_key_builder
        )
        app.state.redis = None
        logger.info("Using InMemory cache as fallback.")
    yield
    # We can add shutdown events here if needed
    if getattr(app.state, "redis", None):
        await app.state.redis.close()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="UroLOG EMR System Backend API",
    version=settings.GIT_SHA,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
    redirect_slashes=False,
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = traceback.format_exc()
    req_id = request_id_ctx_var.get()
    
    # ContextVar automatically injects request_id into JSON log
    logger.critical(f"CRITICAL ERROR at {request.url}\n{error_msg}")
    
    # SEC-03: Traceback'ler ASLA istemciye dönmez — sadece sunucu loglarına yazılır
    # OBS-CRIT-01: Fakat Request ID istemciye dönmeli ki debug edilebilsin
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "request_id": req_id
        },
    )


app.add_exception_handler(AppError, app_error_handler)

# SEC-12: Trust only known proxy sources (nginx within Docker network)

app.add_middleware(
    ProxyHeadersMiddleware, trusted_hosts=["127.0.0.1", "::1", "nginx", "backend"]
)

# Add Limiter to app state and register handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# OBS-CRIT-01: Tracing Middleware
from app.middleware.tracing import TracingMiddleware
app.add_middleware(TracingMiddleware)

# Origins for CORS
origins = [str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    # SEC-11: Sadece kullanılan HTTP metodlarına izin ver
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    # SEC-11: Sadece gerekli headerlara izin ver
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "X-Requested-With",
    ],
)

# PERF: JSON gövdelerini (hasta listeleri, ICD/ilaç tanımları) sıkıştırarak
# transfer boyutunu düşürür. minimum_size altındaki gövdeler sıkıştırmanın
# overhead'ine değmeyeceği için atlanır.
app.add_middleware(GZipMiddleware, minimum_size=500)

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(
    patients.router, prefix=f"{settings.API_V1_STR}/patients", tags=["patients"]
)
app.include_router(
    clinical.router, prefix=f"{settings.API_V1_STR}/clinical", tags=["clinical"]
)
app.include_router(
    clinical.public_router, prefix=f"{settings.API_V1_STR}/clinical", tags=["clinical"]
)
app.include_router(lab.router, prefix=f"{settings.API_V1_STR}/lab", tags=["lab"])
app.include_router(
    finance.router, prefix=f"{settings.API_V1_STR}/finance", tags=["finance"]
)
app.include_router(
    appointments.router,
    prefix=f"{settings.API_V1_STR}/appointments",
    tags=["appointments"],
)
app.include_router(
    documents.router, prefix=f"{settings.API_V1_STR}/documents", tags=["documents"]
)
app.include_router(
    documents.public_router, prefix=f"{settings.API_V1_STR}/documents", tags=["documents"]
)
app.include_router(
    dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"]
)
app.include_router(
    settings_endpoint.router,
    prefix=f"{settings.API_V1_STR}/settings",
    tags=["settings"],
)
app.include_router(
    reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["reports"]
)
app.include_router(
    system.router, prefix=f"{settings.API_V1_STR}/system", tags=["system"]
)
app.include_router(
    integrations.router,
    prefix=f"{settings.API_V1_STR}/integrations",
    tags=["integrations"],
)
app.include_router(audit.router, prefix=f"{settings.API_V1_STR}/audit", tags=["audit"])
app.include_router(
    personal_notes.router, prefix=f"{settings.API_V1_STR}/notes", tags=["personal-notes"]
)
app.include_router(stock.router, prefix=f"{settings.API_V1_STR}/stock", tags=["stock"])
app.include_router(
    ai_scribe.router, prefix=f"{settings.API_V1_STR}/ai-scribe", tags=["ai-scribe"]
)
app.include_router(
    patient_report.router,
    prefix=f"{settings.API_V1_STR}/patient-report",
    tags=["patient-report"],
)
app.include_router(
    lab_analysis.router,
    prefix=f"{settings.API_V1_STR}/lab-analysis",
    tags=["lab-analysis"],
)
app.include_router(
    definitions.router,
    prefix=f"{settings.API_V1_STR}/definitions",
    tags=["definitions"],
)
app.include_router(
    emergency.router,
    prefix=f"{settings.API_V1_STR}/emergency",
    tags=["emergency"],
)
app.include_router(
    consent_forms.router,
    prefix=f"{settings.API_V1_STR}",
    tags=["consent-forms"],
)
app.include_router(
    hpv_briefing.router,
    prefix=f"{settings.API_V1_STR}/ai/hpv-briefing",
    tags=["ai-hpv-briefing"],
)
# DEVRE DIŞI: system-update özelliği işlev dışına çıkarıldı (kullanıcı
# talebi). Router mount edilmiyor — tüm /system-update/* endpoint'leri
# (WS log token-in-URL dahil) artık 404 döner. Kodu geri açmak için bu
# bloğu tekrar aktifleştir.
# app.include_router(
#     system_update.router,
#     prefix=f"{settings.API_V1_STR}/system-update",
#     tags=["system-update"],
# )
app.include_router(
    insurance_provision.router,
    prefix=f"{settings.API_V1_STR}/insurance-provision",
    tags=["insurance-provision"],
)
app.include_router(
    setup.router,
    prefix=f"{settings.API_V1_STR}/setup",
    tags=["setup"],
)

@app.get("/health", response_model=HealthResponse)
async def health_check(db: AsyncSession = Depends(deps.get_db)):
    db_status = "unknown"
    redis_status = "unknown"
    status_overall = HealthStatus.OK

    # 1. Check Database
    try:
        await db.execute(text("SELECT 1"))
        db_status = "online"
    except Exception as e:
        status_overall = HealthStatus.ERROR
        db_status = f"offline: {str(e)}"

    # 2. Check Redis
    try:
        from fastapi import Request
        # Getting the request in endpoint if passed, or we just rely on the global app instance
        if hasattr(app.state, 'redis') and app.state.redis:
            await app.state.redis.ping()
            redis_status = "online"
        else:
            redis_status = "fallback_inmemory"
    except Exception as e:
        redis_status = f"offline: {str(e)}"

    health_response = HealthResponse(
        status=status_overall,
        mode=settings.ENVIRONMENT,
        system="EMR V3",
        version="3.3.0",
        services=ServicesStatus(database=db_status, redis=redis_status),
    )

    if status_overall != HealthStatus.OK:

        return Response(
            content=health_response.model_dump_json(),
            status_code=503,
            media_type="application/json",
        )

    return health_response

# Ensure static directory exists
os.makedirs("static/documents", exist_ok=True)
os.makedirs("static/photos", exist_ok=True)
os.makedirs("static/imaging", exist_ok=True)
os.makedirs("static/ai_scribe_templates", exist_ok=True)

# SECURITY: Public static serving is disabled.
# Files are now strictly served through authenticated API endpoints:
# - /api/v1/documents/download/{id}
# - /api/v1/clinical/photos/{id}/download
# app.mount("/static", StaticFiles(directory="static"), name="static")

# Trigger reload for endpoint update
