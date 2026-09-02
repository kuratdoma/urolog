from typing import List, Optional
from uuid import UUID
from datetime import date
from sqlalchemy import select, func, and_, delete
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.finance.models import (
    FinansIslem,
    FinansOdeme,
    FinansTaksit,
    KasaHareket,
    Kasa,
)
from app.repositories.patient.models import Hasta
from app.core.audit import audited


class IncomePatientMixin:
    session: AsyncSession

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

    async def get_open_transactions(self, patient_id: UUID) -> List[dict]:
        """
        Hastanın henüz tamamı ödenmemiş (durum != 'tamamlandi' ve != 'iptal')
        gelir işlemlerini getirir. Vade tarihine göre artan sıralanır
        (en eski vade önce — toplu tahsilat dağıtımı için).
        """
        paid_subq = (
            select(
                FinansOdeme.islem_id,
                func.coalesce(func.sum(FinansOdeme.tutar), 0).label("odenen_tutar"),
            )
            .group_by(FinansOdeme.islem_id)
            .subquery()
        )

        stmt = (
            select(
                FinansIslem.id,
                FinansIslem.referans_no,
                FinansIslem.tarih,
                FinansIslem.vade_tarihi,
                FinansIslem.aciklama,
                FinansIslem.net_tutar,
                func.coalesce(paid_subq.c.odenen_tutar, 0).label("odenen_tutar"),
                (
                    FinansIslem.net_tutar - func.coalesce(paid_subq.c.odenen_tutar, 0)
                ).label("kalan_tutar"),
            )
            .outerjoin(paid_subq, FinansIslem.id == paid_subq.c.islem_id)
            .where(
                and_(
                    FinansIslem.hasta_id == patient_id,
                    FinansIslem.islem_tipi == "gelir",
                    FinansIslem.is_deleted == False,
                    FinansIslem.durum.notin_(["tamamlandi", "iptal"]),
                    (FinansIslem.net_tutar - func.coalesce(paid_subq.c.odenen_tutar, 0))
                    > 0.009,
                )
            )
            .order_by(
                func.coalesce(FinansIslem.vade_tarihi, FinansIslem.tarih).asc()
            )
        )

        res = await self.session.execute(stmt)
        rows = res.all()
        return [
            {
                "islem_id": r.id,
                "referans_no": r.referans_no,
                "tarih": r.tarih,
                "vade_tarihi": r.vade_tarihi,
                "aciklama": r.aciklama,
                "net_tutar": float(r.net_tutar),
                "odenen_tutar": float(r.odenen_tutar),
                "kalan_tutar": float(r.kalan_tutar),
            }
            for r in rows
        ]

    async def get_patient_statement(
        self,
        patient_id: UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> dict:
        """
        Hasta cari ekstresi: her tahakkuk (borç) ve her tahsilat (alacak)
        tarihe göre sıralı satırlar halinde listelenir. Yürüyen bakiye hesaplanır.
        """
        hasta = await self.session.get(Hasta, patient_id)
        hasta_adi = f"{hasta.ad} {hasta.soyad}" if hasta else "Bilinmeyen Hasta"

        tx_stmt = select(FinansIslem).where(
            and_(
                FinansIslem.hasta_id == patient_id,
                FinansIslem.islem_tipi == "gelir",
                FinansIslem.is_deleted == False,
                FinansIslem.durum != "iptal",
            )
        )
        if start_date:
            tx_stmt = tx_stmt.where(FinansIslem.tarih >= start_date)
        if end_date:
            tx_stmt = tx_stmt.where(FinansIslem.tarih <= end_date)

        tx_result = await self.session.execute(tx_stmt)
        transactions = tx_result.scalars().all()

        pay_stmt = (
            select(FinansOdeme, FinansIslem, Kasa.ad.label("kasa_adi"))
            .join(FinansIslem, FinansOdeme.islem_id == FinansIslem.id)
            .outerjoin(Kasa, FinansOdeme.kasa_id == Kasa.id)
            .where(
                and_(
                    FinansIslem.hasta_id == patient_id,
                    FinansIslem.islem_tipi == "gelir",
                    FinansIslem.is_deleted == False,
                    FinansIslem.durum != "iptal",
                )
            )
        )
        if start_date:
            pay_stmt = pay_stmt.where(FinansOdeme.odeme_tarihi >= start_date)
        if end_date:
            pay_stmt = pay_stmt.where(FinansOdeme.odeme_tarihi <= end_date)

        pay_result = await self.session.execute(pay_stmt)
        payments = pay_result.all()

        satirlar = []
        for tx in transactions:
            satirlar.append(
                {
                    "tarih": tx.tarih,
                    "tip": "tahakkuk",
                    "referans_no": tx.referans_no,
                    "aciklama": tx.aciklama or "Hizmet / Muayene Bedeli",
                    "borc": float(tx.net_tutar or 0),
                    "alacak": 0.0,
                    "kasa_adi": None,
                    "odeme_yontemi": None,
                }
            )

        for odeme, tx, kasa_adi in payments:
            satirlar.append(
                {
                    "tarih": odeme.odeme_tarihi,
                    "tip": "tahsilat",
                    "referans_no": tx.referans_no,
                    "aciklama": odeme.notlar
                    or f"Tahsilat ({odeme.odeme_yontemi})",
                    "borc": 0.0,
                    "alacak": float(odeme.tutar or 0),
                    "kasa_adi": kasa_adi,
                    "odeme_yontemi": odeme.odeme_yontemi,
                }
            )

        satirlar.sort(
            key=lambda x: (x["tarih"], 0 if x["tip"] == "tahakkuk" else 1)
        )

        bakiye = 0.0
        for s in satirlar:
            bakiye += s["borc"] - s["alacak"]
            s["bakiye"] = round(bakiye, 2)

        toplam_borc = sum(s["borc"] for s in satirlar)
        toplam_alacak = sum(s["alacak"] for s in satirlar)

        return {
            "hasta_id": str(patient_id),
            "hasta_adi": hasta_adi,
            "toplam_borc": round(toplam_borc, 2),
            "toplam_alacak": round(toplam_alacak, 2),
            "bakiye": round(bakiye, 2),
            "satirlar": satirlar,
        }

    async def get_patient_balance(self, patient_id: UUID) -> dict:
        hasta = await self.session.get(Hasta, patient_id)
        hasta_adi = f"{hasta.ad} {hasta.soyad}" if hasta else "Bilinmeyen Hasta"

        stmt_borc = select(
            func.coalesce(func.sum(FinansIslem.net_tutar), 0)
        ).where(
            and_(
                FinansIslem.hasta_id == patient_id,
                FinansIslem.islem_tipi == "gelir",
                FinansIslem.is_deleted == False,
                FinansIslem.durum != "iptal",
            )
        )
        res_borc = await self.session.execute(stmt_borc)
        toplam_borc = float(res_borc.scalar() or 0)

        stmt_alacak = (
            select(func.coalesce(func.sum(FinansOdeme.tutar), 0))
            .join(FinansIslem, FinansOdeme.islem_id == FinansIslem.id)
            .where(
                and_(
                    FinansIslem.hasta_id == patient_id,
                    FinansIslem.is_deleted == False,
                    FinansIslem.durum != "iptal",
                )
            )
        )
        res_alacak = await self.session.execute(stmt_alacak)
        toplam_alacak = float(res_alacak.scalar() or 0)

        return {
            "hasta_id": str(patient_id),
            "hasta_adi": hasta_adi,
            "toplam_borc": toplam_borc,
            "toplam_alacak": toplam_alacak,
            "bakiye": round(toplam_borc - toplam_alacak, 2),
        }

    async def get_debtor_patients(
        self, min_borc: float = 0.0, skip: int = 0, limit: int = 100
    ) -> List[dict]:
        paid_subq = (
            select(
                FinansIslem.hasta_id.label("hasta_id"),
                func.coalesce(func.sum(FinansOdeme.tutar), 0).label(
                    "toplam_alacak"
                ),
            )
            .join(FinansOdeme, FinansIslem.id == FinansOdeme.islem_id)
            .where(
                and_(
                    FinansIslem.is_deleted == False, FinansIslem.durum != "iptal"
                )
            )
            .group_by(FinansIslem.hasta_id)
            .subquery()
        )

        charge_subq = (
            select(
                FinansIslem.hasta_id.label("hasta_id"),
                func.coalesce(func.sum(FinansIslem.net_tutar), 0).label(
                    "toplam_borc"
                ),
            )
            .where(
                and_(
                    FinansIslem.islem_tipi == "gelir",
                    FinansIslem.is_deleted == False,
                    FinansIslem.durum != "iptal",
                    FinansIslem.hasta_id.isnot(None),
                )
            )
            .group_by(FinansIslem.hasta_id)
            .subquery()
        )

        bakiye_expr = func.coalesce(charge_subq.c.toplam_borc, 0) - func.coalesce(
            paid_subq.c.toplam_alacak, 0
        )

        stmt = (
            select(
                Hasta.id.label("hasta_id"),
                func.concat(Hasta.ad, " ", Hasta.soyad).label("hasta_adi"),
                func.coalesce(charge_subq.c.toplam_borc, 0).label("toplam_borc"),
                func.coalesce(paid_subq.c.toplam_alacak, 0).label(
                    "toplam_alacak"
                ),
                bakiye_expr.label("bakiye"),
            )
            .join(charge_subq, Hasta.id == charge_subq.c.hasta_id)
            .outerjoin(paid_subq, Hasta.id == paid_subq.c.hasta_id)
            .where(bakiye_expr > min_borc)
            .order_by(bakiye_expr.desc())
            .offset(skip)
            .limit(limit)
        )

        res = await self.session.execute(stmt)
        return [
            {
                "hasta_id": str(r.hasta_id),
                "hasta_adi": r.hasta_adi,
                "toplam_borc": float(r.toplam_borc),
                "toplam_alacak": float(r.toplam_alacak),
                "bakiye": float(r.bakiye),
            }
            for r in res.all()
        ]

    async def delete_patient_finance_data(self, patient_id: UUID) -> bool:
        tx_subq = select(FinansIslem.id).where(FinansIslem.hasta_id == patient_id)
        odeme_subq = select(FinansOdeme.id).where(
            FinansOdeme.islem_id.in_(tx_subq)
        )

        await self.session.execute(
            delete(FinansTaksit).where(
                FinansTaksit.odeme_id.in_(odeme_subq)
            )
        )
        await self.session.execute(
            delete(KasaHareket).where(
                KasaHareket.islem_id.in_(tx_subq)
            )
        )
        await self.session.execute(
            delete(FinansOdeme).where(FinansOdeme.islem_id.in_(tx_subq))
        )
        await self.session.execute(
            delete(FinansIslem).where(FinansIslem.hasta_id == patient_id)
        )
        await self.session.commit()
        return True
