import asyncio
from logging.config import fileConfig

from sqlalchemy import pool, text
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Proje modellerini import et
from app.models.base_class import Base
# Tüm modellerin import edildiğinden emin ol, yoksa Alembic onları göremez
from app.models import * 
from app.repositories.patient.models import Hasta
from app.repositories.clinical.models import (
    Muayene, Operasyon, KlinikNot, TetkikSonuc, FotografArsivi, HPVBriefingKaydi
)
from app.repositories.finance.models import FinansIslem, FinansKategori, FinansHizmet, Kasa, Firma
from app.core.config import settings

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# target_metadata
target_metadata = Base.metadata

# Veritabanı URL'ini config'den veya environment'tan al
# Alembic.ini içindeki sqlalchemy.url yerine bunu kullanacağız
# config.set_main_option("sqlalchemy.url", str(settings.DATABASE_URL))

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = str(settings.DATABASE_URL)
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True,
        version_table_schema='public'
    )

    with context.begin_transaction():
        context.run_migrations()


def include_object(object, name, type_, reflected, compare_to):
    if type_ == "table" and name == "alembic_version":
        return False
    return True

# Sistemdeki mevcut veya varsayılan shardları tanımla
TENANT_SCHEMAS = ["public"]

def do_run_migrations(connection: Connection) -> None:
    for schema_name in TENANT_SCHEMAS:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            include_schemas=False,  # Sadece public için False
            include_object=include_object,
            version_table_schema=schema_name
        )

        with context.begin_transaction():
            connection.execute(text(f"SET search_path TO {schema_name}"))
            context.run_migrations()


async def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = str(settings.DATABASE_URL)
    
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
