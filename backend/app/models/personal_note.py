from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Time,
    DateTime,
    Boolean,
    ForeignKey,
    Enum as SQLEnum,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from app.models.base_class import Base
import enum


class RecurrenceType(str, enum.Enum):
    once = "once"
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"


class ReminderOccurrenceStatus(str, enum.Enum):
    pending = "pending"
    fired = "fired"
    acknowledged = "acknowledged"
    snoozed = "snoozed"
    missed = "missed"


class NoteColor(str, enum.Enum):
    """Notun önem derecesini temsil eden renk paleti — sıralamada da önem
    sırası olarak kullanılır. default: belirtilmemiş (açık gri), green: normal,
    blue: ivedi, yellow: önemli, red: acil (en yüksek)."""
    default = "default"
    green = "green"
    blue = "blue"
    yellow = "yellow"
    red = "red"


NOTE_COLOR_PRIORITY = {
    NoteColor.default: 0,
    NoteColor.green: 1,
    NoteColor.blue: 2,
    NoteColor.yellow: 3,
    NoteColor.red: 4,
}


class PersonalNote(Base):
    __tablename__ = "personal_notes"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    color = Column(
        SQLEnum(NoteColor, name="notecolor", create_constraint=False, native_enum=False),
        default=NoteColor.default,
        nullable=False,
    )

    recurrence_type = Column(
        SQLEnum(RecurrenceType, name="recurrencetype", create_constraint=False, native_enum=False),
        default=RecurrenceType.once,
        nullable=False,
    )
    interval = Column(Integer, nullable=False, default=1)  # her N gün/hafta/ay
    time_of_day = Column(Time, nullable=False)

    starts_at = Column(DateTime(timezone=True), nullable=False, index=True)
    ends_at = Column(DateTime(timezone=True), nullable=True)

    is_done = Column(Boolean, nullable=False, default=False)
    # Base zaten is_deleted sağlıyor; deleted_at ne zaman silindiğini audit için tutar
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    occurrences = relationship(
        "NoteReminderOccurrence",
        backref=backref("note", lazy="selectin"),
        lazy="selectin",
        cascade="all, delete-orphan",
    )


class NoteReminderOccurrence(Base):
    __tablename__ = "note_reminder_occurrences"
    __table_args__ = (
        UniqueConstraint("note_id", "scheduled_for", name="uq_note_occurrence_schedule"),
        Index("ix_note_occurrence_status_schedule", "note_id", "status"),
        Index("ix_note_occurrence_due_scan", "scheduled_for", "status"),
    )

    id = Column(Integer, primary_key=True)
    note_id = Column(Integer, ForeignKey("personal_notes.id"), nullable=False, index=True)

    scheduled_for = Column(DateTime(timezone=True), nullable=False, index=True)
    status = Column(
        SQLEnum(ReminderOccurrenceStatus, name="reminderoccurrencestatus", create_constraint=False, native_enum=False),
        default=ReminderOccurrenceStatus.pending,
        nullable=False,
        index=True,
    )

    fired_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    snoozed_to = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
