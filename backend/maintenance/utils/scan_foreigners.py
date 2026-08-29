
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import text
from app.db.session import SessionLocal

async def scan():
    async with SessionLocal() as session:
        one_year_ago = (datetime.now() - timedelta(days=365)).date()
        
        # Son 1 yılda muayenesi olanları hariç tut
        query = text("""
            SELECT id, ad, soyad, tc_kimlik, dil FROM hastalar
            WHERE id NOT IN (SELECT DISTINCT hasta_id FROM muayeneler WHERE tarih >= :one_year_ago)
        """)
        result = await session.execute(query, {"one_year_ago": one_year_ago})
        patients = result.fetchall()
        
        found = []
        import re
        for p in patients:
            p_id, ad, soyad, tc, dil = p
            ad_str = str(ad or "")
            soyad_str = str(soyad or "")
            full_name = f"{ad_str} {soyad_str}".strip()
            
            # Kriter 1: Q, W, X harfleri (Türk alfabesinde yok)
            has_qwx = bool(re.search(r'[qwxQWX]', full_name))
            
            # Kriter 2: Latin/Türkçe dışı alfabe
            has_non_latin = bool(re.search(r'[^a-zA-ZçğıöşüÇĞİÖŞÜ\s\-\.\(\)\,\"\d]', full_name))
            
            # Kriter 3: Yabancı TC (99 ile başlar)
            is_foreign_tc = False
            if tc:
                tc_s = str(tc).strip()
                if tc_s.startswith('99'):
                    is_foreign_tc = True
            
            # Kriter 4: Kayıtlarda dili Türkçe olmayanlar
            is_non_turkish_lang = False
            if dil and dil.lower() != 'türkçe':
                is_non_turkish_lang = True
            
            if has_qwx or has_non_latin or is_foreign_tc or is_non_turkish_lang:
                reasons = []
                if has_qwx: reasons.append("Q/W/X harfi")
                if has_non_latin: reasons.append("Yabancı alfabe/karakter")
                if is_foreign_tc: reasons.append("Yabancı TC (99...)")
                if is_non_turkish_lang: reasons.append(f"Dil: {dil}")
                
                found.append(f"ID: {p_id} | Ad Soyad: {full_name} | Neden: {', '.join(reasons)}")

        if found:
            print(f"--- Son 1 Yıldır Muayene Olmamış ve Türkçe Olmayan Karakter/Özellik İçeren Hastalar ({len(found)} adet) ---")
            for item in found:
                print(item)
        else:
            print("Kriterlere uygun hasta bulunamadı.")

if __name__ == "__main__":
    asyncio.run(scan())
