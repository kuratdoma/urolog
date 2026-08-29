import asyncio
import csv
import os
import shutil
import uuid
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.future import select

from app.db.session import SessionLocal, engine
from app.models.patient import Hasta
from app.models.clinical import FotografArsivi
from app.models.base_class import Base

# Path configurations
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = "/Users/alp/Documents/antigravity/UroLog_v2.2.3/UroLog/03.db_import/doc_metadata.csv"
DOC_EXPORT_DIR = "/Users/alp/Documents/antigravity/UroLog_v2.2.3/UroLog/03.db_import/DOC_export"
STATIC_DIR = os.path.join(BASE_DIR, "static", "documents")

# Ensure static directory exists
os.makedirs(STATIC_DIR, exist_ok=True)

ENCODING = "utf-8-sig" # Handle potential BOM from previous generation

def parse_date(date_str):
    if not date_str:
        return None
    for fmt in ["%m/%d/%Y", "%d.%m.%Y", "%Y-%m-%d"]:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None

async def import_photos():
    print(f"Starting photo import from {CSV_PATH}...")
    
    async with SessionLocal() as session:
        # Load existing photos to avoid duplicates (patient_id, date, original_filename)
        result = await session.execute(select(FotografArsivi.hasta_id, FotografArsivi.tarih, FotografArsivi.dosya_adi))
        existing_photos = set([(r[0], r[1], r[2]) for r in result.all()])
        print(f"Found {len(existing_photos)} existing photos in database.")

        count = 0
        skipped = 0
        errors = 0
        
        if not os.path.exists(CSV_PATH):
            print(f"Error: {CSV_PATH} not found.")
            return

        with open(CSV_PATH, mode='r', encoding=ENCODING) as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    # HastaRecID,RecID,Tarih,DokumanTip,FileName,Extracted
                    if row.get('Extracted') != 'True':
                        continue
                    
                    filename = row.get('FileName')
                    if not filename:
                        continue
                    
                    source_path = os.path.join(DOC_EXPORT_DIR, filename)
                    if not os.path.exists(source_path):
                        # print(f"Warning: File {filename} not found in {DOC_EXPORT_DIR}")
                        skipped += 1
                        continue
                    
                    hasta_rec_id = int(row.get('HastaRecID'))
                    tarih = parse_date(row.get('Tarih'))
                    tip = row.get('DokumanTip')
                    
                    # Check for duplicate
                    if (hasta_rec_id, tarih, filename) in existing_photos:
                        skipped += 1
                        continue
                    
                    # Generate unique filename for storage
                    file_ext = os.path.splitext(filename)[1]
                    unique_filename = f"{uuid.uuid4()}{file_ext}"
                    target_path = os.path.join(STATIC_DIR, unique_filename)
                    
                    # Copy file
                    shutil.copy2(source_path, target_path)
                    
                    # Create DB record
                    photo = FotografArsivi(
                        hasta_id=hasta_rec_id,
                        tarih=tarih,
                        asama="Diğer" if not tip else tip,
                        etiketler=tip,
                        dosya_yolu=f"/static/documents/{unique_filename}",
                        dosya_adi=filename,
                        notlar=f"Imported from legacy system. Original Type: {tip}"
                    )
                    session.add(photo)
                    count += 1
                    
                    if count % 50 == 0:
                        await session.commit()
                        print(f"Processed {count} photos...")

                except Exception as e:
                    print(f"Error processing row {row}: {e}")
                    errors += 1

        await session.commit()
        print(f"Import finished. {count} photos imported, {skipped} skipped, {errors} errors.")

        # Reset sequence
        await session.execute(text("SELECT setval('fotograf_arsivi_id_seq', COALESCE((SELECT MAX(id)+1 FROM fotograf_arsivi), 1), false)"))
        await session.commit()

if __name__ == "__main__":
    asyncio.run(import_photos())
