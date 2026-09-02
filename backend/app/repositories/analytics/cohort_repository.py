from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract, distinct, union_all
from datetime import date, timedelta, datetime
from typing import List, Dict, Any, Optional

from app.repositories.patient.models import Hasta
from app.repositories.clinical.models import Muayene, KlinikNot
from app.models.appointment import Randevu
from app.schemas.report import HeatmapData, CohortRow, ChartDataPoint


class CohortRepository:
    @staticmethod
    async def get_heatmap_data(
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[HeatmapData]:
        today = date.today()
        if not start_date:
            start_date = today - timedelta(days=90)
        if not end_date:
            end_date = today

        start_dt = datetime.combine(start_date, datetime.min.time())
        end_dt = datetime.combine(end_date, datetime.max.time())

        res = await db.execute(
            select(
                extract("dow", Randevu.start).label("day"),
                extract("hour", Randevu.start).label("hour"),
                func.count(Randevu.id).label("count"),
            )
            .where(
                and_(
                    Randevu.start >= start_dt,
                    Randevu.start <= end_dt,
                    Randevu.is_deleted == 0,
                    Randevu.type != "BLOCKED",
                )
            )
            .group_by("day", "hour")
        )
        rows = res.all()

        data = []
        for row in rows:
            pg_dow = int(row[0])
            our_dow = (pg_dow - 1) % 7 if pg_dow > 0 else 6
            data.append(HeatmapData(day=our_dow, hour=int(row[1]), value=int(row[2])))

        return data

    @staticmethod
    async def get_cohort_analysis(
        db: AsyncSession, months_back: int = 6
    ) -> List[CohortRow]:
        today = date.today()
        cohorts = []

        for i in range(months_back, -1, -1):
            year = today.year
            month = today.month - i
            while month <= 0:
                month += 12
                year -= 1
            cohort_start = date(year, month, 1)

            ny, nm = (year, month + 1) if month < 12 else (year + 1, 1)
            cohort_end = date(ny, nm, 1)

            first_exams = (
                select(
                    Muayene.hasta_id,
                    func.min(Muayene.tarih).label("first_date"),
                )
                .group_by(Muayene.hasta_id)
                .subquery()
            )

            res_cohort = await db.execute(
                select(first_exams.c.hasta_id).where(
                    and_(
                        first_exams.c.first_date >= cohort_start,
                        first_exams.c.first_date < cohort_end,
                    )
                )
            )
            cohort_patients = [row[0] for row in res_cohort.all()]
            total_patients = len(cohort_patients)

            if total_patients == 0:
                cohorts.append(
                    CohortRow(
                        cohort_month=cohort_start.strftime("%Y-%m"),
                        total_patients=0,
                        month_0=0, month_1=0, month_2=0, month_3=0,
                        month_4=0, month_5=0, month_6=0,
                    )
                )
                continue

            retention = [total_patients]
            for m in range(1, 7):
                check_year = year
                check_month = month + m
                while check_month > 12:
                    check_month -= 12
                    check_year += 1
                check_start = date(check_year, check_month, 1)
                cny, cnm = (
                    (check_year, check_month + 1)
                    if check_month < 12
                    else (check_year + 1, 1)
                )
                check_end = date(cny, cnm, 1)

                if check_start > today:
                    retention.append(0)
                    continue

                m_activity = select(
                    distinct(Muayene.hasta_id).label("hasta_id")
                ).where(
                    and_(
                        Muayene.hasta_id.in_(cohort_patients),
                        Muayene.tarih >= check_start,
                        Muayene.tarih < check_end,
                    )
                )
                n_activity = select(
                    distinct(KlinikNot.hasta_id).label("hasta_id")
                ).where(
                    and_(
                        KlinikNot.hasta_id.in_(cohort_patients),
                        KlinikNot.tarih >= check_start,
                        KlinikNot.tarih < check_end,
                    )
                )
                combined = union_all(m_activity, n_activity).subquery()

                res_active = await db.execute(
                    select(func.count(distinct(combined.c.hasta_id)))
                )
                active_count = res_active.scalar() or 0
                retention.append(active_count)

            cohorts.append(
                CohortRow(
                    cohort_month=cohort_start.strftime("%Y-%m"),
                    total_patients=total_patients,
                    month_0=retention[0],
                    month_1=retention[1],
                    month_2=retention[2],
                    month_3=retention[3],
                    month_4=retention[4],
                    month_5=retention[5],
                    month_6=retention[6],
                )
            )

        return cohorts

    @staticmethod
    async def get_weekly_new_patients(
        db: AsyncSession,
        start_date_filter: Optional[date] = None,
        end_date_filter: Optional[date] = None,
    ) -> List[ChartDataPoint]:
        if not end_date_filter:
            end_date_filter = date.today()
        if not start_date_filter:
            start_date_filter = end_date_filter - timedelta(weeks=8)

        # Cap to 52 weeks max; beyond that switch to monthly granularity
        max_weeks = 52
        days_diff = (end_date_filter - start_date_filter).days
        use_monthly = days_diff > max_weeks * 7

        if use_monthly:
            # Cap to 24 months for very wide ranges
            max_start = end_date_filter - timedelta(days=730)
            if start_date_filter < max_start:
                start_date_filter = max_start
            trunc_unit = "month"
            fmt = "%b '%y"
        else:
            trunc_unit = "week"
            fmt = "%d %b '%y"

        first_exams = (
            select(
                Muayene.hasta_id,
                func.min(Muayene.tarih).label("first_date"),
            )
            .group_by(Muayene.hasta_id)
            .subquery()
        )

        period_trunc = func.date_trunc(trunc_unit, first_exams.c.first_date).label("period")
        res = await db.execute(
            select(period_trunc, func.count(first_exams.c.hasta_id))
            .where(
                and_(
                    first_exams.c.first_date >= datetime.combine(start_date_filter, datetime.min.time()),
                    first_exams.c.first_date <= datetime.combine(end_date_filter, datetime.max.time()),
                )
            )
            .group_by(period_trunc)
            .order_by(period_trunc)
        )
        rows = res.all()

        return [
            ChartDataPoint(
                name=row[0].strftime(fmt) if row[0] else "",
                value=float(row[1])
            )
            for row in rows
        ]

    @staticmethod
    async def get_weekly_drilldown(
        db: AsyncSession, label: str
    ) -> List[Dict[str, Any]]:
        try:
            d = datetime.strptime(label, "%d %b '%y").date()
            start_date = d
            end_date = d + timedelta(days=7)
        except:
            return []

        first_exams = (
            select(
                Muayene.hasta_id,
                func.min(Muayene.tarih).label("first_date"),
            )
            .group_by(Muayene.hasta_id)
            .subquery()
        )

        query = (
            select(
                Hasta.id,
                Hasta.ad,
                Hasta.soyad,
            )
            .join(first_exams, Hasta.id == first_exams.c.hasta_id)
            .where(
                and_(
                    first_exams.c.first_date >= datetime.combine(start_date, datetime.min.time()),
                    first_exams.c.first_date < datetime.combine(end_date, datetime.min.time()),
                )
            )
        )

        res = await db.execute(query)
        rows = res.all()
        return [{"id": str(row[0]), "ad": row[1], "soyad": row[2]} for row in rows]

    @staticmethod
    async def get_monthly_drilldown(
        db: AsyncSession, label: str
    ) -> List[Dict[str, Any]]:
        try:
            try:
                d = datetime.strptime(label, "%b %y").date()
            except:
                d = datetime.strptime(label, "%b '%y").date()
            start_date = d
            ny, nm = (d.year, d.month + 1) if d.month < 12 else (d.year + 1, 1)
            end_date = date(ny, nm, 1)
        except:
            return []

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

        query = (
            select(
                Hasta.id,
                Hasta.ad,
                Hasta.soyad,
            )
            .join(
                latest_per_patient,
                Hasta.id == latest_per_patient.c.hasta_id,
            )
            .where(
                and_(
                    latest_per_patient.c.max_tarih >= datetime.combine(start_date, datetime.min.time()),
                    latest_per_patient.c.max_tarih < datetime.combine(end_date, datetime.min.time()),
                )
            )
        )

        res = await db.execute(query)
        rows = res.all()
        return [{"id": str(row[0]), "ad": row[1], "soyad": row[2]} for row in rows]
