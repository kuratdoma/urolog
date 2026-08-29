"""
Eski kasa tiplerini kapatma bakım scripti.

Arayüzden kaldırılan kasa tipleriyle (OZEL_SIGORTA, ACIK_HESAP, DIGER) açılmış
kasaları pasife alır. Fiziksel silme YAPILMAZ: kasa hareketleri muhasebe kaydıdır
ve silinirse paranın izi kaybolur.

Güvenlik kuralları:
  - Varsayılan olarak yalnızca RAPOR üretir (dry-run). Uygulamak için --apply verin.
  - Bakiyesi sıfır olmayan kasa kapatılmaz; önce bakiyesi başka kasaya
    aktarılmalıdır. --force ile bu kural aşılabilir (önerilmez).

Kullanım:
    python -m maintenance.close_legacy_accounts            # rapor
    python -m maintenance.close_legacy_accounts --apply    # uygula
"""
import asyncio
import argparse
import os
import sys

sys.path.append(os.getcwd())

from sqlalchemy import select, func

# app.db.base tüm modelleri kayda alır; doğrudan repositories.finance.models
# import etmek dairesel import hatasına yol açar.
import app.db.base  # noqa: F401
from app.db.session import SessionLocal
from app.repositories.finance.models import Kasa, KasaHareket, FinansIslem, FinansOdeme

# Arayüzdeki KASA_TIPLERI ile aynı olmalı
# (frontend/app/(dashboard)/finance/settings/page.tsx)
GECERLI_TIPLER = {"NAKIT", "POS", "BANKA"}

BAKIYE_TOLERANSI = 0.01


async def topla_rapor(db):
    """Geçerli tip listesinde olmayan kasaları ve bağlı kayıt sayılarını döner."""
    kasalar = (await db.execute(select(Kasa).order_by(Kasa.ad))).scalars().all()
    eski = [k for k in kasalar if (k.tip or "").upper() not in GECERLI_TIPLER]

    rapor = []
    for k in eski:
        hareket = int(
            (
                await db.execute(
                    select(func.count())
                    .select_from(KasaHareket)
                    .where(KasaHareket.kasa_id == k.id)
                )
            ).scalar()
            or 0
        )
        islem = int(
            (
                await db.execute(
                    select(func.count())
                    .select_from(FinansIslem)
                    .where(FinansIslem.kasa_id == k.id)
                )
            ).scalar()
            or 0
        )
        odeme = int(
            (
                await db.execute(
                    select(func.count())
                    .select_from(FinansOdeme)
                    .where(FinansOdeme.kasa_id == k.id)
                )
            ).scalar()
            or 0
        )
        rapor.append(
            {
                "kasa": k,
                "bakiye": float(k.bakiye or 0),
                "hareket": hareket,
                "islem": islem,
                "odeme": odeme,
            }
        )
    return rapor


async def main(apply: bool, force: bool):
    async with SessionLocal() as db:
        rapor = await topla_rapor(db)

        if not rapor:
            print("✅ Eski tipte kasa bulunamadı — temizlenecek bir şey yok.")
            return

        print(f"\n{len(rapor)} adet eski tipte kasa bulundu:\n")
        print(
            f"{'Kasa':<28} {'Tip':<16} {'Bakiye':>14} {'Hrk':>5} {'İşl':>5} {'Öde':>5}  Durum"
        )
        print("-" * 92)

        kapatilacak, atlanacak = [], []
        for r in rapor:
            k = r["kasa"]
            if not k.aktif:
                durum = "zaten kapalı"
            elif abs(r["bakiye"]) >= BAKIYE_TOLERANSI and not force:
                durum = "ATLANACAK (bakiye var)"
                atlanacak.append(r)
            else:
                durum = "kapatılacak"
                kapatilacak.append(r)

            print(
                f"{(k.ad or '')[:27]:<28} {(k.tip or '')[:15]:<16} "
                f"{r['bakiye']:>14,.2f} {r['hareket']:>5} {r['islem']:>5} {r['odeme']:>5}  {durum}"
            )

        print("-" * 92)
        print(f"Kapatılacak: {len(kapatilacak)}   Atlanacak: {len(atlanacak)}")

        if atlanacak:
            print(
                "\n⚠️  Bakiyesi olan kasalar kapatılmadı. Kapatmadan önce bakiyeyi "
                "başka bir kasaya transfer edin (Finans › Kasalar › Transfer)."
            )

        toplam_hareket = sum(r["hareket"] for r in rapor)
        if toplam_hareket:
            print(
                f"\nℹ️  Bu kasalara ait {toplam_hareket} hareket kaydı KORUNACAK — "
                "kasa yalnızca pasife alınır, geçmiş silinmez."
            )

        if not apply:
            print("\n[DRY-RUN] Hiçbir değişiklik yapılmadı. Uygulamak için --apply ekleyin.")
            return

        if not kapatilacak:
            print("\nUygulanacak değişiklik yok.")
            return

        for r in kapatilacak:
            r["kasa"].aktif = False
        await db.commit()
        print(f"\n✅ {len(kapatilacak)} kasa kapatıldı (pasife alındı).")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Eski tipteki kasaları pasife alır (silmez)."
    )
    parser.add_argument(
        "--apply", action="store_true", help="Değişiklikleri uygula (varsayılan: rapor)"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Bakiyesi olan kasaları da kapat (önerilmez)",
    )
    args = parser.parse_args()
    asyncio.run(main(apply=args.apply, force=args.force))
