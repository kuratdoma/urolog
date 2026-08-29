import asyncio
from sqlalchemy import text
from app.db.session import SessionLocal

async def wipe_data():
    print("Starting data wipe operation...")
    async with SessionLocal() as session:
        try:
            # Attempt TRUNCATE with CASCADE to clear hastalar and all dependent tables (muayeneler, tetkik_sonuclari, operasyonlar, etc.)
            print("Executing TRUNCATE TABLE hastalar RESTART IDENTITY CASCADE...")
            await session.execute(text("TRUNCATE TABLE hastalar RESTART IDENTITY CASCADE"))
            await session.commit()
            print("Successfully deleted all patient data.")
        except Exception as e:
            print(f"Error during TRUNCATE: {e}")
            print("Attempting naive DELETE...")
            try:
                # Fallback to individual deletes if TRUNCATE fails (e.g. permissions)
                await session.execute(text("DELETE FROM operasyonlar"))
                await session.execute(text("DELETE FROM tetkik_sonuclari"))
                await session.execute(text("DELETE FROM hasta_notlari"))
                await session.execute(text("DELETE FROM muayeneler"))
                await session.execute(text("DELETE FROM hastalar"))
                await session.commit()
                print("Successfully deleted data using DELETE statements.")
            except Exception as e2:
                print(f"Critical error wiping data: {e2}")

if __name__ == "__main__":
    asyncio.run(wipe_data())
