from typing import List, Optional
from datetime import datetime
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.finance.models import (
    Firma,
    FinansIslem,
    FinansIslemSatir,
    FinansOdeme,
)
from app.schemas.finance import FirmaCreate, FirmaUpdate, FinansIslemCreate
from app.core.user_context import UserContext


class ExpenseRepository:
    def __init__(self, session: AsyncSession, context: Optional[UserContext] = None):
        self.session = session
        self.context = context

    async def generate_referans_kodu(self) -> str:
        yil = datetime.now().year
        result = await self.session.execute(
            select(func.max(FinansIslem.id)).where(
                and_(
                    FinansIslem.islem_tipi == "gider",
                    func.extract("year", FinansIslem.created_at) == yil,
                )
            )
        )
        last_id = result.scalar() or 0
        return f"GID-{yil}-{(last_id + 1):05d}"

    # =========================================================================
    # FİRMALAR
    # =========================================================================
    async def get_firms(self) -> List[Firma]:
        result = await self.session.execute(select(Firma).order_by(Firma.ad))
        return result.scalars().all()

    async def get_firm(self, firma_id: int) -> Optional[Firma]:
        result = await self.session.execute(select(Firma).where(Firma.id == firma_id))
        return result.scalar_one_or_none()

    async def create_firm(self, obj_in: FirmaCreate) -> Firma:
        db_obj = Firma(**obj_in.model_dump())
        self.session.add(db_obj)
        await self.session.flush()
        return db_obj

    async def update_firm(self, firma_id: int, obj_in: FirmaUpdate) -> Optional[Firma]:
        db_obj = await self.get_firm(firma_id)
        if not db_obj:
            return None
        for key, value in obj_in.model_dump(exclude_unset=True).items():
            setattr(db_obj, key, value)
        await self.session.flush()
        return db_obj

    # =========================================================================
    # BORÇ TAKİBİ
    # =========================================================================
    async def get_firm_debt(self, firma_id: int) -> float:
        result = await self.session.execute(
            select(func.sum(FinansIslem.net_tutar)).where(
                and_(
                    FinansIslem.firma_id == firma_id,
                    FinansIslem.islem_tipi == "gider",
                    FinansIslem.durum == "bekliyor",
                    FinansIslem.is_deleted == False,
                )
            )
        )
        return float(result.scalar() or 0)

    async def get_firm_debt_list(self) -> List[dict]:
        """Açık gider borcu olan firmaları, en yakın vade bilgisiyle birlikte döner."""
        stmt = (
            select(
                Firma.id,
                Firma.ad,
                func.sum(FinansIslem.net_tutar).label("toplam_borc"),
                func.min(FinansIslem.vade_tarihi).label("en_yakin_vade"),
            )
            .join(FinansIslem, FinansIslem.firma_id == Firma.id)
            .where(
                and_(
                    FinansIslem.islem_tipi == "gider",
                    FinansIslem.durum == "bekliyor",
                    FinansIslem.is_deleted == False,
                )
            )
            .group_by(Firma.id, Firma.ad)
            .order_by(func.sum(FinansIslem.net_tutar).desc())
        )
        result = await self.session.execute(stmt)
        return [
            {
                "id": r.id,
                "ad": r.ad,
                "toplam_borc": float(r.toplam_borc or 0),
                "en_yakin_vade": r.en_yakin_vade,
            }
            for r in result.all()
        ]

    async def create_expense_transaction(
        self, obj_in: FinansIslemCreate
    ) -> FinansIslem:
        from app.repositories.finance.models import Kasa, KasaHareket
        from sqlalchemy import select

        ref = await self.generate_referans_kodu()
        data = obj_in.model_dump(exclude={"satirlar", "odemeler"})
        data["referans_kodu"] = ref
        data["islem_tipi"] = "gider"

        # Remove fields that do not exist on the FinansIslem SQLAlchemy model
        data.pop("notlar", None)

        db_tx = FinansIslem(**data)
        if self.context:
            db_tx.created_by = self.context.user_id
        self.session.add(db_tx)
        await self.session.flush()

        for s in obj_in.satirlar:
            s_data = s.model_dump()
            valid_satir = {
                "hizmet_id": s_data.get("hizmet_id"),
                "aciklama": s_data.get("hizmet_adi", ""),
                "miktar": s_data.get("adet", 1),
                "birim_fiyat": s_data.get("birim_fiyat", 0),
                "toplam_tutar": s_data.get("toplam", 0),
            }
            self.session.add(FinansIslemSatir(islem_id=db_tx.id, **valid_satir))

        for o in obj_in.odemeler:
            o_data = o.model_dump()
            valid_odeme = {
                "kasa_id": o_data.get("kasa_id"),
                "odeme_yontemi": o_data.get("odeme_yontemi"),
                "tutar": o_data.get("tutar"),
                "odeme_tarihi": o_data.get("odeme_tarihi"),
                "taksit_sayisi": o_data.get("taksit_sayisi", 1)
            }
            odeme = FinansOdeme(islem_id=db_tx.id, **valid_odeme)
            self.session.add(odeme)
            await self.session.flush()

            if odeme.kasa_id:
                # Get Kasa with row-level lock for accurate previous balance
                kasa_res = await self.session.execute(select(Kasa).where(Kasa.id == odeme.kasa_id).with_for_update())
                kasa = kasa_res.scalar_one()
                onceki_bakiye = float(kasa.bakiye or 0)

                
                # Deduct from Kasa (Expense)
                kasa.bakiye = onceki_bakiye - float(odeme.tutar)
                
                # Record Movement
                hareket = KasaHareket(
                    kasa_id=kasa.id,
                    hareket_tipi="cikis",
                    tutar=odeme.tutar,
                    onceki_bakiye=onceki_bakiye,
                    sonraki_bakiye=float(kasa.bakiye),
                    aciklama=f"Ref: {ref} gider işlemi",
                    islem_id=db_tx.id
                )
                self.session.add(hareket)

            # Generate Installments if taksit_sayisi > 1
            if hasattr(odeme, "taksit_sayisi") and odeme.taksit_sayisi and odeme.taksit_sayisi > 1:
                from dateutil.relativedelta import relativedelta
                from app.repositories.finance.models import FinansTaksit

                taksit_sayisi = int(odeme.taksit_sayisi)
                base_tutar = float(odeme.tutar) / taksit_sayisi
                base_tutar = round(base_tutar, 2)
                
                # Handling round-off error for the last installment
                remainder = round(float(odeme.tutar) - (base_tutar * (taksit_sayisi - 1)), 2)

                for i in range(1, taksit_sayisi + 1):
                    vade = odeme.odeme_tarihi + relativedelta(months=i)
                    taksit_tutari = remainder if i == taksit_sayisi else base_tutar
                    
                    taksit = FinansTaksit(
                        odeme_id=odeme.id,
                        taksit_no=i,
                        tutar=taksit_tutari,
                        vade_tarihi=vade,
                        durum="bekliyor"
                    )
                    self.session.add(taksit)

        await self.session.flush()

        from sqlalchemy.orm import selectinload
        stmt = (
            select(FinansIslem)
            .options(
                selectinload(FinansIslem.satirlar),
                selectinload(FinansIslem.odemeler).selectinload(FinansOdeme.taksitler)
            )
            .where(FinansIslem.id == db_tx.id)
        )
        res = await self.session.execute(stmt)
        return res.scalar_one()
