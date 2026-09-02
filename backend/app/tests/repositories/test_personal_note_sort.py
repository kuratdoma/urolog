from datetime import datetime, timezone

from app.models.personal_note import NoteColor, PersonalNote, RecurrenceType
from app.repositories.personal_note_repository import sort_notes

UTC = timezone.utc


def _note(id, color=NoteColor.default, created_at=None, starts_at=None, completed_at=None):
    return PersonalNote(
        id=id,
        user_id=1,
        title=f"Not {id}",
        color=color,
        recurrence_type=RecurrenceType.once,
        interval=1,
        starts_at=starts_at or datetime(2026, 3, 10, 9, 0, tzinfo=UTC),
        created_at=created_at or datetime(2026, 3, 1, tzinfo=UTC),
        completed_at=completed_at,
    )


def test_sort_by_due_date_ascending():
    a = _note(1, starts_at=datetime(2026, 3, 15, tzinfo=UTC))
    b = _note(2, starts_at=datetime(2026, 3, 10, tzinfo=UTC))
    c = _note(3, starts_at=datetime(2026, 3, 20, tzinfo=UTC))

    result = sort_notes([a, b, c], "due_date")

    assert [n.id for n in result] == [2, 1, 3]


def test_sort_by_created_at_newest_first():
    a = _note(1, created_at=datetime(2026, 3, 1, tzinfo=UTC))
    b = _note(2, created_at=datetime(2026, 3, 10, tzinfo=UTC))
    c = _note(3, created_at=datetime(2026, 3, 5, tzinfo=UTC))

    result = sort_notes([a, b, c], "created_at")

    assert [n.id for n in result] == [2, 3, 1]


def test_sort_by_importance_highest_first():
    normal = _note(1, color=NoteColor.green)
    acil = _note(2, color=NoteColor.red)
    none = _note(3, color=NoteColor.default)
    onemli = _note(4, color=NoteColor.yellow)
    ivedi = _note(5, color=NoteColor.blue)

    result = sort_notes([normal, acil, none, onemli, ivedi], "importance")

    assert [n.id for n in result] == [2, 4, 5, 1, 3]


def test_unknown_sort_by_falls_back_to_due_date():
    a = _note(1, starts_at=datetime(2026, 3, 15, tzinfo=UTC))
    b = _note(2, starts_at=datetime(2026, 3, 10, tzinfo=UTC))

    result = sort_notes([a, b], "not-a-real-option")

    assert [n.id for n in result] == [2, 1]


def test_archive_sort_puts_most_recently_completed_first():
    a = _note(1, completed_at=datetime(2026, 3, 1, tzinfo=UTC))
    b = _note(2, completed_at=datetime(2026, 3, 20, tzinfo=UTC))
    c = _note(3, completed_at=datetime(2026, 3, 10, tzinfo=UTC))

    result = sort_notes([a, b, c], "completed_at")

    assert [n.id for n in result] == [2, 3, 1]


def test_archive_sort_pushes_undated_legacy_notes_to_the_bottom():
    """Migration öncesi tamamlanan notların completed_at'i yok — en alta düşmeli."""
    legacy = _note(1, completed_at=None)
    recent = _note(2, completed_at=datetime(2026, 3, 20, tzinfo=UTC))

    result = sort_notes([legacy, recent], "completed_at")

    assert [n.id for n in result] == [2, 1]
