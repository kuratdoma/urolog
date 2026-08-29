
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import text
from app.db.session import SessionLocal

async def scan():
    async with SessionLocal() as session:
        one_year_ago = (datetime.now() - timedelta(days=365)).date()
        
        # Son 1 yılda muayenesi olanlar
        recent_exam_query = text("SELECT DISTINCT hasta_id FROM muayeneler WHERE tarih >= :one_year_ago")
        result = await session.execute(recent_exam_query, {"one_year_ago": one_year_ago})
        recent_patient_ids = {row[0] for row in result.fetchall()}
        
        # Dili Türkçe olmayan veya ad/soyadında QWX gibi karakterler olan
        query = text("""
            SELECT id, ad, soyad, tc_kimlik, dil FROM hastalar
            WHERE id NOT IN (SELECT DISTINCT hasta_id FROM muayeneler WHERE tarih >= :one_year_ago)
        """)
        result = await session.execute(query, {"one_year_ago": one_year_ago})
        patients = result.fetchall()
        
        print(f"Toplam {len(patients)} hasta son 1 yıldır muayene olmamış.")
        print("-" * 50)
        
        found = []
        import re
        for p in patients:
            p_id, ad, soyad, tc, dil = p
            full_name = f"{ad} {soyad}"
            
            # Kriterler:
            # 1. Dil 'Türkçe' değilse
            # 2. İsimde Q, W, X varsa
            # 3. İsimde Türkçe/Latin dışı karakter varsa
            is_non_turkish = False
            reason = ""
            
            if dil and dil.lower() != 'türkçe':
                is_non_turkish = True
                reason = f"Dil: {dil}"
            elif re.search(r'[qwxQWX]', full_name):
                is_non_turkish = True
                reason = "Q, W, X içeriyor"
            elif re.search(r'[^a-zA-ZçğıöşüÇĞİÖŞÜ\s\-\.\(\)\,\"\d]', full_name):
                is_non_turkish = True
                reason = "Özel karakter/Yabancı alfabe"
            
            if is_non_turkish:
                found.append((p_id, full_name, reason))

        if found:
            for fid, fname, freason in found:
                print(f"ID: {fid} | {fname} | Sebep: {freason}")
        else:
            print("Kriterlere uyan hasta bulunamadı.")

if __name__ == "__main__":
    asyncio.run(scan())
