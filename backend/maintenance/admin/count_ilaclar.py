import asyncio
import sys
import os

# Add the parent directory to sys.path to resolve app imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.system import IlacTanim
from sqlalchemy import func, select

async def count_ilaclar():
    async with SessionLocal() as db:
        count = await db.scalar(select(func.count()).select_from(IlacTanim))
        print(f"Current ilac_tanimlari count: {count}")

if __name__ == "__main__":
    asyncio.run(count_ilaclar())
