from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, distinct
from datetime import date, timedelta, datetime
from typing import Optional

from app.repositories.patient.models import Hasta
from app.repositories.clinical.models import Operasyon, Muayene
from app.repositories.finance.models import FinansIslem
from app.models.appointment import Randevu
from app.schemas.report import DashboardKPI, PerformanceKPI


class KPIRepository:
    @staticmethod
    async def get_kpis(
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> DashboardKPI:
        today = date.today()
        if not start_date:
            start_date = date(today.year, today.month, 1)
        if not end_date:
            end_date = today

        # 1. Total Patients (Always Global)
        res_total = await db.execute(select(func.count(Hasta.id)).where(Hasta.is_deleted == False))
        total_patients = res_total.scalar() or 0

        # 2. New Patients In Period
        res_new = await db.execute(
            select(func.count(Hasta.id)).where(
                and_(
                    Hasta.created_at
                    >= datetime.combine(start_date, datetime.min.time()),
                    Hasta.created_at
                    <= datetime.combine(end_date, datetime.max.time()),
                    Hasta.is_deleted == False,
                )
            )
        )
        new_patients = res_new.scalar() or 0

        # 3. Operations In Period
        res_ops = await db.execute(
            select(func.count(Operasyon.id)).where(
                and_(
                    Operasyon.tarih >= datetime.combine(start_date, datetime.min.time()),
                    Operasyon.tarih <= datetime.combine(end_date, datetime.max.time()),
                    Operasyon.is_deleted == False,
                )
            )
        )
        ops_count = res_ops.scalar() or 0

        # 4. Revenue In Period
        res_rev_curr = await db.execute(
            select(func.sum(FinansIslem.net_tutar)).where(
                and_(
                    FinansIslem.tarih
                    >= datetime.combine(start_date, datetime.min.time()),
                    FinansIslem.tarih
                    <= datetime.combine(end_date, datetime.max.time()),
                    FinansIslem.islem_tipi == "gelir",
                    FinansIslem.is_deleted == False,
                    FinansIslem.durum != "iptal",
                )
            )
        )
        revenue_current = res_rev_curr.scalar() or 0.0

        # Calculate Previous Period for Change
        period_duration = (end_date - start_date).days + 1
        prev_end = start_date - timedelta(days=1)
        prev_start = prev_end - timedelta(days=period_duration - 1)

        res_rev_prev = await db.execute(
            select(func.sum(FinansIslem.net_tutar)).where(
                and_(
                    FinansIslem.tarih
                    >= datetime.combine(prev_start, datetime.min.time()),
                    FinansIslem.tarih
                    <= datetime.combine(prev_end, datetime.max.time()),
                    FinansIslem.islem_tipi == "gelir",
                    FinansIslem.is_deleted == False,
                    FinansIslem.durum != "iptal",
                )
            )
        )
        revenue_prev = res_rev_prev.scalar() or 0.0

        rev_change = 0.0
        if revenue_prev > 0:
            rev_change = (
                (float(revenue_current) - float(revenue_prev)) / float(revenue_prev)
            ) * 100

        return DashboardKPI(
            total_patients=total_patients,
            new_patients_month=new_patients,
            total_operations_month=ops_count,
            monthly_revenue=float(revenue_current),
            monthly_revenue_change=round(rev_change, 1),
        )

    @staticmethod
    async def get_performance_kpis(
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> PerformanceKPI:
        today = date.today()
        if not start_date:
            start_date = date(today.year, today.month, 1)
        if not end_date:
            end_date = today

        start_dt = datetime.combine(start_date, datetime.min.time())
        end_dt = datetime.combine(end_date, datetime.max.time())

        # 1. Randevu Sadakat Oranı (Appointment Loyalty)
        res_total_appts = await db.execute(
            select(func.count(Randevu.id)).where(
                and_(
                    Randevu.start >= start_dt,
                    Randevu.start <= end_dt,
                    Randevu.is_deleted == 0,
                    Randevu.type != "BLOCKED",
                )
            )
        )
        total_appointments = res_total_appts.scalar() or 0

        res_completed = await db.execute(
            select(func.count(Randevu.id)).where(
                and_(
                    Randevu.start >= start_dt,
                    Randevu.start <= end_dt,
                    Randevu.is_deleted == 0,
                    Randevu.status == "completed",
                )
            )
        )
        completed_appointments = res_completed.scalar() or 0

        res_noshow = await db.execute(
            select(func.count(Randevu.id)).where(
                and_(
                    Randevu.start >= start_dt,
                    Randevu.start <= end_dt,
                    Randevu.is_deleted == 0,
                    or_(Randevu.status == "cancelled", Randevu.status == "unreachable"),
                )
            )
        )
        no_show_appointments = res_noshow.scalar() or 0

        appointment_loyalty_rate = (
            (completed_appointments / total_appointments * 100)
            if total_appointments > 0
            else 0.0
        )

        # 2. İşlem Yoğunluğu (Procedure Intensity)
        res_exam_count = await db.execute(
            select(func.count(Muayene.id)).where(
                and_(
                    Muayene.tarih >= start_dt, Muayene.tarih <= end_dt
                )
            )
        )
        exam_count = res_exam_count.scalar() or 0

        res_procedure_count = await db.execute(
            select(func.count(Operasyon.id)).where(
                and_(
                    Operasyon.tarih >= start_dt,
                    Operasyon.tarih <= end_dt,
                )
            )
        )
        procedure_count = res_procedure_count.scalar() or 0

        total_activity = exam_count + procedure_count
        procedure_ratio = (
            (procedure_count / total_activity * 100) if total_activity > 0 else 0.0
        )

        # 3. Hasta Başına Ortalama Değer
        res_revenue = await db.execute(
            select(func.sum(FinansIslem.net_tutar)).where(
                and_(
                    FinansIslem.tarih >= start_dt,
                    FinansIslem.tarih <= end_dt,
                    FinansIslem.islem_tipi == "gelir",
                    FinansIslem.is_deleted == False,
                    FinansIslem.durum != "iptal",
                )
            )
        )
        total_revenue = res_revenue.scalar() or 0.0

        res_unique_patients = await db.execute(
            select(func.count(distinct(FinansIslem.hasta_id))).where(
                and_(
                    FinansIslem.tarih >= start_dt,
                    FinansIslem.tarih <= end_dt,
                    FinansIslem.islem_tipi == "gelir",
                    FinansIslem.is_deleted == False,
                    FinansIslem.durum != "iptal",
                )
            )
        )
        unique_patients = res_unique_patients.scalar() or 0
        avg_revenue_per_patient = (
            (float(total_revenue) / unique_patients) if unique_patients > 0 else 0.0
        )

        # 4. Geri Dönüş Oranı (Return Rate)
        first_exams = (
            select(
                Muayene.hasta_id,
                func.min(Muayene.tarih).label("first_date"),
            )
            .group_by(Muayene.hasta_id)
            .subquery()
        )

        res_first_time = await db.execute(
            select(func.count(first_exams.c.hasta_id)).where(
                and_(
                    first_exams.c.first_date >= start_dt,
                    first_exams.c.first_date <= end_dt,
                )
            )
        )
        first_time_patients = res_first_time.scalar() or 0

        exam_counts = (
            select(
                Muayene.hasta_id,
                func.count(Muayene.id).label("exam_count"),
            )
            .where(
                and_(
                    Muayene.tarih >= start_dt, Muayene.tarih <= end_dt
                )
            )
            .group_by(Muayene.hasta_id)
            .subquery()
        )

        res_returning = await db.execute(
            select(func.count(exam_counts.c.hasta_id)).where(
                exam_counts.c.exam_count > 1
            )
        )
        returning_patients = res_returning.scalar() or 0

        total_patients_with_exams = first_time_patients + returning_patients
        return_rate = (
            (returning_patients / total_patients_with_exams * 100)
            if total_patients_with_exams > 0
            else 0.0
        )

        return PerformanceKPI(
            appointment_loyalty_rate=round(appointment_loyalty_rate, 1),
            total_appointments=total_appointments,
            completed_appointments=completed_appointments,
            no_show_appointments=no_show_appointments,
            exam_count=exam_count,
            procedure_count=procedure_count,
            procedure_ratio=round(procedure_ratio, 1),
            avg_revenue_per_patient=round(avg_revenue_per_patient, 2),
            return_rate=round(return_rate, 1),
            returning_patients=returning_patients,
            first_time_patients=first_time_patients,
        )
