import asyncio
from app.db.session import engine
from app.models.base_class import Base
# Make sure all models are imported so they are registered with Base
from app.models import *

async def init_models():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

if __name__ == "__main__":
    asyncio.run(init_models())
    print("Tables created.")
