
import asyncio
import sys
import os
import csv

# Add the parent directory to sys.path to resolve app imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.system import IlacTanim
from sqlalchemy import text

CSV_PATH = "/data_import/ilac.csv"

async def main():
    print(f"Starting import from {CSV_PATH}...")
    
    if not os.path.exists(CSV_PATH):
        print(f"Error: File {CSV_PATH} not found.")
        return

    async with SessionLocal() as db:
        # Optional: Clear existing data
        print("Clearing existing drug definitions...")
        await db.execute(text("TRUNCATE TABLE ilac_tanimlari RESTART IDENTITY;"))
        await db.commit()
        
        count = 0
        batch = []
        batch_size = 500
        
        # Open with utf-8-sig to handle BOM correctly if present
        with open(CSV_PATH, 'r', encoding='utf-8-sig', errors='replace') as f:
            reader = csv.DictReader(f, delimiter=';')
            
            # Print field names to debug
            print(f"CSV Headers: {reader.fieldnames}")
            
            for row in reader:
                # Map fields
                # İlaç Adı;Barkod;ATC Kodu;ATC Adı;Firma Adı;Reçete Türü;Durumu
                
                name = row.get("İlaç Adı") or row.get("Adı") or ""
                if not name:
                    continue
                    
                ilac = IlacTanim(
                    name=name.strip(),
                    barcode=row.get("Barkod", "").strip(),
                    atc_kodu=row.get("ATC Kodu", "").strip(),
                    etkin_madde=row.get("ATC Adı", "").strip(), # Mapping ATC Name to Etkin Madde approx
                    firma=row.get("Firma Adı", "").strip(),
                    recete_tipi=row.get("Reçete Türü", "Normal").strip(),
                    aktif=(row.get("Durumu") == "Aktif")
                )
                
                batch.append(ilac)
                
                if len(batch) >= batch_size:
                    db.add_all(batch)
                    await db.commit()
                    count += len(batch)
                    print(f"Imported {count} items...")
                    batch = []
        
        # Insert remaining
        if batch:
            db.add_all(batch)
            await db.commit()
            count += len(batch)
            
        print(f"Total Imported: {count}")

if __name__ == "__main__":
    asyncio.run(main())
