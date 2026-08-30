from typing import List, Optional
from uuid import UUID
from datetime import date
from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.finance.models import (
    FinansIslem,
    FinansOdeme,
    FinansKategori,
    Kasa,
    Firma,
)
from app.repositories.patient.models import Hasta


class IncomeReportMixin:
    session: AsyncSession

    async def get_paid_total(self, tx_id: int) -> float:
        res = await self.session.execute(
            select(func.coalesce(func.sum(FinansOdeme.tutar), 0)).where(
                FinansOdeme.islem_id == tx_id
            )
        )
        return float(res.scalar() or 0)

    async def search_transactions(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        islem_tipi: Optional[str] = None,
        durum: Optional[str] = None,
        kategori_id: Optional[int] = None,
        hasta_id: Optional[UUID] = None,
        firma_id: Optional[int] = None,
        kasa_id: Optional[int] = None,
        referans: Optional[str] = None,
        vade_gecmis: Optional[bool] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[List[dict], int]:
        paid_subq = (
            select(
                FinansOdeme.islem_id.label("islem_id"),
                func.sum(FinansOdeme.tutar).label("total_paid"),
                func.count(FinansOdeme.id).label("odeme_sayisi"),
                func.min(FinansOdeme.odeme_yontemi).label("ilk_yontem"),
                func.min(FinansOdeme.kasa_id).label("odeme_kasa_id"),
            )
            .group_by(FinansOdeme.islem_id)
            .subquery()
        )

        filters = [FinansIslem.is_deleted == False]
        if start_date:
            filters.append(FinansIslem.tarih >= start_date)
        if end_date:
            filters.append(FinansIslem.tarih <= end_date)
        if islem_tipi:
            filters.append(FinansIslem.islem_tipi == islem_tipi)
        if durum:
            filters.append(FinansIslem.durum == durum)
        if kategori_id is not None:
            filters.append(FinansIslem.kategori_id == kategori_id)
        if hasta_id is not None:
            filters.append(FinansIslem.hasta_id == hasta_id)
        if firma_id is not None:
            filters.append(FinansIslem.firma_id == firma_id)
        if referans:
            filters.append(FinansIslem.referans_no.ilike(f"%{referans}%"))
        if vade_gecmis:
            filters.append(
                and_(
                    FinansIslem.vade_tarihi.isnot(None),
                    FinansIslem.vade_tarihi < date.today(),
                    FinansIslem.durum.in_(["bekliyor", "kismi_odendi"]),
                )
            )

        base_from = (
            select(
                FinansIslem,
                Hasta.ad.label("hasta_ad"),
                Hasta.soyad.label("hasta_soyad"),
                FinansKategori.ad.label("kategori_adi"),
                Firma.unvan.label("firma_unvani"),
                func.coalesce(paid_subq.c.total_paid, 0).label("odenen_tutar"),
                func.coalesce(paid_subq.c.odeme_sayisi, 0).label("odeme_sayisi"),
                paid_subq.c.ilk_yontem.label("odeme_yontemi"),
                Kasa.ad.label("kasa_adi"),
            )
            .outerjoin(Hasta, FinansIslem.hasta_id == Hasta.id)
            .outerjoin(FinansKategori, FinansIslem.kategori_id == FinansKategori.id)
            .outerjoin(Firma, FinansIslem.firma_id == Firma.id)
            .outerjoin(paid_subq, FinansIslem.id == paid_subq.c.islem_id)
            .outerjoin(Kasa, paid_subq.c.odeme_kasa_id == Kasa.id)
            .where(and_(*filters))
        )

        if kasa_id is not None:
            base_from = base_from.where(paid_subq.c.odeme_kasa_id == kasa_id)

        count_stmt = select(func.count()).select_from(base_from.subquery())
        total = (await self.session.execute(count_stmt)).scalar() or 0

        query_stmt = (
            base_from.order_by(FinansIslem.tarih.desc(), FinansIslem.id.desc())
            .offset(skip)
            .limit(limit)
        )
        rows = (await self.session.execute(query_stmt)).all()

        items = []
        for row in rows:
            tx = row[0]
            hasta_ad = row[1]
            hasta_soyad = row[2]
            kategori_adi = row[3]
            firma_unvani = row[4]
            odenen = float(row[5])
            odeme_sayisi = int(row[6])
            odeme_yontemi = row[7]
            kasa_adi = row[8]

            kalan = round(max(0.0, float(tx.net_tutar or 0) - odenen), 2)
            hasta_tam_ad = (
                f"{hasta_ad} {hasta_soyad}".strip()
                if (hasta_ad or hasta_soyad)
                else None
            )

            is_overdue = bool(
                tx.vade_tarihi
                and tx.vade_tarihi < date.today()
                and tx.durum in ("bekliyor", "kismi_odendi")
            )

            items.append(
                {
                    "id": tx.id,
                    "referans_no": tx.referans_no,
                    "islem_tipi": tx.islem_tipi,
                    "tarih": tx.tarih,
                    "vade_tarihi": tx.vade_tarihi,
                    "vade_gecmis": is_overdue,
                    "durum": tx.durum,
                    "brut_tutar": float(tx.brut_tutar or 0),
                    "indirim_tutari": float(tx.indirim_tutari or 0),
                    "kdv_tutari": float(tx.kdv_tutari or 0),
                    "net_tutar": float(tx.net_tutar or 0),
                    "odenen_tutar": odenen,
                    "kalan_tutar": kalan,
                    "odeme_sayisi": odeme_sayisi,
                    "odeme_yontemi": odeme_yontemi,
                    "kasa_adi": kasa_adi,
                    "aciklama": tx.aciklama,
                    "kategori_id": tx.kategori_id,
                    "kategori_adi": kategori_adi,
                    "hasta_id": str(tx.hasta_id) if tx.hasta_id else None,
                    "hasta_adi": hasta_tam_ad,
                    "firma_id": tx.firma_id,
                    "firma_unvani": firma_unvani,
                    "doktor_id": tx.doktor_id,
                    "created_at": tx.created_at,
                    "created_by": tx.created_by,
                }
            )

        return items, total

    async def get_financial_summary(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> dict:
        filters = [FinansIslem.is_deleted == False, FinansIslem.durum != "iptal"]
        if start_date:
            filters.append(FinansIslem.tarih >= start_date)
        if end_date:
            filters.append(FinansIslem.tarih <= end_date)

        stmt = select(
            func.coalesce(
                func.sum(
                    case((FinansIslem.islem_tipi == "gelir", FinansIslem.net_tutar), else_=0)
                ),
                0,
            ).label("toplam_gelir"),
            func.coalesce(
                func.sum(
                    case((FinansIslem.islem_tipi == "gider", FinansIslem.net_tutar), else_=0)
                ),
                0,
            ).label("toplam_gider"),
            func.count(FinansIslem.id).label("toplam_islem_sayisi"),
        ).where(and_(*filters))

        res = await self.session.execute(stmt)
        row = res.one()
        toplam_gelir = float(row.toplam_gelir)
        toplam_gider = float(row.toplam_gider)

        pay_filters = []
        if start_date:
            pay_filters.append(FinansOdeme.odeme_tarihi >= start_date)
        if end_date:
            pay_filters.append(FinansOdeme.odeme_tarihi <= end_date)

        pay_stmt = (
            select(
                func.coalesce(
                    func.sum(
                        case((FinansIslem.islem_tipi == "gelir", FinansOdeme.tutar), else_=0)
                    ),
                    0,
                ).label("tahsil_edilen"),
                func.coalesce(
                    func.sum(
                        case((FinansIslem.islem_tipi == "gider", FinansOdeme.tutar), else_=0)
                    ),
                    0,
                ).label("odenen_gider"),
            )
            .join(FinansIslem, FinansOdeme.islem_id == FinansIslem.id)
            .where(
                and_(
                    FinansIslem.is_deleted == False,
                    FinansIslem.durum != "iptal",
                    *pay_filters,
                )
            )
        )
        pay_res = await self.session.execute(pay_stmt)
        pay_row = pay_res.one()
        tahsil_edilen = float(pay_row.tahsil_edilen)
        odenen_gider = float(pay_row.odenen_gider)

        bekleyen_alacak = max(0.0, round(toplam_gelir - tahsil_edilen, 2))
        bekleyen_borc = max(0.0, round(toplam_gider - odenen_gider, 2))

        kasa_res = await self.session.execute(
            select(func.coalesce(func.sum(Kasa.bakiye), 0)).where(Kasa.is_active == True)
        )
        toplam_kasa = float(kasa_res.scalar() or 0)

        vade_gecmis_sayisi = await self.count_overdue_transactions()

        return {
            "toplam_gelir": toplam_gelir,
            "toplam_gider": toplam_gider,
            "net_bakiye": round(toplam_gelir - toplam_gider, 2),
            "tahsil_edilen": tahsil_edilen,
            "odenen_gider": odenen_gider,
            "bekleyen_alacak": bekleyen_alacak,
            "bekleyen_borc": bekleyen_borc,
            "toplam_kasa_bakiyesi": toplam_kasa,
            "toplam_islem_sayisi": int(row.toplam_islem_sayisi),
            "vade_gecmis_islem_sayisi": vade_gecmis_sayisi,
        }

    async def get_category_breakdown(
        self,
        islem_tipi: str = "gelir",
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[dict]:
        filters = [
            FinansIslem.is_deleted == False,
            FinansIslem.durum != "iptal",
            FinansIslem.islem_tipi == islem_tipi,
        ]
        if start_date:
            filters.append(FinansIslem.tarih >= start_date)
        if end_date:
            filters.append(FinansIslem.tarih <= end_date)

        stmt = (
            select(
                FinansIslem.kategori_id,
                func.coalesce(FinansKategori.ad, "Kategorisiz").label("kategori_adi"),
                FinansKategori.renk,
                func.coalesce(func.sum(FinansIslem.net_tutar), 0).label("toplam_tutar"),
                func.count(FinansIslem.id).label("islem_sayisi"),
            )
            .outerjoin(FinansKategori, FinansIslem.kategori_id == FinansKategori.id)
            .where(and_(*filters))
            .group_by(FinansIslem.kategori_id, FinansKategori.ad, FinansKategori.renk)
            .order_by(func.sum(FinansIslem.net_tutar).desc())
        )

        res = await self.session.execute(stmt)
        rows = res.all()

        genel_toplam = sum(float(r.toplam_tutar) for r in rows)

        return [
            {
                "kategori_id": r.kategori_id,
                "kategori_adi": r.kategori_adi,
                "renk": r.renk,
                "toplam_tutar": float(r.toplam_tutar),
                "islem_sayisi": int(r.islem_sayisi),
                "yuzde": round((float(r.toplam_tutar) / genel_toplam * 100), 1)
                if genel_toplam > 0
                else 0.0,
            }
            for r in rows
        ]

    async def get_aging_report(self) -> List[dict]:
        today = date.today()

        paid_subq = (
            select(
                FinansOdeme.islem_id,
                func.coalesce(func.sum(FinansOdeme.tutar), 0).label("odenen"),
            )
            .group_by(FinansOdeme.islem_id)
            .subquery()
        )

        vade_col = func.coalesce(FinansIslem.vade_tarihi, FinansIslem.tarih)
        gecikme_gun = func.cast(
            func.extract("day", func.cast(today, func.DateTime()) - func.cast(vade_col, func.DateTime())),
            func.Integer,
        )

        kalan_expr = FinansIslem.net_tutar - func.coalesce(paid_subq.c.odenen, 0)

        stmt = (
            select(
                FinansIslem.id,
                vade_col.label("vade"),
                kalan_expr.label("kalan"),
            )
            .outerjoin(paid_subq, FinansIslem.id == paid_subq.c.islem_id)
            .where(
                and_(
                    FinansIslem.islem_tipi == "gelir",
                    FinansIslem.is_deleted == False,
                    FinansIslem.durum.notin_(["tamamlandi", "iptal"]),
                    kalan_expr > 0.009,
                )
            )
        )

        res = await self.session.execute(stmt)
        rows = res.all()

        kovalar = [
            {"kova": "vadesi_gelmemis", "etiket": "Vadesi Gelmemiş", "toplam": 0.0, "adet": 0},
            {"kova": "1_30_gun", "etiket": "1-30 Gün", "toplam": 0.0, "adet": 0},
            {"kova": "31_60_gun", "etiket": "31-60 Gün", "toplam": 0.0, "adet": 0},
            {"kova": "61_90_gun", "etiket": "61-90 Gün", "toplam": 0.0, "adet": 0},
            {"kova": "90_plus", "etiket": "90+ Gün", "toplam": 0.0, "adet": 0},
        ]

        for r in rows:
            kalan = float(r.kalan)
            vade: date = r.vade
            gun = (today - vade).days if vade else 0

            if gun <= 0:
                idx = 0
            elif gun <= 30:
                idx = 1
            elif gun <= 60:
                idx = 2
            elif gun <= 90:
                idx = 3
            else:
                idx = 4

            kovalar[idx]["toplam"] += kalan
            kovalar[idx]["adet"] += 1

        for k in kovalar:
            k["toplam"] = round(k["toplam"], 2)

        return kovalar

    async def count_overdue_transactions(self) -> int:
        stmt = select(func.count(FinansIslem.id)).where(
            and_(
                FinansIslem.is_deleted == False,
                FinansIslem.vade_tarihi.isnot(None),
                FinansIslem.vade_tarihi < date.today(),
                FinansIslem.durum.in_(["bekliyor", "kismi_odendi"]),
            )
        )
        res = await self.session.execute(stmt)
        return int(res.scalar() or 0)
