from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, distinct, union_all
from datetime import date, timedelta, datetime
from typing import List, Dict, Any, Optional

from app.repositories.patient.models import Hasta
from app.repositories.clinical.models import Operasyon, Muayene, KlinikNot
from app.repositories.finance.models import FinansIslem
from app.models.appointment import Randevu
from app.schemas.report import (
    DiagnosisFilterResult,
    DiagnosisTrendPoint,
    DiagnosisStats,
    ReferenceCategory,
    ServiceDistribution,
    ChartDataPoint,
)

REFERENCE_CATEGORIES = {
    "hekim": {
        "label": "Hekim Referansı",
        "keywords": [
            "dr.", "dr ", "doktor", "hekim", "uzman", "prof.", "doç.", "yrd.doç.", "op.dr.", "pratisyen",
        ],
    },
    "hasta": {
        "label": "Hasta Referansı",
        "keywords": [
            "hasta", "tanıdık", "arkadaş", "akraba", "aile", "komşu", "tavsiye", "öneri",
        ],
    },
    "dijital": {
        "label": "Dijital/Akademik",
        "keywords": [
            "web", "internet", "google", "makale", "yayın", "sosyal medya", "instagram", "facebook", "twitter", "youtube", "linkedin",
        ],
    },
}

SERVICE_MAPPINGS = {
    "Üroonkoloji": ["C61", "C67", "C64", "C65", "C66", "C68", "D41", "tümör", "kanser", "onko", "malign"],
    "Androloji": ["N48", "N49", "N50", "erekti", "impotans", "infertil", "varikosel", "peyronie", "libido"],
    "Taş Hastalığı": ["N20", "N21", "N22", "N23", "taş", "ürolitiyaz", "nefrolitiyaz", "ESWL", "URS", "PCNL"],
    "Prostat": ["N40", "N41", "N42", "BPH", "prostat", "TURP", "prostatit"],
    "Enfeksiyon": ["N30", "N34", "N39", "sistit", "üretrit", "piyelonefrit", "enfeksiyon", "idrar yolu"],
    "Ürodinamik": ["N31", "N32", "N39.3", "N39.4", "inkontinans", "aşırı aktif", "nörojenik", "ürodinami"],
}

class DemographicsAnalyticsRepository:
    @staticmethod
    async def get_diagnosis_stats(
        db: AsyncSession,
        icd_code: Optional[str] = None,
        diagnosis_text: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> DiagnosisStats:
        today = date.today()
        if not start_date:
            start_date = today - timedelta(days=730)  # Default 2 years
        if not end_date:
            end_date = today

        conditions = [
            Muayene.tarih >= datetime.combine(start_date, datetime.min.time()),
            Muayene.tarih <= datetime.combine(end_date, datetime.max.time()),
        ]

        if icd_code:
            conditions.append(
                or_(
                    Muayene.tani1_kodu.ilike(f"%{icd_code}%"),
                    Muayene.tani2_kodu.ilike(f"%{icd_code}%"),
                )
            )

        if diagnosis_text:
            conditions.append(
                or_(
                    Muayene.tani1.ilike(f"%{diagnosis_text}%"),
                    Muayene.tani2.ilike(f"%{diagnosis_text}%"),
                )
            )

        query = (
            select(
                Hasta.id,
                Hasta.ad,
                Hasta.soyad,
                Muayene.tani1,
                Muayene.tani1_kodu,
                Muayene.tarih,
            )
            .join(
                Hasta,
                Muayene.hasta_id == Hasta.id,
            )
            .where(and_(*conditions))
            .order_by(desc(Muayene.tarih))
        )

        res = await db.execute(query)
        rows = res.all()

        patients = [
            DiagnosisFilterResult(
                id=str(row[0]),
                ad=row[1] or "",
                soyad=row[2] or "",
                tani=row[3] or "",
                tani_kodu=row[4] or "",
                tarih=row[5].isoformat() if row[5] else "",
            )
            for row in rows
        ]

        total_count = len(patients)

        res_total_patients = await db.execute(
            select(func.count(distinct(Hasta.id)))
        )
        total_portfolio = res_total_patients.scalar() or 1
        percentage = (total_count / total_portfolio) * 100

        trend = []
        for year_offset in range(2, -1, -1):
            trend_year = today.year - year_offset
            trend_start = date(trend_year, 1, 1)
            trend_end = date(trend_year, 12, 31)

            trend_conditions = [
                Muayene.tarih >= datetime.combine(trend_start, datetime.min.time()),
                Muayene.tarih <= datetime.combine(trend_end, datetime.max.time()),
            ]
            if icd_code:
                trend_conditions.append(
                    or_(
                        Muayene.tani1_kodu.ilike(f"%{icd_code}%"),
                        Muayene.tani2_kodu.ilike(f"%{icd_code}%"),
                    )
                )
            if diagnosis_text:
                trend_conditions.append(
                    or_(
                        Muayene.tani1.ilike(f"%{diagnosis_text}%"),
                        Muayene.tani2.ilike(f"%{diagnosis_text}%"),
                    )
                )

            res_trend = await db.execute(
                select(func.count(distinct(Muayene.hasta_id))).where(
                    and_(*trend_conditions)
                )
            )
            trend_count = res_trend.scalar() or 0
            trend.append(DiagnosisTrendPoint(period=str(trend_year), count=trend_count))

        return DiagnosisStats(
            total_count=total_count,
            percentage_of_portfolio=round(percentage, 2),
            trend=trend,
            patients=patients[:100],
        )

    @staticmethod
    async def get_reference_categories(
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[ReferenceCategory]:
        today = date.today()
        if not start_date:
            start_date = date(today.year, today.month, 1)
        if not end_date:
            end_date = today

        query = (
            select(
                Hasta.referans,
                func.count(distinct(Hasta.id)),
            )
            .join(
                Muayene, Hasta.id == Muayene.hasta_id
            )
            .where(
                and_(
                    Hasta.referans.isnot(None),
                    Hasta.referans != "",
                    Muayene.tarih >= datetime.combine(start_date, datetime.min.time()),
                    Muayene.tarih <= datetime.combine(end_date, datetime.max.time()),
                )
            )
            .group_by(Hasta.referans)
        )

        res = await db.execute(query)
        rows = res.all()

        categories = {
            "hekim": {"label": "Hekim Referansı", "count": 0, "sources": []},
            "hasta": {"label": "Hasta Referansı", "count": 0, "sources": []},
            "dijital": {"label": "Dijital/Akademik", "count": 0, "sources": []},
            "diger": {"label": "Diğer", "count": 0, "sources": []},
        }

        total_count = sum(row[1] for row in rows)

        for ref_name, count in rows:
            ref_lower = ref_name.lower() if ref_name else ""
            categorized = False

            for cat_key, cat_data in REFERENCE_CATEGORIES.items():
                if any(kw in ref_lower for kw in cat_data["keywords"]):
                    categories[cat_key]["count"] += count
                    categories[cat_key]["sources"].append(
                        ChartDataPoint(name=ref_name, value=count)
                    )
                    categorized = True
                    break

            if not categorized:
                categories["diger"]["count"] += count
                categories["diger"]["sources"].append(
                    ChartDataPoint(name=ref_name, value=count)
                )

        result = []
        for cat_key, cat_data in categories.items():
            if cat_data["count"] > 0:
                result.append(
                    ReferenceCategory(
                        category=cat_key,
                        category_label=cat_data["label"],
                        count=cat_data["count"],
                        percentage=round(
                            (
                                (cat_data["count"] / total_count * 100)
                                if total_count > 0
                                else 0
                            ),
                            1,
                        ),
                        sources=sorted(
                            cat_data["sources"], key=lambda x: x.value, reverse=True
                        )[:10],
                    )
                )

        return sorted(result, key=lambda x: x.count, reverse=True)

    @staticmethod
    async def get_service_distribution(
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[ServiceDistribution]:
        today = date.today()
        if not start_date:
            start_date = date(today.year, today.month, 1)
        if not end_date:
            end_date = today

        query = (
            select(
                Muayene.tani1,
                Muayene.tani1_kodu,
                Muayene.tani2,
                Muayene.tani2_kodu,
                func.count(Muayene.id).label("count"),
            )
            .where(
                    Muayene.tarih >= datetime.combine(start_date, datetime.min.time()),
                    Muayene.tarih <= datetime.combine(end_date, datetime.max.time()),
            )
            .group_by(
                Muayene.tani1,
                Muayene.tani1_kodu,
                Muayene.tani2,
                Muayene.tani2_kodu,
            )
        )

        res = await db.execute(query)
        rows = res.all()

        service_counts = {service: 0 for service in SERVICE_MAPPINGS.keys()}
        service_counts["Diğer"] = 0
        total_count = 0

        for row in rows:
            tani1, kod1, tani2, kod2, count = row
            combined_text = (
                f"{tani1 or ''} {kod1 or ''} {tani2 or ''} {kod2 or ''}".lower()
            )
            total_count += count
            categorized = False

            for service, keywords in SERVICE_MAPPINGS.items():
                if any(kw.lower() in combined_text for kw in keywords):
                    service_counts[service] += count
                    categorized = True
                    break

            if not categorized:
                service_counts["Diğer"] += count

        result = []
        for service, count in service_counts.items():
            if count > 0:
                result.append(
                    ServiceDistribution(
                        name=service,
                        count=count,
                        percentage=round(
                            (count / total_count * 100) if total_count > 0 else 0, 1
                        ),
                    )
                )

        return sorted(result, key=lambda x: x.count, reverse=True)

    @staticmethod
    async def get_patient_trends(
        db: AsyncSession,
        start_date_filter: Optional[date] = None,
        end_date_filter: Optional[date] = None,
    ) -> List[ChartDataPoint]:
        if not end_date_filter:
            end_date_filter = date.today()
        if not start_date_filter:
            start_date_filter = end_date_filter - timedelta(days=180)

        # Cap to 24 months max for chart readability
        max_start = end_date_filter - timedelta(days=730)
        if start_date_filter < max_start:
            start_date_filter = max_start
        start_date_filter = date(start_date_filter.year, start_date_filter.month, 1)

        m_stmt = select(Muayene.hasta_id, Muayene.tarih)
        n_stmt = select(KlinikNot.hasta_id, KlinikNot.tarih)
        combined_stmt = union_all(m_stmt, n_stmt).alias("combined")

        latest_per_patient = (
            select(
                combined_stmt.c.hasta_id,
                func.max(combined_stmt.c.tarih).label("max_tarih"),
            )
            .group_by(combined_stmt.c.hasta_id)
            .subquery()
        )

        month_trunc = func.date_trunc("month", latest_per_patient.c.max_tarih).label("month")
        res = await db.execute(
            select(month_trunc, func.count(latest_per_patient.c.hasta_id))
            .where(
                and_(
                    latest_per_patient.c.max_tarih >= start_date_filter,
                    latest_per_patient.c.max_tarih <= end_date_filter,
                )
            )
            .group_by(month_trunc)
            .order_by(month_trunc)
        )
        rows = res.all()

        return [
            ChartDataPoint(
                name=row[0].strftime("%b %y") if row[0] else "",
                value=float(row[1])
            )
            for row in rows
        ]

    @staticmethod
    async def get_revenue_chart(
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[ChartDataPoint]:
        if not end_date:
            end_date = date.today()
        if not start_date:
            start_date = end_date - timedelta(days=180)

        # Cap to 24 months max for chart readability
        max_start = end_date - timedelta(days=730)
        if start_date < max_start:
            start_date = max_start
        start_date = date(start_date.year, start_date.month, 1)

        start_dt = datetime.combine(start_date, datetime.min.time())
        end_dt = datetime.combine(end_date, datetime.max.time())

        month_trunc = func.date_trunc("month", FinansIslem.tarih).label("month")
        res = await db.execute(
            select(month_trunc, func.sum(FinansIslem.net_tutar))
            .where(
                and_(
                    FinansIslem.tarih >= start_dt,
                    FinansIslem.tarih <= end_dt,
                    FinansIslem.islem_tipi == "gelir",
                    FinansIslem.is_deleted == False,
                    FinansIslem.durum != "iptal",
                )
            )
            .group_by(month_trunc)
            .order_by(month_trunc)
        )
        rows = res.all()

        return [
            ChartDataPoint(
                name=row[0].strftime("%b %y") if row[0] else "",
                value=float(row[1] or 0.0)
            )
            for row in rows
        ]

    @staticmethod
    async def get_operation_chart(
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[ChartDataPoint]:
        query = select(Operasyon.ameliyat, func.count(Operasyon.id)).where(Operasyon.is_deleted == False)

        if start_date:
            query = query.where(Operasyon.tarih >= datetime.combine(start_date, datetime.min.time()))
        if end_date:
            query = query.where(Operasyon.tarih <= datetime.combine(end_date, datetime.max.time()))

        query = (
            query.group_by(Operasyon.ameliyat)
            .order_by(desc(func.count(Operasyon.id)))
            .limit(5)
        )

        res = await db.execute(query)
        rows = res.all()
        data = []
        for name, count in rows:
            if name:
                data.append(ChartDataPoint(name=name, value=count))

        return data

    @staticmethod
    async def get_reference_stats(
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[ChartDataPoint]:
        query = (
            select(
                Hasta.referans,
                func.count(distinct(Hasta.id)),
            )
            .join(
                Muayene, Hasta.id == Muayene.hasta_id
            )
            .where(
                Hasta.referans.isnot(None),
                Hasta.referans != "",
            )
        )

        if start_date:
            query = query.where(Muayene.tarih >= datetime.combine(start_date, datetime.min.time()))
        if end_date:
            query = query.where(Muayene.tarih <= datetime.combine(end_date, datetime.max.time()))

        query = (
            query.group_by(Hasta.referans)
            .order_by(desc(func.count(distinct(Hasta.id))))
            .limit(15)
        )

        res = await db.execute(query)
        rows = res.all()
        return [ChartDataPoint(name=row[0], value=row[1]) for row in rows]

    @staticmethod
    async def get_reference_patients(
        db: AsyncSession,
        referans: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        query = (
            select(
                Hasta.id,
                Hasta.ad,
                Hasta.soyad,
            )
            .join(
                Muayene, Hasta.id == Muayene.hasta_id
            )
            .where(Hasta.referans == referans)
        )

        if start_date:
            query = query.where(Muayene.tarih >= datetime.combine(start_date, datetime.min.time()))
        if end_date:
            query = query.where(Muayene.tarih <= datetime.combine(end_date, datetime.max.time()))

        query = query.group_by(
            Hasta.id,
            Hasta.ad,
            Hasta.soyad,
        ).order_by(Hasta.ad, Hasta.soyad)

        res = await db.execute(query)
        rows = res.all()
        return [{"id": str(row[0]), "ad": row[1], "soyad": row[2]} for row in rows]

    @staticmethod
    async def get_cancellation_stats(
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[ChartDataPoint]:
        if not end_date:
            end_date = date.today()
        if not start_date:
            start_date = end_date - timedelta(days=90)

        start_dt = datetime.combine(start_date, datetime.min.time())
        end_dt = datetime.combine(end_date, datetime.max.time())

        query = (
            select(Randevu.cancel_reason, func.count(Randevu.id))
            .where(
                and_(
                    Randevu.start >= start_dt,
                    Randevu.start <= end_dt,
                    Randevu.status == "cancelled",
                )
            )
            .group_by(Randevu.cancel_reason)
        )

        res = await db.execute(query)
        rows = res.all()

        data = []
        for reason, count in rows:
            label = reason or "Belirtilmedi"
            data.append(ChartDataPoint(name=label, value=count))

        return sorted(data, key=lambda x: x.value, reverse=True)
