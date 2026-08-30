from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.personal_note import (
    NoteReminderOccurrence,
    PersonalNote,
    RecurrenceType,
    ReminderOccurrenceStatus,
)
from app.models.user import User
from app.repositories.personal_note_repository import PersonalNoteRepository
from app.services.audit_service import AuditService
from app.services.recurrence import compute_next_occurrence

CATCH_UP_WINDOW = timedelta(hours=48)
MAX_OCCURRENCES_PER_NOTE_PER_CALL = 200  # runaway materialization'a karşı savunma sınırı


class PersonalNoteService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = PersonalNoteRepository(db)

    async def list_notes(
        self, user_id: int, include_done: bool = True, sort_by: str = "due_date"
    ) -> List[PersonalNote]:
        return await self.repo.list_notes(user_id, include_done=include_done, sort_by=sort_by)

    async def create_note(self, user: User, data: dict) -> PersonalNote:
        note = PersonalNote(user_id=user.id, **data)
        note = await self.repo.create_note(note)
        await AuditService.log(
            self.db, action="PERSONAL_NOTE_CREATE", user_id=user.id,
            resource_type="personal_note", resource_id=str(note.id),
        )
        return note

    async def update_note(self, user: User, note_id: int, data: dict) -> Optional[PersonalNote]:
        note = await self.repo.get_note(note_id, user.id)
        if not note:
            return None
        for key, value in data.items():
            setattr(note, key, value)
        await self.db.flush()
        await self.db.refresh(note)
        await AuditService.log(
            self.db, action="PERSONAL_NOTE_UPDATE", user_id=user.id,
            resource_type="personal_note", resource_id=str(note.id),
        )
        return note

    async def delete_note(self, user: User, note_id: int, now: datetime) -> bool:
        note = await self.repo.get_note(note_id, user.id)
        if not note:
            return False
        await self.repo.soft_delete_note(note, now)
        await AuditService.log(
            self.db, action="PERSONAL_NOTE_DELETE", user_id=user.id,
            resource_type="personal_note", resource_id=str(note.id),
        )
        return True

    async def materialize_due(self, user: User, now: datetime) -> None:
        """Vadesi gelmiş ama satırı henüz olmayan occurrence'ları tek transaction'da üretir.
        Deaktif kullanıcı için hiçbir şey üretmez — is_active kontrolü scheduler'dan bağımsız burada da yapılır."""
        if not user.is_active:
            return

        notes = await self.repo.list_notes(user.id, include_done=False)
        rows_to_insert = []

        for note in notes:
            last_occurrence = await self.repo.get_last_occurrence(note.id)
            cursor = last_occurrence.scheduled_for if last_occurrence else (note.starts_at - timedelta(seconds=1))

            for _ in range(MAX_OCCURRENCES_PER_NOTE_PER_CALL):
                next_at = compute_next_occurrence(
                    recurrence_type=RecurrenceType(note.recurrence_type),
                    interval=note.interval,
                    time_of_day=note.time_of_day,
                    starts_at=note.starts_at,
                    ends_at=note.ends_at,
                    after=cursor,
                )
                if next_at is None or next_at > now:
                    break
                rows_to_insert.append(
                    {
                        "note_id": note.id,
                        "scheduled_for": next_at,
                        "status": ReminderOccurrenceStatus.pending,
                    }
                )
                cursor = next_at

        await self.repo.bulk_insert_occurrences(rows_to_insert)

    async def get_due_reminders(self, user: User, now: datetime) -> dict:
        """Materialize + due liste + catch-up penceresi dışındakileri missed'a düşürüp özetler."""
        await self.materialize_due(user, now)

        window_start = now - CATCH_UP_WINDOW
        missed_count = await self.repo.mark_stale_as_missed(user.id, window_start)

        active = await self.repo.list_active_occurrences(user.id, window_start, now)
        for occurrence in active:
            if occurrence.status == ReminderOccurrenceStatus.pending:
                occurrence.status = ReminderOccurrenceStatus.fired
                occurrence.fired_at = now
        await self.db.flush()

        return {
            "due": active,
            "missed_count": missed_count,
        }

    async def acknowledge(self, user: User, occurrence_id: int, now: datetime) -> Optional[NoteReminderOccurrence]:
        occurrence = await self.repo.get_occurrence(occurrence_id, user.id)
        if not occurrence:
            return None
        occurrence.status = ReminderOccurrenceStatus.acknowledged
        occurrence.acknowledged_at = now

        note = await self.repo.get_note(occurrence.note_id, user.id)
        if note and note.recurrence_type == RecurrenceType.once:
            note.is_done = True

        await self.db.flush()
        return occurrence

    async def snooze(
        self, user: User, occurrence_id: int, new_datetime: datetime
    ) -> Optional[NoteReminderOccurrence]:
        occurrence = await self.repo.get_occurrence(occurrence_id, user.id)
        if not occurrence:
            return None

        occurrence.status = ReminderOccurrenceStatus.snoozed
        occurrence.snoozed_to = new_datetime

        await self.repo.bulk_insert_occurrences(
            [
                {
                    "note_id": occurrence.note_id,
                    "scheduled_for": new_datetime,
                    "status": ReminderOccurrenceStatus.pending,
                }
            ]
        )
        await self.db.flush()
        return occurrence
