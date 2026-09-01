import re
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.personal_note import (
    AssignmentStatus,
    NoteReminderOccurrence,
    PersonalNote,
    RecurrenceType,
    ReminderOccurrenceStatus,
)
from app.models.user import User
from app.repositories.personal_note_repository import PersonalNoteRepository
from app.services.audit_service import AuditService
from app.services.recurrence import compute_next_occurrence

from sqlalchemy import or_, select

CATCH_UP_WINDOW = timedelta(hours=48)
MAX_OCCURRENCES_PER_NOTE_PER_CALL = 200  # runaway materialization'a karşı savunma sınırı


def extract_mentions(text: str) -> List[str]:
    if not text:
        return []
    return re.findall(r"@([a-zA-Z0-9_.\-@]+)", text)


class PersonalNoteService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = PersonalNoteRepository(db)

    async def list_colleagues(self, user: User) -> List[User]:
        stmt = (
            select(User)
            .where(User.is_active == True, User.is_hidden.is_not(True))
            .order_by(User.full_name.asc(), User.username.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def _resolve_assignee(self, user: User, data: dict) -> tuple[Optional[int], AssignmentStatus]:
        """Resolves target user from explicit assigned_to_id or @mentions in title/content."""
        target_user_id = data.get("assigned_to_id")
        
        # If no explicit ID, try extracting from title or content
        if not target_user_id:
            text_to_search = f"{data.get('title', '')} {data.get('content', '')}"
            mentions = extract_mentions(text_to_search)
            for m in mentions:
                clean_m = m.strip("@.,;: ")
                if not clean_m:
                    continue
                stmt = select(User).where(
                    or_(
                        User.username.ilike(clean_m),
                        User.username.ilike(f"{clean_m}@%"),
                        User.email.ilike(clean_m),
                        User.email.ilike(f"{clean_m}@%"),
                    ),
                    User.is_active == True,
                )
                res = await self.db.execute(stmt)
                mentioned_user = res.scalars().first()
                if mentioned_user:
                    target_user_id = mentioned_user.id
                    break

        if target_user_id and target_user_id != user.id:
            return target_user_id, AssignmentStatus.pending
        elif target_user_id == user.id:
            return user.id, AssignmentStatus.none
        return None, AssignmentStatus.none

    async def list_notes(
        self,
        user_id: int,
        include_done: bool = True,
        sort_by: str = "due_date",
        scope: str = "all",
    ) -> List[PersonalNote]:
        return await self.repo.list_notes(
            user_id, include_done=include_done, sort_by=sort_by, scope=scope
        )

    async def create_note(self, user: User, data: dict) -> PersonalNote:
        target_id, assign_status = await self._resolve_assignee(user, data)
        data["assigned_to_id"] = target_id
        data["assigned_by_id"] = user.id if target_id else None
        data["assignment_status"] = assign_status
        if assign_status == AssignmentStatus.pending:
            data["assigned_at"] = datetime.now(timezone.utc)
            data["popup_shown"] = False

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

        if "assigned_to_id" in data or "title" in data or "content" in data:
            merged_data = {
                "title": data.get("title", note.title),
                "content": data.get("content", note.content),
                "assigned_to_id": data.get("assigned_to_id", note.assigned_to_id),
            }
            target_id, assign_status = await self._resolve_assignee(user, merged_data)
            if target_id != note.assigned_to_id:
                data["assigned_to_id"] = target_id
                data["assigned_by_id"] = user.id if target_id else None
                data["assignment_status"] = assign_status
                if assign_status == AssignmentStatus.pending:
                    data["assigned_at"] = datetime.now(timezone.utc)
                    data["popup_shown"] = False
                    data["rejection_reason"] = None
                    data["responded_at"] = None

        for key, value in data.items():
            setattr(note, key, value)
        await self.db.flush()
        await self.db.refresh(note)
        await AuditService.log(
            self.db, action="PERSONAL_NOTE_UPDATE", user_id=user.id,
            resource_type="personal_note", resource_id=str(note.id),
        )
        return note

    async def accept_assignment(self, user: User, note_id: int, now: datetime) -> Optional[PersonalNote]:
        note = await self.repo.get_note(note_id, user.id)
        if not note or note.assigned_to_id != user.id:
            return None

        note.assignment_status = AssignmentStatus.accepted
        note.responded_at = now
        note.popup_shown = True
        await self.db.flush()
        await self.db.refresh(note)
        await AuditService.log(
            self.db, action="TASK_ASSIGNMENT_ACCEPT", user_id=user.id,
            resource_type="personal_note", resource_id=str(note.id),
        )
        return note

    async def reject_assignment(
        self, user: User, note_id: int, reason: Optional[str], now: datetime
    ) -> Optional[PersonalNote]:
        note = await self.repo.get_note(note_id, user.id)
        if not note or note.assigned_to_id != user.id:
            return None

        note.assignment_status = AssignmentStatus.rejected
        note.rejection_reason = reason
        note.responded_at = now
        note.popup_shown = True
        await self.db.flush()
        await self.db.refresh(note)
        await AuditService.log(
            self.db, action="TASK_ASSIGNMENT_REJECT", user_id=user.id,
            resource_type="personal_note", resource_id=str(note.id),
        )
        return note

    async def get_pending_assignments(self, user: User) -> List[PersonalNote]:
        return await self.repo.get_pending_assignments(user.id)

    async def mark_popup_seen(self, user: User, note_ids: List[int]) -> None:
        await self.repo.mark_popup_shown(note_ids)

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
