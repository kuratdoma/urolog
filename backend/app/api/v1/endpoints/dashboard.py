from typing import Any
from datetime import datetime, timedelta, date

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, case, distinct
from app.api import deps
from app.schemas.dashboard import DashboardData, DashboardSummary
from app.repositories.patient.models import Hasta
from app.models.appointment import Randevu, AppointmentStatus
from app.repositories.clinical.models import Muayene, Operasyon
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

    # Yılbaşı (YTD)
    year_start = datetime.combine(date(today.year, 1, 1), datetime.min.time())

    # Geçen yılın aynı ayı — TAM AY. Kısmi gün aralığı kullanılmıyor: ayın 2'sinde
    # duran bir ayı geçen yılın tam ayıyla kıyaslamak ürün kararıdır.
    ly_month_start = datetime.combine(
        date(today.year - 1, today.month, 1), datetime.min.time()
    )
    if today.month == 12:
        ly_month_end = datetime.combine(date(today.year, 1, 1), datetime.min.time())
    else:
        ly_month_end = datetime.combine(
            date(today.year - 1, today.month + 1, 1), datetime.min.time()
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
        func.count(
            case((and_(Hasta.created_at >= year_start, Hasta.is_deleted == False), 1))
        ).label("ytd"),
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
        func.count(
            case(
                (
                    and_(
                        Randevu.start >= month_start,
                        Randevu.status != AppointmentStatus.cancelled,
                        Randevu.type.ilike("%Muayene%"),
                        Randevu.type != "BLOCKED",
                        Randevu.is_deleted == 0,
                    ),
                    1,
                )
            )
        ).label("month_exam"),
        func.count(
            case(
                (
                    and_(
                        Randevu.start >= month_start,
                        Randevu.status != AppointmentStatus.cancelled,
                        Randevu.type.ilike("%Kontrol%"),
                        Randevu.type != "BLOCKED",
                        Randevu.is_deleted == 0,
                    ),
                    1,
                )
            )
        ).label("month_control"),
    )
    res_a = await db.execute(stmt_appts)
    a_stats = res_a.fetchone()

    filled_slots = a_stats.today_filled or 0
    exam_count = a_stats.today_exam or 0
    control_count = a_stats.today_control or 0

    if exam_count == 0 and control_count == 0 and filled_slots > 0:
        exam_count = filled_slots

    occupancy_rate = round((filled_slots / TOTAL_SLOTS) * 100) if TOTAL_SLOTS > 0 else 0

    # --- 4. Muayene Sayımları (muayeneler) ---
    # Silinmişler Boolean bayrakla eleniyor; randevudaki Integer is_deleted ile
    # karıştırılmamalı.
    stmt_exams = select(
        func.count(
            case((and_(Muayene.tarih >= month_start, Muayene.is_deleted == False), 1))
        ).label("month"),
        func.count(
            case(
                (
                    and_(
                        Muayene.tarih >= last_month_start,
                        Muayene.tarih < month_start,
                        Muayene.is_deleted == False,
                    ),
                    1,
                )
            )
        ).label("last_month"),
        func.count(
            case(
                (
                    and_(
                        Muayene.tarih >= ly_month_start,
                        Muayene.tarih < ly_month_end,
                        Muayene.is_deleted == False,
                    ),
                    1,
                )
            )
        ).label("last_year_month"),
        func.count(
            case((and_(Muayene.tarih >= year_start, Muayene.is_deleted == False), 1))
        ).label("ytd"),
        # Ortalamanın PAYDASI: muayene YAPILAN ayrı gün sayısı. Takvim günü kullanılsaydı
        # hafta sonu ve izin günleri ortalamayı yapay olarak düşürürdü.
        func.count(
            distinct(
                case(
                    (
                        and_(Muayene.tarih >= month_start, Muayene.is_deleted == False),
                        func.date(Muayene.tarih),
                    )
                )
            )
        ).label("month_days"),
    )
    res_e = await db.execute(stmt_exams)
    e_stats = res_e.fetchone()

    month_exams = e_stats.month or 0
    month_days = e_stats.month_days or 0
    daily_avg = round(month_exams / month_days, 1) if month_days > 0 else 0.0

    # --- 5. Operasyon (YTD) ---
    # Ayrı tablo, ayrı select: aynı select'e konsaydı muayenelerle cross join olurdu.
    stmt_ops = select(
        func.count(
            case((and_(Operasyon.tarih >= year_start, Operasyon.is_deleted == False), 1))
        ).label("ytd")
    )
    res_o = await db.execute(stmt_ops)
    o_stats = res_o.fetchone()

    # --- 6. Bu Ayın En Sık 5 Tanısı ---
    # tani1 serbest metin: "BPH", "bph", "BPH " aynı tanıdır. Normalize edilmiş anahtarla
    # gruplanır, etiket olarak grubun bir örneği gösterilir.
    dx_key = func.lower(func.trim(Muayene.tani1))
    stmt_top_dx = (
        select(
            func.min(func.trim(Muayene.tani1)).label("name"),
            # Etiket "count" değil: PostgreSQL'de ORDER BY count ifadesi fonksiyon adıyla
            # karışabilir; ayrım net kalsın diye dahili ad ayrı tutuluyor.
            func.count(Muayene.id).label("dx_count"),
        )
        .where(
            Muayene.tarih >= month_start,
            Muayene.is_deleted == False,
            Muayene.tani1.isnot(None),
            func.trim(Muayene.tani1) != "",
        )
        .group_by(dx_key)
        .order_by(desc("dx_count"))
        .limit(5)
    )
    res_dx = await db.execute(stmt_top_dx)
    top_dx = [{"name": r.name, "count": r.dx_count} for r in res_dx.fetchall()]

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
            topDiagnoses=top_dx,
            statistics={
                "today_new_patients": p_stats.today or 0,
                "today_appointments": a_stats.today_total or 0,
                "week_new_patients": p_stats.week or 0,
                "week_appointments": a_stats.week_total or 0,
                "month_new_patients": p_stats.month or 0,
                "month_appointments": a_stats.month_total or 0,
                "last_month_new_patients": p_stats.last_month or 0,
                "last_month_appointments": a_stats.last_month_total or 0,
                "month_examinations": month_exams,
                "last_month_examinations": e_stats.last_month or 0,
                "last_year_month_examinations": e_stats.last_year_month or 0,
                "month_examination_daily_avg": daily_avg,
                "month_exam_appointments": a_stats.month_exam or 0,
                "month_control_appointments": a_stats.month_control or 0,
                "ytd_new_patients": p_stats.ytd or 0,
                "ytd_examinations": e_stats.ytd or 0,
                "ytd_operations": o_stats.ytd or 0,
            },
        ),
        heatmap=heatmap_data,
        recentActivity=[],
    )
