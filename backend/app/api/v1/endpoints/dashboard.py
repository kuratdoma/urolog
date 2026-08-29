from typing import Any
from datetime import datetime, timedelta, date

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, case
from app.api import deps
from app.schemas.dashboard import DashboardData, DashboardSummary
from app.repositories.patient.models import Hasta
from app.models.appointment import Randevu, AppointmentStatus
from fastapi_cache.decorator import cache

router = APIRouter(
    # SEC-09: Router seviyesinde kimlik doğrulama
    dependencies=[Depends(deps.get_current_user)]
)

from app.api import deps
from app.models.user import User


@router.get("", response_model=DashboardData)
@cache(expire=60)
async def get_dashboard_data(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get aggregated dashboard data.
    """
    today = date.today()

    # --- 1. Date Ranges ---
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())

    # This Week (Monday start)
    weekday = today.weekday()
    week_start = datetime.combine(today - timedelta(days=weekday), datetime.min.time())

    # This Month
    month_start = datetime.combine(
        date(today.year, today.month, 1), datetime.min.time()
    )

    # Last Month
    last_month_val = today.month - 1 if today.month > 1 else 12
    last_month_year = today.year if today.month > 1 else today.year - 1
    last_month_start = datetime.combine(
        date(last_month_year, last_month_val, 1), datetime.min.time()
    )

    # --- 2. Consolidated Patient Queries ---
    import time

    time.time()
    stmt_patients = select(
        func.count(Hasta.id).label("total"),
        func.count(
            case(
                (
                    and_(
                        Hasta.created_at >= today_start,
                        Hasta.created_at <= today_end,
                        Hasta.is_deleted == False,
                    ),
                    1,
                )
            )
        ).label("today"),
        func.count(
            case((and_(Hasta.created_at >= week_start, Hasta.is_deleted == False), 1))
        ).label("week"),
        func.count(
            case((and_(Hasta.created_at >= month_start, Hasta.is_deleted == False), 1))
        ).label("month"),
        func.count(
            case(
                (
                    and_(
                        Hasta.created_at >= last_month_start,
                        Hasta.created_at < month_start,
                        Hasta.is_deleted == False,
                    ),
                    1,
                )
            )
        ).label("last_month"),
    )
    res_p = await db.execute(stmt_patients)
    p_stats = res_p.fetchone()

    total_patients = p_stats.total or 0
    count_this_month = p_stats.month or 0
    count_last_month = p_stats.last_month or 0

    growth_pct = 0.0
    trend = "neutral"
    if count_last_month > 0:
        growth_pct = ((count_this_month - count_last_month) / count_last_month) * 100
        if growth_pct > 0:
            trend = "up"
            growth_pct = round(growth_pct, 1)
        elif growth_pct < 0:
            trend = "down"
            growth_pct = round(abs(growth_pct), 1)
    elif count_this_month > 0:
        growth_pct = 100.0
        trend = "up"

    # --- 3. Occupancy & Appointment Stats ---
    time.time()
    TOTAL_SLOTS = 20
    stmt_appts = select(
        func.count(
            case(
                (
                    and_(
                        Randevu.start >= today_start,
                        Randevu.start <= today_end,
                        Randevu.status != AppointmentStatus.cancelled,
                        Randevu.type != "BLOCKED",
                        Randevu.is_deleted == 0,
                    ),
                    1,
                )
            )
        ).label("today_filled"),
        func.count(
            case(
                (
                    and_(
                        Randevu.start >= today_start,
                        Randevu.start <= today_end,
                        Randevu.status != AppointmentStatus.cancelled,
                        Randevu.type.ilike("%Muayene%"),
                        Randevu.type != "BLOCKED",
                        Randevu.is_deleted == 0,
                    ),
                    1,
                )
            )
        ).label("today_exam"),
        func.count(
            case(
                (
                    and_(
                        Randevu.start >= today_start,
                        Randevu.start <= today_end,
                        Randevu.status != AppointmentStatus.cancelled,
                        Randevu.type.ilike("%Kontrol%"),
                        Randevu.type != "BLOCKED",
                        Randevu.is_deleted == 0,
                    ),
                    1,
                )
            )
        ).label("today_control"),
        func.count(
            case((and_(Randevu.start >= today_start, Randevu.start <= today_end, Randevu.type != "BLOCKED", Randevu.is_deleted == 0), 1))
        ).label("today_total"),
        func.count(case((and_(Randevu.start >= week_start, Randevu.type != "BLOCKED", Randevu.is_deleted == 0), 1))).label("week_total"),
        func.count(case((and_(Randevu.start >= month_start, Randevu.type != "BLOCKED", Randevu.is_deleted == 0), 1))).label("month_total"),
        func.count(
            case(
                (
                    and_(
                        Randevu.start >= last_month_start, Randevu.start < month_start,
                        Randevu.type != "BLOCKED", Randevu.is_deleted == 0
                    ),
                    1,
                )
            )
        ).label("last_month_total"),
    )
    res_a = await db.execute(stmt_appts)
    a_stats = res_a.fetchone()

    filled_slots = a_stats.today_filled or 0
    exam_count = a_stats.today_exam or 0
    control_count = a_stats.today_control or 0

    if exam_count == 0 and control_count == 0 and filled_slots > 0:
        exam_count = filled_slots

    occupancy_rate = round((filled_slots / TOTAL_SLOTS) * 100) if TOTAL_SLOTS > 0 else 0

    heatmap_data = []  # Heatmap not used in frontend

    return DashboardData(
        summary=DashboardSummary(
            totalPatients={
                "value": total_patients,
                "growth": growth_pct,
                "trend": trend,
            },
            occupancy={
                "rate": occupancy_rate,
                "filled": filled_slots,
                "total": TOTAL_SLOTS,
                "breakdown": {"examination": exam_count, "control": control_count},
            },
            pendingLabs={"count": 0, "urgent": 0},
            statistics={
                "today_new_patients": p_stats.today or 0,
                "today_appointments": a_stats.today_total or 0,
                "week_new_patients": p_stats.week or 0,
                "week_appointments": a_stats.week_total or 0,
                "month_new_patients": p_stats.month or 0,
                "month_appointments": a_stats.month_total or 0,
                "last_month_new_patients": p_stats.last_month or 0,
                "last_month_appointments": a_stats.last_month_total or 0,
            },
        ),
        heatmap=heatmap_data,
        recentActivity=[],
    )
