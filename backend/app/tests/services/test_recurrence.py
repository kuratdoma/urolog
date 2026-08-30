from datetime import datetime, time, timezone

import pytest

from app.models.personal_note import RecurrenceType
from app.services.recurrence import compute_next_occurrence


UTC = timezone.utc


def dt(y, m, d, h=9, mi=0):
    return datetime(y, m, d, h, mi, tzinfo=UTC)


def test_once_before_start_returns_start():
    result = compute_next_occurrence(
        recurrence_type=RecurrenceType.once,
        interval=1,
        time_of_day=time(9, 0),
        starts_at=dt(2026, 3, 10),
        ends_at=None,
        after=dt(2026, 3, 1),
    )
    assert result == dt(2026, 3, 10)


def test_once_after_start_returns_none():
    result = compute_next_occurrence(
        recurrence_type=RecurrenceType.once,
        interval=1,
        time_of_day=time(9, 0),
        starts_at=dt(2026, 3, 10),
        ends_at=None,
        after=dt(2026, 3, 10),
    )
    assert result is None


def test_daily_next_day():
    result = compute_next_occurrence(
        recurrence_type=RecurrenceType.daily,
        interval=1,
        time_of_day=time(9, 0),
        starts_at=dt(2026, 3, 10),
        ends_at=None,
        after=dt(2026, 3, 10, 9, 0),
    )
    assert result == dt(2026, 3, 11)


def test_daily_interval_skips_ahead_from_stale_state():
    # 5 gün worker down kaldıysa, bir sonraki tetikleme "after"'dan hemen sonraki
    # geçerli slotu bulmalı, aradaki tüm günleri tek tek üretmemeli.
    result = compute_next_occurrence(
        recurrence_type=RecurrenceType.daily,
        interval=2,
        time_of_day=time(9, 0),
        starts_at=dt(2026, 3, 1),
        ends_at=None,
        after=dt(2026, 3, 8, 12, 0),
    )
    assert result == dt(2026, 3, 9)


def test_weekly_next_week():
    result = compute_next_occurrence(
        recurrence_type=RecurrenceType.weekly,
        interval=1,
        time_of_day=time(9, 0),
        starts_at=dt(2026, 3, 2),  # Pazartesi
        ends_at=None,
        after=dt(2026, 3, 2, 9, 0),
    )
    assert result == dt(2026, 3, 9)


def test_weekly_interval_two():
    result = compute_next_occurrence(
        recurrence_type=RecurrenceType.weekly,
        interval=2,
        time_of_day=time(9, 0),
        starts_at=dt(2026, 3, 2),
        ends_at=None,
        after=dt(2026, 3, 2, 9, 0),
    )
    assert result == dt(2026, 3, 16)


def test_monthly_regular_day():
    result = compute_next_occurrence(
        recurrence_type=RecurrenceType.monthly,
        interval=1,
        time_of_day=time(9, 0),
        starts_at=dt(2026, 1, 15),
        ends_at=None,
        after=dt(2026, 1, 15, 9, 0),
    )
    assert result == dt(2026, 2, 15)


def test_monthly_31st_clamps_to_february_then_returns_to_31_in_march():
    starts_at = dt(2026, 1, 31)

    feb_occurrence = compute_next_occurrence(
        recurrence_type=RecurrenceType.monthly,
        interval=1,
        time_of_day=time(9, 0),
        starts_at=starts_at,
        ends_at=None,
        after=dt(2026, 1, 31, 9, 0),
    )
    # 2026 artık yıl değil -> Şubat 28 gün
    assert feb_occurrence == dt(2026, 2, 28)

    march_occurrence = compute_next_occurrence(
        recurrence_type=RecurrenceType.monthly,
        interval=1,
        time_of_day=time(9, 0),
        starts_at=starts_at,
        ends_at=None,
        after=feb_occurrence,
    )
    assert march_occurrence == dt(2026, 3, 31)


def test_monthly_31st_leap_year_february_29():
    starts_at = dt(2028, 1, 31)  # 2028 artık yıl

    feb_occurrence = compute_next_occurrence(
        recurrence_type=RecurrenceType.monthly,
        interval=1,
        time_of_day=time(9, 0),
        starts_at=starts_at,
        ends_at=None,
        after=dt(2028, 1, 31, 9, 0),
    )
    assert feb_occurrence == dt(2028, 2, 29)


def test_monthly_30th_clamps_in_february():
    starts_at = dt(2026, 1, 30)
    result = compute_next_occurrence(
        recurrence_type=RecurrenceType.monthly,
        interval=1,
        time_of_day=time(9, 0),
        starts_at=starts_at,
        ends_at=None,
        after=dt(2026, 1, 30, 9, 0),
    )
    assert result == dt(2026, 2, 28)


def test_monthly_interval_two():
    result = compute_next_occurrence(
        recurrence_type=RecurrenceType.monthly,
        interval=2,
        time_of_day=time(9, 0),
        starts_at=dt(2026, 1, 15),
        ends_at=None,
        after=dt(2026, 1, 15, 9, 0),
    )
    assert result == dt(2026, 3, 15)


def test_ends_at_boundary_returns_none():
    result = compute_next_occurrence(
        recurrence_type=RecurrenceType.daily,
        interval=1,
        time_of_day=time(9, 0),
        starts_at=dt(2026, 3, 1),
        ends_at=dt(2026, 3, 2, 9, 0),
        after=dt(2026, 3, 2, 9, 0),
    )
    assert result is None


def test_ends_at_allows_last_valid_occurrence():
    result = compute_next_occurrence(
        recurrence_type=RecurrenceType.daily,
        interval=1,
        time_of_day=time(9, 0),
        starts_at=dt(2026, 3, 1),
        ends_at=dt(2026, 3, 2, 9, 0),
        after=dt(2026, 3, 1, 9, 0),
    )
    assert result == dt(2026, 3, 2)


def test_invalid_interval_raises():
    with pytest.raises(ValueError):
        compute_next_occurrence(
            recurrence_type=RecurrenceType.daily,
            interval=0,
            time_of_day=time(9, 0),
            starts_at=dt(2026, 3, 1),
            ends_at=None,
            after=dt(2026, 3, 1),
        )
