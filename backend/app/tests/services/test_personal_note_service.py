"""
PersonalNoteService karar mantığı testleri.

Proje genelinde gerçek DB'ye bağlanan test yoktur (bkz. test_repository_transactions.py) —
bu dosya da aynı konvansiyonu izler: AsyncSession yerine sahte bir repository (AsyncMock)
enjekte edilir, servis sadece kendi iş kurallarına göre test edilir. Repository'nin
SQL WHERE koşulları (user_id scope, unique constraint) migration + kod incelemesiyle
doğrulanmıştır; bu testler servisin repository'yi *doğru çağırdığını* kanıtlar.
"""
import asyncio
from datetime import datetime, time, timezone
from unittest.mock import AsyncMock, MagicMock

from app.models.personal_note import (
    NoteReminderOccurrence,
    PersonalNote,
    RecurrenceType,
    ReminderOccurrenceStatus,
)
from app.models.user import User
from app.core.permissions import UserRole
from app.services.personal_note_service import CATCH_UP_WINDOW, PersonalNoteService

UTC = timezone.utc


def _service_with_mock_repo() -> tuple[PersonalNoteService, MagicMock]:
    service = PersonalNoteService.__new__(PersonalNoteService)
    service.db = MagicMock()
    service.db.flush = AsyncMock()
    service.db.refresh = AsyncMock()
    service.repo = MagicMock()
    service.repo.list_notes = AsyncMock(return_value=[])
    service.repo.get_last_occurrence = AsyncMock(return_value=None)
    service.repo.bulk_insert_occurrences = AsyncMock()
    service.repo.mark_stale_as_missed = AsyncMock(return_value=0)
    service.repo.list_active_occurrences = AsyncMock(return_value=[])
    service.repo.get_note = AsyncMock(return_value=None)
    service.repo.get_occurrence = AsyncMock(return_value=None)
    return service, service.repo


def _user(is_active=True, user_id=1) -> User:
    return User(id=user_id, username="dr_test", is_active=is_active, role=UserRole.DOCTOR)


def test_materialize_due_skips_deactivated_user():
    service, repo = _service_with_mock_repo()
    user = _user(is_active=False)

    asyncio.run(service.materialize_due(user, datetime(2026, 3, 10, tzinfo=UTC)))

    repo.list_notes.assert_not_called()
    repo.bulk_insert_occurrences.assert_not_called()


def test_materialize_due_generates_pending_occurrence_for_active_user():
    service, repo = _service_with_mock_repo()
    user = _user(is_active=True)
    note = PersonalNote(
        id=5,
        user_id=1,
        title="Reçete yenile",
        recurrence_type=RecurrenceType.once,
        interval=1,
        time_of_day=time(9, 0),
        starts_at=datetime(2026, 3, 10, 9, 0, tzinfo=UTC),
        ends_at=None,
        is_done=False,
    )
    repo.list_notes = AsyncMock(return_value=[note])

    asyncio.run(service.materialize_due(user, datetime(2026, 3, 10, 12, 0, tzinfo=UTC)))

    repo.bulk_insert_occurrences.assert_awaited_once()
    inserted_rows = repo.bulk_insert_occurrences.call_args.args[0]
    assert len(inserted_rows) == 1
    assert inserted_rows[0]["note_id"] == 5
    assert inserted_rows[0]["scheduled_for"] == datetime(2026, 3, 10, 9, 0, tzinfo=UTC)
    assert inserted_rows[0]["status"] == ReminderOccurrenceStatus.pending


def test_get_due_reminders_uses_48_hour_catch_up_window():
    service, repo = _service_with_mock_repo()
    user = _user()
    now = datetime(2026, 3, 10, 12, 0, tzinfo=UTC)

    asyncio.run(service.get_due_reminders(user, now))

    repo.mark_stale_as_missed.assert_awaited_once_with(user.id, now - CATCH_UP_WINDOW)
    repo.list_active_occurrences.assert_awaited_once_with(user.id, now - CATCH_UP_WINDOW, now)


def test_get_due_reminders_marks_pending_as_fired_and_reports_missed_count():
    service, repo = _service_with_mock_repo()
    user = _user()
    now = datetime(2026, 3, 10, 12, 0, tzinfo=UTC)

    occurrence = NoteReminderOccurrence(
        id=1, note_id=5, scheduled_for=now, status=ReminderOccurrenceStatus.pending
    )
    repo.list_active_occurrences = AsyncMock(return_value=[occurrence])
    repo.mark_stale_as_missed = AsyncMock(return_value=3)

    result = asyncio.run(service.get_due_reminders(user, now))

    assert occurrence.status == ReminderOccurrenceStatus.fired
    assert occurrence.fired_at == now
    assert result["missed_count"] == 3
    assert result["due"] == [occurrence]


def test_acknowledge_marks_once_note_as_done():
    service, repo = _service_with_mock_repo()
    user = _user()
    now = datetime(2026, 3, 10, 12, 0, tzinfo=UTC)

    occurrence = NoteReminderOccurrence(id=1, note_id=5, status=ReminderOccurrenceStatus.pending)
    note = PersonalNote(id=5, recurrence_type=RecurrenceType.once, is_done=False)
    repo.get_occurrence = AsyncMock(return_value=occurrence)
    repo.get_note = AsyncMock(return_value=note)

    result = asyncio.run(service.acknowledge(user, 1, now))

    assert result is occurrence
    assert occurrence.status == ReminderOccurrenceStatus.acknowledged
    assert occurrence.acknowledged_at == now
    assert note.is_done is True


def test_acknowledge_does_not_mark_recurring_note_as_done():
    service, repo = _service_with_mock_repo()
    user = _user()
    now = datetime(2026, 3, 10, 12, 0, tzinfo=UTC)

    occurrence = NoteReminderOccurrence(id=1, note_id=5, status=ReminderOccurrenceStatus.pending)
    note = PersonalNote(id=5, recurrence_type=RecurrenceType.daily, is_done=False)
    repo.get_occurrence = AsyncMock(return_value=occurrence)
    repo.get_note = AsyncMock(return_value=note)

    asyncio.run(service.acknowledge(user, 1, now))

    assert note.is_done is False


def test_acknowledge_returns_none_for_missing_occurrence():
    service, repo = _service_with_mock_repo()
    user = _user()

    result = asyncio.run(service.acknowledge(user, 999, datetime(2026, 3, 10, tzinfo=UTC)))

    assert result is None


def test_snooze_creates_new_pending_occurrence_at_fixed_datetime():
    service, repo = _service_with_mock_repo()
    user = _user()
    occurrence = NoteReminderOccurrence(id=1, note_id=5, status=ReminderOccurrenceStatus.pending)
    repo.get_occurrence = AsyncMock(return_value=occurrence)
    new_datetime = datetime(2026, 3, 15, 14, 0, tzinfo=UTC)

    result = asyncio.run(service.snooze(user, 1, new_datetime))

    assert result is occurrence
    assert occurrence.status == ReminderOccurrenceStatus.snoozed
    assert occurrence.snoozed_to == new_datetime
    repo.bulk_insert_occurrences.assert_awaited_once_with(
        [{"note_id": 5, "scheduled_for": new_datetime, "status": ReminderOccurrenceStatus.pending}]
    )


def test_update_note_refreshes_object_after_flush():
    # Regression: server-computed `updated_at` (onupdate=func.now()) is expired
    # after flush() in async SQLAlchemy — serializing it without an explicit
    # refresh() raises MissingGreenlet at the API boundary (found via live QA).
    service, repo = _service_with_mock_repo()
    user = _user()
    note = PersonalNote(id=5, user_id=1, title="Eski başlık")
    repo.get_note = AsyncMock(return_value=note)

    result = asyncio.run(_update_with_mocked_audit(service, user, 5, {"title": "Yeni başlık"}))

    assert result is note
    assert note.title == "Yeni başlık"
    service.db.refresh.assert_awaited_once_with(note)


def test_update_note_returns_none_for_missing_note():
    service, repo = _service_with_mock_repo()
    user = _user()

    result = asyncio.run(_update_with_mocked_audit(service, user, 999, {"title": "x"}))

    assert result is None
    service.db.refresh.assert_not_awaited()


async def _update_with_mocked_audit(service, user, note_id, data):
    from unittest.mock import patch

    with patch("app.services.personal_note_service.AuditService.log", new=AsyncMock()):
        return await service.update_note(user, note_id, data)


def test_delete_note_soft_deletes_and_stops_future_generation():
    service, repo = _service_with_mock_repo()
    user = _user()
    note = PersonalNote(id=5, user_id=1, is_deleted=False)
    repo.get_note = AsyncMock(return_value=note)
    repo.soft_delete_note = AsyncMock()
    now = datetime(2026, 3, 10, tzinfo=UTC)

    result = asyncio.run(_delete_with_mocked_audit(service, user, now))

    repo.soft_delete_note.assert_awaited_once_with(note, now)
    assert result is True


async def _delete_with_mocked_audit(service, user, now):
    from unittest.mock import patch

    with patch("app.services.personal_note_service.AuditService.log", new=AsyncMock()):
        return await service.delete_note(user, 5, now)
