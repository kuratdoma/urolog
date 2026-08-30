import json
import asyncio
import os
import sys

# Add current dir to path to import app modules
sys.path.append(os.getcwd())

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.sql import text
from app.core.config import settings

async def seed_icds():
    json_path = os.path.join("app", "assets", "icd_codes.json")
    if not os.path.exists(json_path):
        print(f"File {json_path} not found!")
        return 1

    print(f"Reading {json_path}...")
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading JSON: {e}")
        return 1

    print(f"Found {len(data)} records in JSON.")
    
    # DATABASE_URL parolayı içeriyor — deploy loglarına yazma.
    print("Connecting to DB...")
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    
    try:
        async with engine.begin() as conn:
            # TRUNCATE kaldırıldı: icd_tanilar artık çalışma zamanının tek
            # gerçek kaynağı ve admin uçlarından (POST/DELETE /system/icd)
            # düzenlenebiliyor. Seed'i tekrar çalıştırmak bu düzenlemeleri
            # silmemeli — yalnızca eksik kodları ekliyoruz (idempotent).
            print("Upserting into 'icd_tanilar' (mevcut kayıtlar korunur)...")
            chunk_size = 1000
            total_inserted = 0
            
            for i in range(0, len(data), chunk_size):
                chunk = data[i:i+chunk_size]
                # Prepare params - map JSON keys to DB columns
                # JSON: {"adi": "...", "kodu": "..."}
                params = [{
                    "kodu": str(r.get('kodu', '')).strip(), 
                    "adi": str(r.get('adi', '')).strip(),
                    "aktif": "1",
                    "seviye": "2",
                    "is_deleted": False
                } for r in chunk if r.get('kodu')]
                
                if not params:
                    continue

                await conn.execute(
                    text(
                        "INSERT INTO icd_tanilar (kodu, adi, aktif, seviye, is_deleted) "
                        "VALUES (:kodu, :adi, :aktif, :seviye, :is_deleted) "
                        "ON CONFLICT (kodu) DO NOTHING"
                    ),
                    params
                )
                total_inserted += len(params)
                print(f"Processed {total_inserted} / {len(data)}")
                
        print("Seed completed successfully!")
        return 0

    except Exception as e:
        # Sessizce başarılı sayma: deploy adımı hatayı görebilmeli.
        print(f"Database error: {e}")
        return 1
    finally:
        await engine.dispose()

if __name__ == "__main__":
    sys.exit(asyncio.run(seed_icds()))
