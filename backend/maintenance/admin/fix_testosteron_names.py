import asyncio
import os
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DB_USER = os.getenv("DB_USER", "emr_admin")
    DB_PASS = os.getenv("DB_PASSWORD", "")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "urolog_db")
    DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

async def run_update():
    print(f"Connecting to database...")
    engine = create_async_engine(DATABASE_URL)
    
    # We will search for variations and map them to the standard names
    mappings = {
        "Testosteron (Total)": [
            "TOTAL TESTOSTERON",
            "Total Testosteron",
            "TESTOSTERON ( TOTAL)",
            "TESTOSTERON (TOTAL)",
            "TESTOSTERON ( TOTAL )"
        ],
        "Testosteron (Serbest)": [
            "SERBEST TESTOSTERON",
            "Serbest Testosteron",
            "TESTOSTERON ( SERBEST )",
            "TESTOSTERON (SERBEST)",
            "TESTOSTERON SERBEST"
        ]
    }
    
    tables = ["genel_lab_sonuclari", "tetkik_sonuclari"]
    
    async with engine.begin() as conn:
        for table in tables:
            # Check if table exists
            check_table = await conn.execute(text(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = :table)"
            ), {"table": table})
            
            if not check_table.scalar():
                continue

            print(f"Processing table: {table}")
            
            for standard_name, variations in mappings.items():
                for variation in variations:
                    result = await conn.execute(text(
                        f"UPDATE {table} SET tetkik_adi = :new WHERE tetkik_adi = :old"
                    ), {"new": standard_name, "old": variation})
                    
                    if result.rowcount > 0:
                        print(f"  Updated '{variation}' -> '{standard_name}' ({result.rowcount} rows)")

            # Catch-all ILIKE check for anything exactly matching the words but maybe different casing
            # This is safer to run after the specific ones.
            # Only update if it's EXACTLY the words to avoid catching "FREE TESTOSTERON" into "Testosteron (Total)"
            
            # For Total
            res_total = await conn.execute(text(
                f"UPDATE {table} SET tetkik_adi = 'Testosteron (Total)' "
                f"WHERE tetkik_adi ILIKE 'total testosteron' AND tetkik_adi != 'Testosteron (Total)'"
            ))
            if res_total.rowcount > 0:
                print(f"  Updated fuzzy 'total testosteron' -> 'Testosteron (Total)' ({res_total.rowcount} rows)")
                
            # For Serbest
            res_serbest = await conn.execute(text(
                f"UPDATE {table} SET tetkik_adi = 'Testosteron (Serbest)' "
                f"WHERE tetkik_adi ILIKE 'serbest testosteron' AND tetkik_adi != 'Testosteron (Serbest)'"
            ))
            if res_serbest.rowcount > 0:
                print(f"  Updated fuzzy 'serbest testosteron' -> 'Testosteron (Serbest)' ({res_serbest.rowcount} rows)")

    await engine.dispose()
    print("Database name update completed.")

if __name__ == "__main__":
    asyncio.run(run_update())
