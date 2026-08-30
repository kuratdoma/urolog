"""
Kişisel not hatırlatmaları için saf (pure) tekrar hesaplama motoru.

Bu modül `datetime.now()` çağırmaz ve DB'ye dokunmaz — "şu an" daima `after`
parametresiyle enjekte edilir. Bu sayede recurrence mantığı freezegun/time-machine
gerektirmeden, sabit tarihlerle deterministik test edilebilir.

Ayın 31'i gibi kısa aylarda karşılığı olmayan günler için kural: hedef ayda o gün
yoksa ayın son gününe kırpılır (ör. 31 Ocak -> 28/29 Şubat), ama bir sonraki
hesaplama yine orijinal gün numarasından (31) yapılır — bu yüzden Mart'ta tekrar
31'e döner.
"""
from datetime import datetime, date, time, timedelta
from typing import Optional
import calendar

from app.models.personal_note import RecurrenceType

MAX_MONTHLY_ITERATIONS = 1200  # ~100 yıl, runaway loop'a karşı savunma sınırı


def compute_next_occurrence(
    *,
    recurrence_type: RecurrenceType,
    interval: int,
    time_of_day: time,
    starts_at: datetime,
    ends_at: Optional[datetime],
    after: datetime,
) -> Optional[datetime]:
    """
    `after`'dan sonraki (dahil değil, kesin sonrası) ilk tetiklenme anını döner.
    Kural artık geçerli değilse (ends_at aşıldıysa veya 'once' zaten geçtiyse) None döner.
    """
    if interval < 1:
        raise ValueError("interval >= 1 olmalı")

    first = _combine(starts_at.date(), time_of_day, starts_at.tzinfo)

    if recurrence_type == RecurrenceType.once:
        if first <= after:
            return None
        return _clamp_end(first, ends_at)

    if recurrence_type == RecurrenceType.daily:
        candidate = _next_by_fixed_step(first, timedelta(days=interval), after)
        return _clamp_end(candidate, ends_at)

    if recurrence_type == RecurrenceType.weekly:
        candidate = _next_by_fixed_step(first, timedelta(weeks=interval), after)
        return _clamp_end(candidate, ends_at)

    if recurrence_type == RecurrenceType.monthly:
        candidate = _next_monthly(starts_at.date(), time_of_day, starts_at.tzinfo, interval, after)
        return _clamp_end(candidate, ends_at)

    raise ValueError(f"Desteklenmeyen recurrence_type: {recurrence_type}")


def _combine(d: date, t: time, tzinfo) -> datetime:
    return datetime(d.year, d.month, d.day, t.hour, t.minute, t.second, tzinfo=tzinfo)


def _clamp_end(candidate: Optional[datetime], ends_at: Optional[datetime]) -> Optional[datetime]:
    if candidate is None:
        return None
    if ends_at is not None and candidate > ends_at:
        return None
    return candidate


def _next_by_fixed_step(first: datetime, step: timedelta, after: datetime) -> datetime:
    """Sabit adımlı (gün/hafta) tekrarlar için O(1) hesap — `first + n*step` formunda."""
    delta = after - first
    if delta < timedelta(0):
        return first
    n = delta // step
    candidate = first + step * (n + 1)
    return candidate


def _next_monthly(
    base_date: date, time_of_day: time, tzinfo, interval: int, after: datetime
) -> Optional[datetime]:
    original_day = base_date.day
    candidate = _combine(base_date, time_of_day, tzinfo)
    if candidate > after:
        return candidate

    for step in range(1, MAX_MONTHLY_ITERATIONS + 1):
        total_month_index = (base_date.month - 1) + step * interval
        year = base_date.year + total_month_index // 12
        month = total_month_index % 12 + 1
        day = min(original_day, calendar.monthrange(year, month)[1])
        candidate = _combine(date(year, month, day), time_of_day, tzinfo)
        if candidate > after:
            return candidate

    return None
