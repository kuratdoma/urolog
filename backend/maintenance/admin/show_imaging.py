import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from sqlalchemy import text

async def main():
    async with SessionLocal() as db:
        print("Connecting to database...")
        try:
            # Check for records in 'goruntuleme_sonuclari'
            result = await db.execute(text("SELECT id, hasta_id, tarih, tetkik_adi, sembol, sonuc FROM goruntuleme_sonuclari LIMIT 50"))
            rows = result.fetchall()
            
            print(f"\nTotal Records Found: {len(rows)}\n")
            
            if len(rows) == 0:
                print("No records found in 'goruntuleme_sonuclari'.")
            else:
                # Print Header
                header = f"{'ID':<5} {'Hasta ID':<10} {'Tarih':<12} {'Tetkik':<20} {'Sembol':<10} {'Sonuç'}"
                print(header)
                print("-" * len(header))
                
                for row in rows:
                    rid, hid, tarih, tetkik, sembol, sonuc = row
                    # Truncate content for display
                    sonuc_display = (sonuc[:50] + '...') if sonuc and len(sonuc) > 50 else (sonuc or "")
                    tarih_str = str(tarih) if tarih else "N/A"
                    print(f"{rid:<5} {hid:<10} {tarih_str:<12} {str(tetkik):<20} {str(sembol):<10} {sonuc_display}")

        except Exception as e:
            print(f"Error querying database: {e}")

if __name__ == "__main__":
    asyncio.run(main())
