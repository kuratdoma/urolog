
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import text
from app.db.session import SessionLocal

async def list_ed_patients():
    async with SessionLocal() as session:
        one_year_ago = (datetime.now() - timedelta(days=365)).date()
        
        # ED ile ilgili olabilecek anahtar kelimeler
        # tani1, tani2, tani1_kodu, tani2_kodu ve bulgu_notu alanlarını tarıyoruz
        keywords = [
            '%erektil%', 
            '%disfonksiyon%', 
            '%sertleşme%', 
            '%empotans%', 
            '%impotans%',
            '% iief %',
            '% ed %'
        ]
        
        query = text("""
            SELECT DISTINCT h.id, h.ad, h.soyad, m.tarih, m.tani1, m.tani2
            FROM muayeneler m
            JOIN hastalar h ON m.hasta_id = h.id
            WHERE m.tarih >= :one_year_ago
            AND (
                LOWER(m.tani1) LIKE ANY(:keywords) OR
                LOWER(m.tani2) LIKE ANY(:keywords) OR
                LOWER(m.bulgu_notu) LIKE ANY(:keywords) OR
                LOWER(m.sikayet) LIKE ANY(:keywords)
            )
            ORDER BY m.tarih DESC
        """)
        
        result = await session.execute(query, {
            "one_year_ago": one_year_ago,
            "keywords": keywords
        })
        
        rows = result.fetchall()
        
        if rows:
            print(f"--- Son 1 Yılda Erektil Disfonksiyon Tanısı/Şikayeti Olan Hastalar ({len(rows)} muayene kaydı) ---")
            print(f"{'Tarih':<12} | {'Ad Soyad':<25} | {'Tanı 1':<20} | {'Tanı 2'}")
            print("-" * 85)
            for row in rows:
                p_id, ad, soyad, tarih, tani1, tani2 = row
                name = f"{ad} {soyad}"
                print(f"{str(tarih):<12} | {name[:25]:<25} | {str(tani1 or ''):<20} | {str(tani2 or '')}")
        else:
            print("Son 1 yılda ED tanılı hasta bulunamadı.")

if __name__ == "__main__":
    asyncio.run(list_ed_patients())
