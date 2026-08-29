import asyncio
import csv
import os
import io
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.future import select

from app.db.session import SessionLocal
from app.models.patient import Hasta
from app.models.clinical import TelefonGorusmesi

# Path configurations
CSV_PATH = "/Users/alp/Documents/antigravity/UroLog_v2.2.3/UroLog/03.db_import/csv_exports/TELEFON.CSV"

def parse_date(date_str):
    if not date_str:
        return None
    # Handle both M/D/Y and D.M.Y
    for fmt in ["%m/%d/%Y", "%d.%m.%Y", "%Y-%m-%d"]:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None

async def import_phone_calls():
    print(f"Starting phone calls import from {CSV_PATH}...")
    
    async with SessionLocal() as session:
        # Load existing patients
        res = await session.execute(select(Hasta.id))
        existing_patient_ids = {r[0] for r in res.all()}
        print(f"Found {len(existing_patient_ids)} patients in database.")
        
        # Clear existing phone calls to avoid duplicates if re-running
        await session.execute(text("DELETE FROM telefon_gorusmeleri"))
        await session.commit()
        print("Cleared existing phone calls.")

        count = 0
        skipped = 0
        errors = 0
        
        if not os.path.exists(CSV_PATH):
            print(f"Error: {CSV_PATH} not found.")
            return

        with open(CSV_PATH, mode='r', encoding='cp1254', errors='replace') as f:
            lines = f.readlines()
            print(f"Total lines in file: {len(lines)}")
            
            header_idx = -1
            for i, line in enumerate(lines):
                if '"#","HastaRecID"' in line:
                    header_idx = i
                    break
            
            if header_idx == -1:
                print("Header not found.")
                return
            
            header = lines[header_idx]
            data = "".join(lines[header_idx+1:])
            
            reader = csv.DictReader(io.StringIO(header + data), quotechar='"', delimiter=',')
            
            for row in reader:
                try:
                    # "#","HastaRecID","RecID","Tarih","Notlar","Doktor"
                    hasta_rec_id = row.get('HastaRecID')
                    if not hasta_rec_id:
                        continue
                    
                    hasta_id = int(hasta_rec_id)
                    if hasta_id not in existing_patient_ids:
                        skipped += 1
                        continue
                    
                    tarih = parse_date(row.get('Tarih'))
                    notlar = row.get('Notlar')
                    doktor = row.get('Doktor')
                    
                    # Dedup check (optional but safe)
                    # For now just insert. If we want to upsert, we'd need a unique key.
                    # Since these are calls, multiple calls on same day are possible.
                    
                    call = TelefonGorusmesi(
                        hasta_id=hasta_id,
                        tarih=tarih,
                        notlar=notlar,
                        doktor=doktor
                    )
                    session.add(call)
                    count += 1
                    
                    if count % 100 == 0:
                        await session.commit()
                        print(f"Processed {count} calls...")

                except Exception as e:
                    print(f"Error processing row: {e}")
                    errors += 1

        await session.commit()
        print(f"Import finished. {count} phone calls imported, {skipped} skipped, {errors} errors.")

        # Reset sequence
        await session.execute(text("SELECT setval('telefon_gorusmeleri_id_seq', COALESCE((SELECT MAX(id)+1 FROM telefon_gorusmeleri), 1), false)"))
        await session.commit()

if __name__ == "__main__":
    asyncio.run(import_phone_calls())
