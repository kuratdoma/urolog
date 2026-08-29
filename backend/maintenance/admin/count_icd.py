import asyncio
import sys
import os

# Add the parent directory to sys.path to resolve app imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from sqlalchemy import func, select, text

async def count_icd():
    async with SessionLocal() as db:
        # Check if table exists
        result = await db.execute(text("SELECT count(*) FROM icd_tanilar"))
        count = result.scalar()
        print(f"Current icd_tanilar count: {count}")

if __name__ == "__main__":
    asyncio.run(count_icd())
