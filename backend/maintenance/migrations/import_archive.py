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
from app.models.documents import HastaDosya
from app.models.base_class import Base

# Path configurations
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = "/Users/alp/Documents/antigravity/UroLog_v2.2.3/UroLog/03.db_import/archive_metadata.csv"
ARSIV_EXPORT_DIR = "/Users/alp/Documents/antigravity/UroLog_v2.2.3/UroLog/03.db_import/ARSIV_export"
STATIC_DIR = os.path.join(BASE_DIR, "static", "documents")

# Ensure static directory exists
os.makedirs(STATIC_DIR, exist_ok=True)

ENCODING = "utf-8-sig"

def parse_date(date_str):
    if not date_str:
        return None
    for fmt in ["%m/%d/%Y", "%d.%m.%Y", "%Y-%m-%d"]:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None

async def import_archive():
    print(f"Starting archive import from {CSV_PATH}...")
    
    async with SessionLocal() as session:
        # Load existing patients to avoid foreign key errors
        res = await session.execute(select(Hasta.id))
        existing_patient_ids = {r[0] for r in res.all()}
        print(f"Found {len(existing_patient_ids)} patients in database.")

        # Load existing documents to avoid duplicates
        result = await session.execute(select(HastaDosya.hasta_id, HastaDosya.dosya_adi))
        existing_docs = set([(r[0], r[1]) for r in result.all()])
        print(f"Found {len(existing_docs)} existing documents in database.")

        count = 0
        skipped = 0
        errors = 0
        p_missing = 0
        
        if not os.path.exists(CSV_PATH):
            print(f"Error: {CSV_PATH} not found.")
            return

        with open(CSV_PATH, mode='r', encoding=ENCODING) as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    # HastaRecID,RecID,Tarih,DokumanTip,ArsivNo,Notlar,DosyaTip,FileName,Extracted
                    if row.get('Extracted') != 'True':
                        continue
                    
                    filename = row.get('FileName')
                    if not filename:
                        continue
                    
                    source_path = os.path.join(ARSIV_EXPORT_DIR, filename)
                    if not os.path.exists(source_path):
                        # print(f"Warning: File {filename} not found in {ARSIV_EXPORT_DIR}")
                        skipped += 1
                        continue
                    
                    try:
                        hasta_rec_id = int(row.get('HastaRecID'))
                    except (ValueError, TypeError):
                        skipped += 1
                        continue

                    if hasta_rec_id not in existing_patient_ids:
                        p_missing += 1
                        continue

                    # Check for duplicate
                    if (hasta_rec_id, filename) in existing_docs:
                        skipped += 1
                        continue
                    
                    tarih = parse_date(row.get('Tarih'))
                    dokuman_tip = row.get('DokumanTip')
                    arsiv_no = row.get('ArsivNo')
                    notlar = row.get('Notlar')
                    
                    # Generate unique filename for storage
                    file_ext = os.path.splitext(filename)[1]
                    unique_filename = f"{uuid.uuid4()}{file_ext}"
                    target_path = os.path.join(STATIC_DIR, unique_filename)
                    
                    # Copy file
                    shutil.copy2(source_path, target_path)
                    
                    # Create DB record
                    doc = HastaDosya(
                        hasta_id=hasta_rec_id,
                        tarih=tarih,
                        kategori=dokuman_tip,
                        dosya_tipi=file_ext.replace('.', '').upper(),
                        dosya_adi=filename,
                        dosya_yolu=f"/static/documents/{unique_filename}",
                        aciklama=notlar,
                        arsiv_no=arsiv_no,
                        kaynak="ARSIV"
                    )
                    session.add(doc)
                    count += 1
                    
                    if count % 50 == 0:
                        await session.commit()
                        print(f"Processed {count} documents...")

                except Exception as e:
                    print(f"Error processing row {row}: {e}")
                    errors += 1

        await session.commit()
        print(f"Import finished. {count} documents imported.")
        print(f"{skipped} skipped (not found or duplicate).")
        print(f"{p_missing} patient missing (FK constraint).")
        print(f"{errors} errors.")

        # Reset sequence
        await session.execute(text("SELECT setval('hasta_dosyalari_id_seq', COALESCE((SELECT MAX(id)+1 FROM hasta_dosyalari), 1), false)"))
        await session.commit()

if __name__ == "__main__":
    asyncio.run(import_archive())
