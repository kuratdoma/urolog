from datetime import datetime, time
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.personal_note import NoteColor, RecurrenceType, ReminderOccurrenceStatus


class PersonalNoteBase(BaseModel):
    title: str
    content: Optional[str] = None
    color: NoteColor = NoteColor.default
    recurrence_type: RecurrenceType = RecurrenceType.once
    interval: int = 1
    time_of_day: time
    starts_at: datetime
    ends_at: Optional[datetime] = None


class PersonalNoteCreate(PersonalNoteBase):
    pass


class PersonalNoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    color: Optional[NoteColor] = None
    recurrence_type: Optional[RecurrenceType] = None
    interval: Optional[int] = None
    time_of_day: Optional[time] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    is_done: Optional[bool] = None


class PersonalNoteResponse(PersonalNoteBase):
    id: int
    user_id: int
    is_done: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class NoteReminderOccurrenceResponse(BaseModel):
    id: int
    note_id: int
    scheduled_for: datetime
    status: ReminderOccurrenceStatus
    fired_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    snoozed_to: Optional[datetime] = None
    note: PersonalNoteResponse

    model_config = ConfigDict(from_attributes=True)


class DueRemindersResponse(BaseModel):
    due: list[NoteReminderOccurrenceResponse]
    missed_count: int


class SnoozeRequest(BaseModel):
    new_datetime: datetime
