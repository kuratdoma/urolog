"""
Düzenli gider şablonları ve bunlardan gider işlemi üretimi.

Üretim manuel tetiklenir: operatör önce bekleyen dönemleri görür (önizleme),
sonra onaylayarak oluşturur. Aynı dönem iki kez üretilmez.
"""
import calendar
from typing import List, Optional
from datetime import date

from dateutil.relativedelta import relativedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.finance.models import DuzenliGider, FinansIslem
from app.core.user_context import UserContext

# Tek seferde üretilecek azami dönem sayısı. Uzun süre çalıştırılmamış bir
# şablon yüzlerce kayıt üretmesin; operatör tekrar çalıştırarak devam eder.
MAX_DONEM_PER_SABLON = 24


def _donem_tarihi(yil: int, ay: int, ayin_gunu: int) -> date:
    """
    Ayın istenen gününü döner; ay o günü içermiyorsa ayın son gününe kırpar.

    31'inde tekrarlayan bir gider şubatta 28/29'una düşer.
    """
    son_gun = calendar.monthrange(yil, ay)[1]
    return date(yil, ay, min(ayin_gunu, son_gun))


def hesapla_bekleyen_donemler(
    sablon: DuzenliGider, bugun: Optional[date] = None
) -> List[date]:
    """
    Şablon için bugüne kadar üretilmemiş dönem tarihlerini döner.

    son_uretilen_donem doluysa ondan sonraki dönemden, boşsa başlangıç
    tarihinin döneminden başlar. Bitiş tarihi ve bugün ile sınırlanır.
    """
    bugun = bugun or date.today()
    if not sablon.aktif:
        return []

    adim = (
        relativedelta(months=1)
        if sablon.periyot == "aylik"
        else relativedelta(years=1)
    )

    if sablon.son_uretilen_donem:
        imlec = sablon.son_uretilen_donem + adim
    else:
        imlec = _donem_tarihi(
            sablon.baslangic_tarihi.year,
            sablon.baslangic_tarihi.month,
            sablon.ayin_gunu,
        )
        # Hizalama başlangıç tarihinden geriye kaydırdıysa bir sonraki döneme geç
        if imlec < sablon.baslangic_tarihi:
            imlec = imlec + adim

    donemler: List[date] = []
    while imlec <= bugun and len(donemler) < MAX_DONEM_PER_SABLON:
        if sablon.bitis_tarihi and imlec > sablon.bitis_tarihi:
            break
        # Ay uzunluğu farkları imleci kaydırmasın: her dönemi yeniden hizala
        hizali = _donem_tarihi(imlec.year, imlec.month, sablon.ayin_gunu)
        donemler.append(hizali)
        imlec = hizali + adim

    return donemler


class RecurringRepository:
    def __init__(self, session: AsyncSession, context: Optional[UserContext] = None):
        self.session = session
        self.context = context

    # =========================================================================
    # CRUD
    # =========================================================================
    async def list_templates(self, aktif_only: bool = False) -> List[DuzenliGider]:
        stmt = select(DuzenliGider)
        if aktif_only:
            stmt = stmt.where(DuzenliGider.aktif == True)
        stmt = stmt.order_by(DuzenliGider.aktif.desc(), DuzenliGider.ad)
        return (await self.session.execute(stmt)).scalars().all()

    async def get_template(self, sablon_id: int) -> Optional[DuzenliGider]:
        return (
            await self.session.execute(
                select(DuzenliGider).where(DuzenliGider.id == sablon_id)
            )
        ).scalar_one_or_none()

    async def create_template(self, obj_in) -> DuzenliGider:
        db_obj = DuzenliGider(**obj_in.model_dump())
        self.session.add(db_obj)
        await self.session.flush()
        return db_obj

    async def update_template(self, sablon_id: int, obj_in) -> Optional[DuzenliGider]:
        db_obj = await self.get_template(sablon_id)
        if not db_obj:
            return None
        for key, value in obj_in.model_dump(exclude_unset=True).items():
            setattr(db_obj, key, value)
        await self.session.flush()
        return db_obj

    async def delete_template(self, sablon_id: int) -> bool:
        """
        Şablonu pasife alır.

        Fiziksel silinmez: bu şablondan üretilmiş gider kayıtlarının kaynağı
        izlenebilir kalmalı.
        """
        db_obj = await self.get_template(sablon_id)
        if not db_obj:
            return False
        db_obj.aktif = False
        await self.session.flush()
        return True

    # =========================================================================
    # ÜRETİM
    # =========================================================================
    async def get_pending(self, bugun: Optional[date] = None) -> List[dict]:
        """Üretilmeyi bekleyen dönemleri şablon bazında listeler (önizleme)."""
        sablonlar = await self.list_templates(aktif_only=True)
        sonuc = []
        for s in sablonlar:
            donemler = hesapla_bekleyen_donemler(s, bugun)
            if not donemler:
                continue
            sonuc.append(
                {
                    "sablon_id": s.id,
                    "ad": s.ad,
                    "tutar": float(s.tutar or 0),
                    "donemler": donemler,
                    "adet": len(donemler),
                    "toplam_tutar": round(float(s.tutar or 0) * len(donemler), 2),
                }
            )
        return sonuc

    async def generate(self, bugun: Optional[date] = None) -> dict:
        """
        Bekleyen dönemler için gider işlemleri oluşturur.

        Oluşan işlemler 'bekliyor' durumundadır ve ödeme kaydı içermez —
        kasa bakiyesi ancak ödeme girildiğinde değişir.
        """
        from app.repositories.finance.expense_repository import ExpenseRepository

        expense_repo = ExpenseRepository(self.session, self.context)
        sablonlar = await self.list_templates(aktif_only=True)

        uretilen = []
        for s in sablonlar:
            donemler = hesapla_bekleyen_donemler(s, bugun)
            for donem in donemler:
                ref = await expense_repo.generate_referans_kodu()
                tx = FinansIslem(
                    referans_kodu=ref,
                    tarih=donem,
                    vade_tarihi=donem,
                    islem_tipi="gider",
                    durum="bekliyor",
                    tutar=s.tutar,
                    net_tutar=s.tutar,
                    aciklama=s.aciklama or s.ad,
                    kategori_id=s.kategori_id,
                    firma_id=s.firma_id,
                    kasa_id=s.kasa_id,
                )
                if self.context:
                    tx.created_by = self.context.user_id
                self.session.add(tx)
                await self.session.flush()

                uretilen.append(
                    {
                        "sablon_id": s.id,
                        "sablon_adi": s.ad,
                        "islem_id": tx.id,
                        "referans_kodu": ref,
                        "tarih": donem,
                        "tutar": float(s.tutar or 0),
                    }
                )
                s.son_uretilen_donem = donem

        await self.session.flush()
        return {
            "adet": len(uretilen),
            "toplam_tutar": round(sum(u["tutar"] for u in uretilen), 2),
            "islemler": uretilen,
        }
