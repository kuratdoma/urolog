from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Robust DB URL handling for local/docker
db_url = settings.DATABASE_URL
if "db" in db_url and "localhost" not in db_url:
    import socket

    try:
        # Try to resolve 'db' hostname
        socket.gethostbyname("db")
    except socket.gaierror:
        # If 'db' fails, assume local development
        print(
            "Warning: 'db' hostname not found in session.py, falling back to 'localhost:5441'."
        )
        db_url = db_url.replace("@db:5432", "@localhost:5441")

engine = create_async_engine(
    db_url,
    future=True,
    echo=False,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_pre_ping=settings.DB_POOL_PRE_PING,
    connect_args={
        "server_settings": {"search_path": "public"},
        "statement_cache_size": settings.DB_STATEMENT_CACHE_SIZE,
    },
)

SessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)
