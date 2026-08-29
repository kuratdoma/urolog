from typing import List, Optional
from uuid import UUID
from datetime import date, datetime
from sqlalchemy import select, func, and_, case, update
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.finance.models import (
    FinansIslem,
    FinansIslemSatir,
    FinansOdeme,
    Kasa,
)
from app.repositories.patient.models import Hasta
from app.schemas.finance import FinansIslemCreate
from app.core.user_context import UserContext
from app.core.audit import audited


class IncomeRepository:
    def __init__(self, session: AsyncSession, context: Optional[UserContext] = None):
        self.session = session
        self.context = context

    async def generate_referans_kodu(self) -> str:
        yil = datetime.now().year
        result = await self.session.execute(
            select(func.max(FinansIslem.id)).where(
                and_(
                    FinansIslem.islem_tipi == "gelir",
                    func.extract("year", FinansIslem.created_at) == yil,
                )
            )
        )
        last_id = result.scalar() or 0
        return f"GEL-{yil}-{(last_id + 1):05d}"

    @audited(action="FINANCE_VIEW", resource_type="patient", id_arg_name="patient_id")
    async def get_patient_transactions(self, patient_id: UUID) -> List[FinansIslem]:
        stmt = (
            select(FinansIslem)
            .options(
                selectinload(FinansIslem.satirlar), 
                selectinload(FinansIslem.odemeler).selectinload(FinansOdeme.taksitler)
            )
            .where(
                and_(
                    FinansIslem.hasta_id == patient_id, FinansIslem.is_deleted == False
                )
            )
            .order_by(FinansIslem.tarih.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_transaction(self, tx_id: int) -> Optional[FinansIslem]:
        stmt = (
            select(FinansIslem)
            .options(
                selectinload(FinansIslem.satirlar), 
                selectinload(FinansIslem.odemeler).selectinload(FinansOdeme.taksitler)
            )
            .where(and_(FinansIslem.id == tx_id, FinansIslem.is_deleted == False))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_patient_balance(self, patient_id: UUID) -> dict:
        """Calculates patient balance status."""
        # Debt
        borc_stmt = select(func.sum(FinansIslem.net_tutar)).where(
            and_(
                FinansIslem.hasta_id == patient_id,
                FinansIslem.islem_tipi == "gelir",
                FinansIslem.durum != "iptal",
                FinansIslem.is_deleted == False,
            )
        )
        # Payment
        odeme_stmt = (
            select(func.sum(FinansOdeme.tutar))
            .join(FinansIslem)
            .where(
                and_(
                    FinansIslem.hasta_id == patient_id,
                    FinansIslem.durum != "iptal",
                    FinansIslem.is_deleted == False,
                )
            )
        )

        borc = float((await self.session.execute(borc_stmt)).scalar() or 0)
        odeme = float((await self.session.execute(odeme_stmt)).scalar() or 0)

        return {
            "hasta_id": patient_id,
            "toplam_borc": borc,
            "toplam_odeme": odeme,
            "bakiye": borc - odeme,
        }

    async def get_debtor_patients(self, min_borc: float = 0) -> List[dict]:
        # Implementation similar to legacy but using sharded models
        # Simplified for brevity here, full logic exists in legacy
        subq = (
            select(
                FinansIslem.hasta_id,
                func.sum(FinansIslem.net_tutar).label("total_debt"),
            )
            .where(
                and_(
                    FinansIslem.is_deleted == False,
                    FinansIslem.islem_tipi == "gelir",
                    FinansIslem.durum != "iptal",
                )
            )
            .group_by(FinansIslem.hasta_id)
            .subquery()
        )
        stmt = (
            select(
                Hasta.id,
                Hasta.ad,
                Hasta.soyad,
                subq.c.total_debt,
            )
            .join(subq, Hasta.id == subq.c.hasta_id)
            .where(subq.c.total_debt > min_borc)
            .order_by(subq.c.total_debt.desc())
        )
        result = await self.session.execute(stmt)
        return [
            {
                "hasta_id": r.id,
                "ad": r.ad,
                "soyad": r.soyad,
                "bakiye": float(r.total_debt),
            }
            for r in result.all()
        ]

    @audited(action="FINANCE_CREATE", resource_type="patient")
    async def create_income_transaction(self, obj_in: FinansIslemCreate) -> FinansIslem:
        from app.repositories.finance.models import KasaHareket
        
        ref = await self.generate_referans_kodu()
        data = obj_in.model_dump(exclude={"satirlar", "odemeler"})
        data["referans_kodu"] = ref
        data["islem_tipi"] = "gelir"
        
        # Remove fields that do not exist on the FinansIslem SQLAlchemy model
        data.pop("kdv_orani", None)
        data.pop("kdv_tutari", None)
        data.pop("notlar", None)

        db_tx = FinansIslem(**data)
        if self.context:
            db_tx.created_by = self.context.user_id
        self.session.add(db_tx)
        await self.session.flush()

        # Satirlar
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

        # Odemeler
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
                # Get Kasa with row-level lock
                kasa_res = await self.session.execute(select(Kasa).where(Kasa.id == odeme.kasa_id).with_for_update())
                kasa = kasa_res.scalar_one()
                onceki_bakiye = float(kasa.bakiye or 0)
                
                # Add to Kasa (Income)
                kasa.bakiye = onceki_bakiye + float(odeme.tutar)
                
                # Record Movement
                hareket = KasaHareket(
                    kasa_id=kasa.id,
                    hareket_tipi="giris",
                    tutar=odeme.tutar,
                    onceki_bakiye=onceki_bakiye,
                    sonraki_bakiye=float(kasa.bakiye),
                    aciklama=f"Ref: {ref} gelir işlemi",
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
    @audited(
        action="FINANCE_DELETE_ALL", resource_type="patient", id_arg_name="patient_id"
    )
    async def delete_patient_finance_data(self, patient_id: UUID) -> bool:
        """Logical delete of all finance data for a patient."""
        stmt = (
            update(FinansIslem)
            .where(FinansIslem.hasta_id == patient_id)
            .values(
                is_deleted=True,
                updated_by=self.context.user_id if self.context else None,
            )
        )
        await self.session.execute(stmt)
        await self.session.flush()
        return True

    async def get_financial_summary(
        self, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> dict:
        """Calculates general financial summary."""
        # 1. Base filters
        base_filter = [FinansIslem.is_deleted == False, FinansIslem.durum != "iptal"]
        if start_date:
            base_filter.append(FinansIslem.tarih >= start_date)
        if end_date:
            base_filter.append(FinansIslem.tarih <= end_date)

        # 2. Income/Expense Totals
        stmt_totals = select(
            func.sum(
                case(
                    (FinansIslem.islem_tipi == "gelir", FinansIslem.net_tutar), else_=0
                )
            ).label("total_income"),
            func.sum(
                case(
                    (FinansIslem.islem_tipi == "gider", FinansIslem.net_tutar), else_=0
                )
            ).label("total_expense"),
        ).where(and_(*base_filter))

        res_totals = await self.session.execute(stmt_totals)
        totals = res_totals.fetchone()

        # 3. Today's Totals
        today = date.today()
        stmt_today = select(
            func.sum(
                case(
                    (FinansIslem.islem_tipi == "gelir", FinansIslem.net_tutar), else_=0
                )
            ).label("today_income"),
            func.sum(
                case(
                    (FinansIslem.islem_tipi == "gider", FinansIslem.net_tutar), else_=0
                )
            ).label("today_expense"),
        ).where(
            and_(
                FinansIslem.is_deleted == False,
                FinansIslem.durum != "iptal",
                FinansIslem.tarih == today,
            )
        )

        res_today = await self.session.execute(stmt_today)
        today_totals = res_today.fetchone()

        # 4. Collection status (Odemeler)
        stmt_collected = (
            select(func.sum(FinansOdeme.tutar))
            .join(FinansIslem, FinansIslem.id == FinansOdeme.islem_id)
            .where(and_(FinansIslem.is_deleted == False, FinansIslem.durum != "iptal"))
        )
        if start_date:
            stmt_collected = stmt_collected.where(
                FinansOdeme.odeme_tarihi >= start_date
            )
        if end_date:
            stmt_collected = stmt_collected.where(FinansOdeme.odeme_tarihi <= end_date)

        collected = float((await self.session.execute(stmt_collected)).scalar() or 0)

        income = float(totals.total_income or 0)
        expense = float(totals.total_expense or 0)

        return {
            "toplam_gelir": income,
            "toplam_gider": expense,
            "net_bakiye": income - expense,
            "bekleyen_tahsilat": income - collected if income > collected else 0,
            "vadesi_gecmis_islem_sayisi": len(await self.get_overdue_transactions(limit=1000)),
            "bugun_gelir": float(today_totals.today_income or 0),
            "bugun_gider": float(today_totals.today_expense or 0),
        }

    async def get_overdue_transactions(
        self, skip: int = 0, limit: int = 50
    ) -> List[FinansIslem]:
        """Vadesi geçmiş (ödenmemiş ve vadesi bugünden önce olan) işlemleri getirir"""
        today = date.today()
        # Subquery to check total paid for each transaction
        paid_subq = (
            select(
                FinansOdeme.islem_id,
                func.sum(FinansOdeme.tutar).label("total_paid"),
            )
            .group_by(FinansOdeme.islem_id)
            .subquery()
        )

        stmt = (
            select(FinansIslem)
            .outerjoin(paid_subq, FinansIslem.id == paid_subq.c.islem_id)
            .where(
                and_(
                    FinansIslem.is_deleted == False,
                    FinansIslem.islem_tipi == "gelir",
                    FinansIslem.durum != "iptal",
                    FinansIslem.vade_tarihi < today,
                    # Either no payment or total paid < net amount
                    case(
                        (paid_subq.c.total_paid == None, True),
                        else_=(paid_subq.c.total_paid < FinansIslem.net_tutar),
                    ),
                )
            )
            .order_by(FinansIslem.vade_tarihi.asc())
            .offset(skip)
            .limit(limit)
        )

        result = await self.session.execute(stmt)
        return result.scalars().all()
