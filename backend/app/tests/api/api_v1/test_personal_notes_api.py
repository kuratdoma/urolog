from datetime import datetime, time, timezone
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.api import deps
from app.models.user import User
from app.models.personal_note import NoteColor, PersonalNote, RecurrenceType
from app.core.permissions import UserRole

client = TestClient(app)

UTC = timezone.utc


@pytest.fixture(autouse=True)
def setup_auth_override():
    def override_get_current_user():
        return User(id=1, username="dr_test", is_active=True, role=UserRole.DOCTOR)

    app.dependency_overrides[deps.get_current_user] = override_get_current_user
    yield
    app.dependency_overrides.pop(deps.get_current_user, None)


def _note(note_id=5, user_id=1):
    return PersonalNote(
        id=note_id,
        user_id=user_id,
        title="Reçete yenile",
        content=None,
        color=NoteColor.default,
        recurrence_type=RecurrenceType.once,
        interval=1,
        time_of_day=time(9, 0),
        starts_at=datetime(2026, 3, 10, 9, 0, tzinfo=UTC),
        ends_at=None,
        is_done=False,
        created_at=datetime(2026, 3, 1, tzinfo=UTC),
        updated_at=None,
    )


@patch("app.api.v1.endpoints.personal_notes.PersonalNoteService.list_notes")
def test_list_notes_returns_only_current_user_notes(mock_list_notes):
    mock_list_notes.return_value = [_note(user_id=1)]

    response = client.get("/api/v1/notes")

    assert response.status_code == 200
    mock_list_notes.assert_awaited_once_with(1, include_done=True, sort_by="due_date", scope="all")


@pytest.mark.parametrize("scope", ["all", "my_notes", "assigned_to_me", "assigned_by_me"])
@patch("app.api.v1.endpoints.personal_notes.PersonalNoteService.list_notes")
def test_list_notes_with_different_scopes(mock_list_notes, scope):
    mock_list_notes.return_value = [_note(user_id=1)]

    response = client.get(f"/api/v1/notes?scope={scope}")

    assert response.status_code == 200
    mock_list_notes.assert_awaited_once_with(1, include_done=True, sort_by="due_date", scope=scope)


@patch("app.api.v1.endpoints.personal_notes.PersonalNoteService.list_colleagues")
def test_list_colleagues_success(mock_colleagues):
    mock_colleagues.return_value = [
        User(id=2, username="hemsire_ayse", full_name="Ayşe Yılmaz", role=UserRole.NURSE)
    ]

    response = client.get("/api/v1/notes/colleagues")

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["username"] == "hemsire_ayse"


@patch("app.api.v1.endpoints.personal_notes.PersonalNoteService.accept_assignment")
def test_accept_task_success(mock_accept):
    n = _note()
    n.assigned_to_id = 1
    mock_accept.return_value = n

    response = client.post("/api/v1/notes/5/accept")

    assert response.status_code == 200
    mock_accept.assert_awaited_once()


@patch("app.api.v1.endpoints.personal_notes.PersonalNoteService.reject_assignment")
def test_reject_task_success(mock_reject):
    n = _note()
    n.assigned_to_id = 1
    mock_reject.return_value = n

    response = client.post("/api/v1/notes/5/reject", json={"rejection_reason": "Müsait değilim"})

    assert response.status_code == 200
    mock_reject.assert_awaited_once()


@patch("app.api.v1.endpoints.personal_notes.PersonalNoteService.create_note")
def test_create_note_success(mock_create):
    mock_create.return_value = _note()

    response = client.post(
        "/api/v1/notes",
        json={
            "title": "Reçete yenile",
            "recurrence_type": "once",
            "interval": 1,
            "time_of_day": "09:00:00",
            "starts_at": "2026-03-10T09:00:00Z",
        },
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Reçete yenile"


@patch("app.api.v1.endpoints.personal_notes.PersonalNoteService.update_note")
def test_update_note_owned_by_other_user_returns_404(mock_update):
    mock_update.return_value = None

    response = client.patch("/api/v1/notes/5", json={"title": "Değişti"})

    assert response.status_code == 404


@patch("app.api.v1.endpoints.personal_notes.PersonalNoteService.delete_note")
def test_delete_note_owned_by_other_user_returns_404(mock_delete):
    mock_delete.return_value = False

    response = client.delete("/api/v1/notes/5")

    assert response.status_code == 404


@patch("app.api.v1.endpoints.personal_notes.PersonalNoteService.get_due_reminders")
def test_get_due_reminders(mock_get_due):
    mock_get_due.return_value = {"due": [], "missed_count": 2}

    response = client.get("/api/v1/notes/reminders/due")

    assert response.status_code == 200
    assert response.json()["missed_count"] == 2


@patch("app.api.v1.endpoints.personal_notes.PersonalNoteService.acknowledge")
def test_acknowledge_reminder_not_found_returns_404(mock_ack):
    mock_ack.return_value = None

    response = client.post("/api/v1/notes/reminders/999/ack")

    assert response.status_code == 404


@patch("app.api.v1.endpoints.personal_notes.PersonalNoteService.snooze")
def test_snooze_reminder_success(mock_snooze):
    mock_snooze.return_value = AsyncMock()

    response = client.post(
        "/api/v1/notes/reminders/1/snooze",
        json={"new_datetime": "2026-03-15T14:00:00Z"},
    )

    assert response.status_code == 200
    mock_snooze.assert_awaited_once()
