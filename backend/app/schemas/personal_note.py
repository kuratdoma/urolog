from datetime import datetime, time
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.personal_note import (
    AssignmentStatus,
    NoteColor,
    RecurrenceType,
    ReminderOccurrenceStatus,
)


class UserMiniResponse(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    role: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PersonalNoteBase(BaseModel):
    title: str
    content: Optional[str] = None
    color: NoteColor = NoteColor.default
    assigned_to_id: Optional[int] = None
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
    assigned_to_id: Optional[int] = None
    recurrence_type: Optional[RecurrenceType] = None
    interval: Optional[int] = None
    time_of_day: Optional[time] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    is_done: Optional[bool] = None


class PersonalNoteResponse(PersonalNoteBase):
    id: int
    user_id: int
    assigned_to_id: Optional[int] = None
    assigned_by_id: Optional[int] = None
    assignment_status: AssignmentStatus = AssignmentStatus.none
    rejection_reason: Optional[str] = None
    assigned_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None
    popup_shown: bool = False
    is_done: bool
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    creator: Optional[UserMiniResponse] = None
    assigned_to: Optional[UserMiniResponse] = None
    assigned_by: Optional[UserMiniResponse] = None

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


class RejectTaskRequest(BaseModel):
    rejection_reason: Optional[str] = None
