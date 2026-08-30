from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.schemas.personal_note import (
    DueRemindersResponse,
    PersonalNoteCreate,
    PersonalNoteResponse,
    PersonalNoteUpdate,
    SnoozeRequest,
)
from app.services.personal_note_service import PersonalNoteService

router = APIRouter(
    dependencies=[Depends(deps.get_current_user)],
    redirect_slashes=False,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


@router.get("", response_model=list[PersonalNoteResponse])
async def list_notes(
    include_done: bool = True,
    sort_by: Literal["due_date", "created_at", "importance"] = "due_date",
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    service = PersonalNoteService(db)
    return await service.list_notes(current_user.id, include_done=include_done, sort_by=sort_by)


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
