from datetime import datetime, timezone
from typing import List, Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.schemas.personal_note import (
    DueRemindersResponse,
    PersonalNoteCreate,
    PersonalNoteResponse,
    PersonalNoteUpdate,
    RejectTaskRequest,
    SnoozeRequest,
    UserMiniResponse,
)
from app.services.personal_note_service import PersonalNoteService

router = APIRouter(
    dependencies=[Depends(deps.get_current_user)],
    redirect_slashes=False,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


@router.get("/colleagues", response_model=list[UserMiniResponse])
async def list_colleagues(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Returns active colleagues for @mentions and task assignment dropdowns."""
    service = PersonalNoteService(db)
    return await service.list_colleagues(current_user)


@router.get("/pending-assignments", response_model=list[PersonalNoteResponse])
async def get_pending_assignments(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Returns unacknowledged pending tasks assigned to the current user."""
    service = PersonalNoteService(db)
    return await service.get_pending_assignments(current_user)


@router.post("/pending-assignments/popup-seen")
async def mark_popup_seen(
    note_ids: List[int],
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Marks pending assignment popups as seen by the assignee."""
    service = PersonalNoteService(db)
    await service.mark_popup_seen(current_user, note_ids)
    return {"ok": True}


@router.get("", response_model=list[PersonalNoteResponse])
async def list_notes(
    sort_by: Literal["due_date", "created_at", "importance"] = "due_date",
    scope: Literal["all", "my_notes", "assigned_to_me", "assigned_by_me", "archive"] = "all",
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Aktif scope'lar tamamlanmamış işleri döner; tamamlananlar "archive"
    scope'unda tutulur ve is_done=false yapılarak geri alınabilir."""
    service = PersonalNoteService(db)
    return await service.list_notes(current_user.id, sort_by=sort_by, scope=scope)


@router.post("/{note_id}/accept", response_model=PersonalNoteResponse)
async def accept_task(
    note_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    service = PersonalNoteService(db)
    note = await service.accept_assignment(current_user, note_id, _now())
    if not note:
        raise HTTPException(status_code=404, detail="Atanan görev bulunamadı veya yetkiniz yok.")
    return note


@router.post("/{note_id}/reject", response_model=PersonalNoteResponse)
async def reject_task(
    note_id: int,
    payload: RejectTaskRequest = RejectTaskRequest(),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    service = PersonalNoteService(db)
    note = await service.reject_assignment(current_user, note_id, payload.rejection_reason, _now())
    if not note:
        raise HTTPException(status_code=404, detail="Atanan görev bulunamadı veya yetkiniz yok.")
    return note


@router.post("", response_model=PersonalNoteResponse)
async def create_note(
    payload: PersonalNoteCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    service = PersonalNoteService(db)
    return await service.create_note(current_user, payload.model_dump())


@router.patch("/{note_id}", response_model=PersonalNoteResponse)
async def update_note(
    note_id: int,
    payload: PersonalNoteUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    service = PersonalNoteService(db)
    note = await service.update_note(current_user, note_id, payload.model_dump(exclude_unset=True))
    if not note:
        raise HTTPException(status_code=404, detail="Not bulunamadı.")
    return note


@router.delete("/{note_id}")
async def delete_note(
    note_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    service = PersonalNoteService(db)
    deleted = await service.delete_note(current_user, note_id, _now())
    if not deleted:
        raise HTTPException(status_code=404, detail="Not bulunamadı.")
    return {"ok": True}


@router.get("/reminders/due", response_model=DueRemindersResponse)
async def get_due_reminders(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    service = PersonalNoteService(db)
    return await service.get_due_reminders(current_user, _now())


@router.post("/reminders/{occurrence_id}/ack")
async def acknowledge_reminder(
    occurrence_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    service = PersonalNoteService(db)
    occurrence = await service.acknowledge(current_user, occurrence_id, _now())
    if not occurrence:
        raise HTTPException(status_code=404, detail="Hatırlatma bulunamadı.")
    return {"ok": True}


@router.post("/reminders/{occurrence_id}/snooze")
async def snooze_reminder(
    occurrence_id: int,
    payload: SnoozeRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    service = PersonalNoteService(db)
    occurrence = await service.snooze(current_user, occurrence_id, payload.new_datetime)
    if not occurrence:
        raise HTTPException(status_code=404, detail="Hatırlatma bulunamadı.")
    return {"ok": True}
