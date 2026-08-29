import pandas as pd
import asyncio
import os
import sys

# Add current dir to path to import app modules
sys.path.append(os.getcwd())

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.sql import text
from app.core.config import settings

async def import_icd():
    input_file = "icd_import.xlsx"
    if not os.path.exists(input_file):
        print(f"File {input_file} not found!")
        return

    print(f"Reading {input_file}...")
    try:
        df = pd.read_excel(input_file, header=None)
    except Exception as e:
        print(f"Error reading Excel: {e}")
        return

    # Check columns
    if len(df.columns) < 2:
        print("Excel must have at least 2 columns (Code, Name)")
        return

    # Assign columns (Assume Col 0 is Code, Col 1 is Name)
    df = df.iloc[:, :2]
    df.columns = ['kodu', 'adi']
    
    # Drop rows with NaN code or name
    df = df.dropna(subset=['kodu', 'adi'])
    
    # Clean data
    df['kodu'] = df['kodu'].astype(str).str.strip()
    df['adi'] = df['adi'].astype(str).str.strip()
    
    # Remove duplicates
    df = df.drop_duplicates(subset=['kodu'])

    print(f"Found {len(df)} valid records.")
    
    print(f"Connecting to DB at {settings.DATABASE_URL}...")
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    
    try:
        async with engine.begin() as conn:
            print("Truncating 'icd_tanilar' table...")
            await conn.execute(text("TRUNCATE TABLE icd_tanilar RESTART IDENTITY CASCADE"))
            
            print("Inserting data...")
            data = df.to_dict('records')
            chunk_size = 5000
            total_inserted = 0
            
            for i in range(0, len(data), chunk_size):
                chunk = data[i:i+chunk_size]
                # Prepare params
                params = [{"kodu": r['kodu'], "adi": r['adi']} for r in chunk]
                
                await conn.execute(
                    text("INSERT INTO icd_tanilar (kodu, adi, aktif) VALUES (:kodu, :adi, '1')"),
                    params
                )
                total_inserted += len(chunk)
                print(f"Inserted {total_inserted} / {len(data)}")
                
        print("Import completed successfully!")
        
    except Exception as e:
        print(f"Database error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(import_icd())
