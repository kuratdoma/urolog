import asyncio
import csv
import os
import sys
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.future import select

from app.db.session import SessionLocal
from app.models.patient import Hasta
from app.models.clinical import HastaNotu

CSV_PATH = "/Users/alp/Documents/antigravity/UroLog_v2.2.3/UroLog/03.db_import/csv_exports/HNOTLAR_CLEANED.CSV"
HASTA_CSV_PATH = "/Users/alp/Documents/antigravity/UroLog_v2.2.3/UroLog/03.db_import/csv_exports/HASTA.CSV"

def parse_date(date_str):
    if not date_str:
        return None
    for fmt in ["%m/%d/%Y", "%d.%m.%Y", "%Y-%m-%d"]:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None

def clean_text(text):
    if not text:
        return ""
    # Remove null bytes and strip whitespace
    return text.replace('\x00', '').strip()

async def update_followup_types():
    print(f"Starting update process...")
    
    async with SessionLocal() as session:
        # 1. Build legacy ID map (copied logic from db_import.py)
        print("Building Patient ID mapping...")
        legacy_id_map = {}
        try:
            # Get existing patients from DB
            result = await session.execute(select(Hasta.id, Hasta.tc_kimlik))
            rows = result.all()
            # Map TCKN to existing Real ID
            tckn_map = {r[1]: r[0] for r in rows if r[1]}
            
            with open(HASTA_CSV_PATH, mode='r', encoding='utf-8-sig', errors='replace') as f:
                # Skip first lines until header
                while True:
                    cur_pos = f.tell()
                    line = f.readline()
                    if not line: break
                    if '"#","HastaRecID"' in line or '#,HastaRecID' in line:
                        f.seek(cur_pos)
                        break

                reader = csv.DictReader(f)
                for row in reader:
                    rec_id_str = row.get("HastaRecID")
                    if not rec_id_str: continue
                    rec_id = int(rec_id_str)
                    
                    tc = clean_text(row.get("TCKimlik"))
                    if tc and (len(tc) != 11 or not tc.isdigit()):
                        tc = None
                    
                    if tc and tc in tckn_map:
                        legacy_id_map[rec_id] = tckn_map[tc]
                    else:
                        legacy_id_map[rec_id] = rec_id
            print(f"Mapped {len(legacy_id_map)} legacy patient IDs.")
        except Exception as e:
            print(f"Error building ID map: {e}")
            return

        # 2. Update types from HNOTLAR_CLEANED.CSV
        print(f"Reading {CSV_PATH}...")
        updated_count = 0
        not_found_count = 0
        already_correct_count = 0
        total_rows = 0
        
        with open(CSV_PATH, mode='r', encoding='utf-8-sig', errors='replace') as f:
            reader = csv.DictReader(f)
            for row in reader:
                total_rows += 1
                try:
                    legacy_hid = row.get('HastaRecID')
                    if not legacy_hid: continue
                    
                    hid = legacy_id_map.get(int(legacy_hid))
                    if not hid: 
                        not_found_count += 1
                        continue
                        
                    tarih = parse_date(row.get('Tarih'))
                    icerik = clean_text(row.get('Notlar'))
                    new_tip = clean_text(row.get('Tip'))
                    
                    if not new_tip:
                        continue

                    # Search for matching note in DB
                    q = select(HastaNotu).where(
                        HastaNotu.hasta_id == hid,
                        HastaNotu.tarih == tarih
                    )
                    res = await session.execute(q)
                    notes = res.scalars().all()
                    
                    found = False
                    for note in notes:
                        # Use clean match on icerik
                        if clean_text(note.icerik) == icerik:
                            if note.tip != new_tip:
                                note.tip = new_tip
                                session.add(note)
                                updated_count += 1
                            else:
                                already_correct_count += 1
                            found = True
                            break
                    
                    if not found:
                        not_found_count += 1
                        
                    if updated_count > 0 and updated_count % 100 == 0 and found:
                        # Commit only when incrementing
                        if session.deleted or session.new or session.dirty:
                             await session.commit()
                             print(f"Currently updated: {updated_count} notes...")
                        
                except Exception as e:
                    print(f"Error at row {total_rows}: {e}")

        await session.commit()
        print(f"\nFinal Report:")
        print(f"Total CSV Rows: {total_rows}")
        print(f"Successfully Updated: {updated_count}")
        print(f"Already Correct in DB: {already_correct_count}")
        print(f"Not Matched in DB: {not_found_count}")

if __name__ == "__main__":
    asyncio.run(update_followup_types())
