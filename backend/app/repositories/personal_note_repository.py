from datetime import datetime, timezone
from typing import List, Optional, Sequence

from sqlalchemy import and_, or_, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.personal_note import (
    NOTE_COLOR_PRIORITY,
    AssignmentStatus,
    NoteColor,
    NoteReminderOccurrence,
    PersonalNote,
    ReminderOccurrenceStatus,
)

NOTE_SORT_OPTIONS = ("due_date", "created_at", "importance")
NOTE_SCOPE_OPTIONS = ("all", "my_notes", "assigned_to_me", "assigned_by_me", "archive")
ARCHIVE_SCOPE = "archive"
_EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)


def sort_notes(notes: List[PersonalNote], sort_by: str) -> List[PersonalNote]:
    """Saf sıralama fonksiyonu — DB'den bağımsız test edilebilir.
    Küçük veri setinde (tek klinik, kullanıcı başına birkaç düzine not) SQL
    CASE yerine Python'da sıralamak yeterli ve daha basit."""
    if sort_by == "created_at":
        return sorted(notes, key=lambda n: n.created_at or _EPOCH, reverse=True)
    if sort_by == "importance":
        return sorted(notes, key=lambda n: NOTE_COLOR_PRIORITY.get(NoteColor(n.color), 0), reverse=True)
    if sort_by == "completed_at":
        # Arşiv: en son tamamlanan en üstte. completed_at'i olmayan eski kayıtlar
        # (migration öncesi tamamlananlar) en alta düşer.
        return sorted(notes, key=lambda n: n.completed_at or _EPOCH, reverse=True)
    return sorted(notes, key=lambda n: n.starts_at)


class PersonalNoteRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_notes(
        self,
        user_id: int,
        sort_by: str = "due_date",
        scope: str = "all",
    ) -> List[PersonalNote]:
        """Tamamlanan işler aktif görünümlerden çıkarılır; yalnızca "archive"
        scope'u onları (silinmemiş olanları) geri getirir."""
        visible_to_user = or_(
            PersonalNote.user_id == user_id,
            PersonalNote.assigned_to_id == user_id,
        )
        conditions = [PersonalNote.is_deleted == False]

        if scope == ARCHIVE_SCOPE:
            conditions.append(PersonalNote.is_done == True)
            scope_cond = visible_to_user
            sort_by = "completed_at"
        else:
            conditions.append(PersonalNote.is_done == False)
            if scope == "my_notes":
                scope_cond = and_(
                    PersonalNote.user_id == user_id,
                    or_(PersonalNote.assigned_to_id.is_(None), PersonalNote.assigned_to_id == user_id),
                )
            elif scope == "assigned_to_me":
                scope_cond = and_(
                    PersonalNote.assigned_to_id == user_id,
                    PersonalNote.user_id != user_id,
                )
            elif scope == "assigned_by_me":
                scope_cond = and_(
                    PersonalNote.user_id == user_id,
                    PersonalNote.assigned_to_id.is_not(None),
                    PersonalNote.assigned_to_id != user_id,
                )
            else:  # "all"
                scope_cond = visible_to_user

        conditions.append(scope_cond)
        query = select(PersonalNote).where(and_(*conditions))
        result = await self.db.execute(query)
        notes = list(result.scalars().all())
        return sort_notes(notes, sort_by)

    async def get_note(self, note_id: int, user_id: int) -> Optional[PersonalNote]:
        query = select(PersonalNote).where(
            and_(
                PersonalNote.id == note_id,
                or_(
                    PersonalNote.user_id == user_id,
                    PersonalNote.assigned_to_id == user_id,
                ),
                PersonalNote.is_deleted == False,
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_pending_assignments(self, user_id: int) -> List[PersonalNote]:
        query = select(PersonalNote).where(
            and_(
                PersonalNote.assigned_to_id == user_id,
                PersonalNote.assignment_status == AssignmentStatus.pending,
                PersonalNote.is_deleted == False,
                PersonalNote.is_done == False,
            )
        ).order_by(PersonalNote.starts_at.asc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def mark_popup_shown(self, note_ids: List[int]) -> None:
        if not note_ids:
            return
        await self.db.execute(
            update(PersonalNote)
            .where(PersonalNote.id.in_(note_ids))
            .values(popup_shown=True)
        )
        await self.db.flush()

    async def create_note(self, note: PersonalNote) -> PersonalNote:
        self.db.add(note)
        await self.db.flush()
        await self.db.refresh(note)
        return note

    async def soft_delete_note(self, note: PersonalNote, when: datetime) -> None:
        note.is_deleted = True
        note.deleted_at = when
        await self.db.flush()

    async def get_last_occurrence(self, note_id: int) -> Optional[NoteReminderOccurrence]:
        query = (
            select(NoteReminderOccurrence)
            .where(NoteReminderOccurrence.note_id == note_id)
            .order_by(NoteReminderOccurrence.scheduled_for.desc())
            .limit(1)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def bulk_insert_occurrences(self, rows: Sequence[dict]) -> None:
        """`ON CONFLICT (note_id, scheduled_for) DO NOTHING` ile eşzamanlı çağrılarda
        çift üretimi DB seviyesinde yutar — uygulama tarafında kilit gerekmez."""
        if not rows:
            return
        stmt = pg_insert(NoteReminderOccurrence).values(list(rows))
        stmt = stmt.on_conflict_do_nothing(constraint="uq_note_occurrence_schedule")
        await self.db.execute(stmt)
        await self.db.flush()

    async def list_active_occurrences(self, user_id: int, window_start: datetime, now: datetime) -> List[NoteReminderOccurrence]:
        query = (
            select(NoteReminderOccurrence)
            .join(PersonalNote, PersonalNote.id == NoteReminderOccurrence.note_id)
            .where(
                and_(
                    PersonalNote.user_id == user_id,
                    PersonalNote.is_deleted == False,
                    NoteReminderOccurrence.status.in_(
                        [ReminderOccurrenceStatus.pending, ReminderOccurrenceStatus.fired]
                    ),
                    NoteReminderOccurrence.scheduled_for >= window_start,
                    NoteReminderOccurrence.scheduled_for <= now,
                )
            )
            .order_by(NoteReminderOccurrence.scheduled_for.asc())
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def mark_stale_as_missed(self, user_id: int, window_start: datetime) -> int:
        subq = (
            select(NoteReminderOccurrence.id)
            .join(PersonalNote, PersonalNote.id == NoteReminderOccurrence.note_id)
            .where(
                and_(
                    PersonalNote.user_id == user_id,
                    NoteReminderOccurrence.status == ReminderOccurrenceStatus.pending,
                    NoteReminderOccurrence.scheduled_for < window_start,
                )
            )
        )
        result = await self.db.execute(subq)
        stale_ids = [row[0] for row in result.all()]
        if not stale_ids:
            return 0
        await self.db.execute(
            update(NoteReminderOccurrence)
            .where(NoteReminderOccurrence.id.in_(stale_ids))
            .values(status=ReminderOccurrenceStatus.missed)
        )
        await self.db.flush()
        return len(stale_ids)

    async def get_occurrence(self, occurrence_id: int, user_id: int) -> Optional[NoteReminderOccurrence]:
        query = (
            select(NoteReminderOccurrence)
            .join(PersonalNote, PersonalNote.id == NoteReminderOccurrence.note_id)
            .where(
                and_(
                    NoteReminderOccurrence.id == occurrence_id,
                    PersonalNote.user_id == user_id,
                    PersonalNote.is_deleted == False,
                )
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
