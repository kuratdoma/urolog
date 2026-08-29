import sys
import asyncio
import os
import re
from sqlalchemy import text
from app.db.session import SessionLocal

async def list_tables(db):
    print("--- TABLES IN DATABASE ---")
    query = text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
    result = await db.execute(query)
    for row in result.all():
        print(f"Table: {row[0]}")

def normalize(text_val):
    if not text_val:
        return ""
    # Remove literal \n, \r, and whitespace
    text_val = str(text_val).replace("\\n", " ").replace("\\r", " ").replace("\n", " ").replace("\r", " ")
    text_val = re.sub(r'\s+', ' ', text_val).strip()
    return text_val

async def check_muayene_duplicates(db):
    print("\n--- MUAYENELER DUP CHECK ---")
    query = text("""
        SELECT id, hasta_id, tarih, sikayet, oyku, sonuc, tedavi 
        FROM muayeneler 
        WHERE is_deleted = false
    """)
    result = await db.execute(query)
    rows = result.all()
    
    seen = {}
    duplicates = []
    
    for row in rows:
        # Key: hasta_id + tarih (day only?) + normalized content
        # Often dates are midnight in legacy imports
        date_str = row.tarih.strftime("%Y-%m-%d")
        content = normalize(row.sikayet) + normalize(row.oyku) + normalize(row.sonuc) + normalize(row.tedavi)
        key = (row.hasta_id, date_str, content)
        
        if key in seen:
            duplicates.append((seen[key], row.id))
        else:
            seen[key] = row.id
            
    print(f"Total rows: {len(rows)}")
    print(f"Duplicates found: {len(duplicates)}")
    for original, dup in duplicates[:10]:
        print(f"Original: {original} -> Duplicate: {dup}")
    if len(duplicates) > 10:
        print("...")

async def check_followup_duplicates(db):
    print("\n--- TAKIP (NOTLAR) DUP CHECK ---")
    query = text("""
        SELECT id, hasta_id, tarih, icerik, tip 
        FROM notlar 
        WHERE is_deleted = false
    """)
    result = await db.execute(query)
    rows = result.all()
    
    seen = {}
    duplicates = []
    
    for row in rows:
        date_str = row.tarih.strftime("%Y-%m-%d") if row.tarih else "NoDate"
        content = normalize(row.icerik)
        key = (row.hasta_id, date_str, content, row.tip)
        
        if key in seen:
            duplicates.append((seen[key], row.id))
        else:
            seen[key] = row.id
            
    print(f"Total rows: {len(rows)}")
    print(f"Duplicates found: {len(duplicates)}")
    for original, dup in duplicates[:10]:
        print(f"Original: {original} -> Duplicate: {dup}")
    if len(duplicates) > 10:
        print("...")

async def check_imaging_duplicates(db):
    print("\n--- IMAGING (TETKIKLER) DUP CHECK ---")
    query = text("""
        SELECT id, hasta_id, tarih, tetkik_adi, sonuc 
        FROM tetkikler 
        WHERE is_deleted = false
    """)
    result = await db.execute(query)
    rows = result.all()
    
    seen = {}
    duplicates = []
    
    for row in rows:
        date_str = row.tarih.strftime("%Y-%m-%d") if row.tarih else "NoDate"
        content = normalize(row.tetkik_adi) + normalize(row.sonuc)
        key = (row.hasta_id, date_str, content)
        
        if key in seen:
            duplicates.append((seen[key], row.id))
        else:
            seen[key] = row.id
            
    print(f"Total rows: {len(rows)}")
    print(f"Duplicates found: {len(duplicates)}")
    for original, dup in duplicates[:10]:
        print(f"Original: {original} -> Duplicate: {dup}")
    if len(duplicates) > 10:
        print("...")

async def main():
    async with SessionLocal() as db:
        await list_tables(db)
        await check_muayene_duplicates(db)
        await check_followup_duplicates(db)
        await check_imaging_duplicates(db)

if __name__ == "__main__":
    asyncio.run(main())
