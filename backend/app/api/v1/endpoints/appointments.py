from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.api import deps
from app.core.permissions import Action
from app.repositories.appointment_repository import AppointmentRepository
from app.schemas.appointment import RandevuCreate, RandevuUpdate, RandevuResponse
from app.models.user import User

router = APIRouter(
    # SEC-09: Router seviyesinde kimlik doğrulama
    dependencies=[Depends(deps.get_current_user)],
    redirect_slashes=False
)

# RBAC: yetkiler PERMISSION_MATRIX["appointments"] üzerinden işlem bazında uygulanır.
# Router seviyesinde tek rol listesi kullanmak salt-okunur rollerin de
# yazma uçlarına erişmesine yol açardı.
_read = deps.require_permission("appointments", Action.READ)
_create = deps.require_permission("appointments", Action.CREATE)
_update = deps.require_permission("appointments", Action.UPDATE)
_delete = deps.require_permission("appointments", Action.DELETE)


async def background_google_sync(appointment_id: int, user_id: int, action: str = "sync"):
    from app.db.session import SessionLocal
    from app.services.google_calendar_service import GoogleCalendarService
    from app.repositories.appointment_repository import AppointmentRepository

    # Kendi oturumunu açıp işlemleri burada yapacak, ana akışı tıkamayacak
    async with SessionLocal() as session:
        repo = AppointmentRepository(session)
        calendar_service = GoogleCalendarService(session)
        try:
            appointment = await repo.get_by_id(appointment_id)
            if not appointment:
                return

            creds, user_id = await calendar_service.get_effective_credentials(
                appointment.doctor_id, user_id
            )

            if not creds:
                return

            if action == "sync":
                await calendar_service.sync_appointment(appointment, user_id)
            elif action == "delete":
                await calendar_service.delete_from_calendar(appointment, user_id)
        except Exception as e:
            print(f"Background Google Calendar {action} hatası: {e}")


@router.get("", response_model=List[RandevuResponse], dependencies=[Depends(_read)])
async def get_appointments(
    start: Optional[str] = Query(None, description="Start datetime ISO string"),
    end: Optional[str] = Query(None, description="End datetime ISO string"),
    include_deleted: bool = Query(False, description="Include soft-deleted appointments for change tracking"),
    db: AsyncSession = Depends(deps.get_db),
):
    """Get all appointments, optionally filtered by date range."""
    repo = AppointmentRepository(db)

    start_dt = None
    end_dt = None

    if start:
        try:
            start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
        except:
            pass

    if end:
        try:
            end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
        except:
            pass

    if include_deleted:
        appointments = await repo.get_all_with_deleted(start=start_dt, end=end_dt)
    else:
        appointments = await repo.get_all(start=start_dt, end=end_dt)
    return appointments


@router.get("/{randevu_id}", response_model=RandevuResponse, dependencies=[Depends(_read)])
async def get_appointment(randevu_id: int, db: AsyncSession = Depends(deps.get_db)):
    """Get a specific appointment by ID."""
    repo = AppointmentRepository(db)
    appointment = await repo.get_by_id(randevu_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Randevu bulunamadı")
    return appointment


@router.get("/patient/{hasta_id}", response_model=List[RandevuResponse], dependencies=[Depends(_read)])
async def get_patient_appointments(
    hasta_id: str, db: AsyncSession = Depends(deps.get_db)
):
    """Get all appointments for a specific patient."""
    repo = AppointmentRepository(db)
    appointments = await repo.get_by_patient(hasta_id)
    return appointments


@router.post("", response_model=RandevuResponse, dependencies=[Depends(_create)])
async def create_appointment(
    randevu_in: RandevuCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Create a new appointment."""
    repo = AppointmentRepository(db)
    appointment = await repo.create(randevu_in, user_id=current_user.id, user_name=current_user.full_name)

    # Otomatik Google Calendar Senkronizasyonu (Arka Planda)
    background_tasks.add_task(background_google_sync, appointment.id, current_user.id, "sync")

    return appointment


@router.put("/{randevu_id}", response_model=RandevuResponse, dependencies=[Depends(_update)])
async def update_appointment(
    randevu_id: int,
    randevu_in: RandevuUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Update an existing appointment."""
    repo = AppointmentRepository(db)
    appointment = await repo.update(randevu_id, randevu_in, user_id=current_user.id, user_name=current_user.full_name)
    if not appointment:
        raise HTTPException(status_code=404, detail="Randevu bulunamadı")

    # Otomatik Google Calendar Senkronizasyonu (Arka Planda)
    background_tasks.add_task(background_google_sync, appointment.id, current_user.id, "sync")

    return appointment


@router.delete("/{randevu_id}", dependencies=[Depends(_delete)])
async def delete_appointment(
    randevu_id: int,
    background_tasks: BackgroundTasks,
    reason: Optional[str] = Query(None),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Delete an appointment."""
    repo = AppointmentRepository(db)

    # Silmeden önce Google Calendar ID / Event ID bilgisini almak için randevuyu çekelim
    appointment = await repo.get_by_id(randevu_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Randevu bulunamadı")

    # Otomatik Google Calendar Silme (Arka Planda)
    if appointment.google_event_id:
        background_tasks.add_task(background_google_sync, appointment.id, current_user.id, "delete")

    success = await repo.delete(randevu_id, reason=reason, user_id=current_user.id, user_name=current_user.full_name)
    if not success:
        raise HTTPException(status_code=404, detail="Randevu bulunamadı")
    return {"message": "Randevu başarıyla silindi"}


# === CALENDAR INTEGRATION ENDPOINTS ===


@router.post("/{randevu_id}/sync", dependencies=[Depends(_create)])
async def sync_to_google(
    randevu_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Sync an appointment to Google Calendar.
    Creates a new event or updates existing one.
    """
    from app.services.google_calendar_service import GoogleCalendarService

    repo = AppointmentRepository(db)
    appointment = await repo.get_by_id(randevu_id)

    if not appointment:
        raise HTTPException(status_code=404, detail="Randevu bulunamadı")

    user_id = current_user.id
    service = GoogleCalendarService(db)

    # Yetki Önceliği: 1. Doktor, 2. İşlemi Yapan, 3. Sistemdeki herhangi biri
    creds, user_id = await service.get_effective_credentials(
        appointment.doctor_id, current_user.id
    )

    success, message = await service.sync_appointment(appointment, user_id)

    if not success:
        raise HTTPException(status_code=400, detail=message)

    return {"message": message, "google_event_id": appointment.google_event_id}


@router.delete("/{randevu_id}/sync", dependencies=[Depends(_delete)])
async def remove_from_google(
    randevu_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Remove an appointment from Google Calendar.
    """
    from app.services.google_calendar_service import GoogleCalendarService

    repo = AppointmentRepository(db)
    appointment = await repo.get_by_id(randevu_id)

    if not appointment:
        raise HTTPException(status_code=404, detail="Randevu bulunamadı")

    user_id = current_user.id
    service = GoogleCalendarService(db)

    # Yetki Önceliği: 1. Doktor, 2. İşlemi Yapan, 3. Sistemdeki herhangi biri
    creds, user_id = await service.get_effective_credentials(
        appointment.doctor_id, current_user.id
    )

    success, message = await service.delete_from_calendar(appointment, user_id)

    if not success:
        raise HTTPException(status_code=400, detail=message)

    return {"message": message}


@router.get("/{randevu_id}/ics", dependencies=[Depends(_read)])
async def download_ics(randevu_id: int, db: AsyncSession = Depends(deps.get_db)):
    """
    Download iCal (.ics) file for an appointment.
    Can be imported into Apple Calendar, Outlook, etc.
    """
    from fastapi.responses import Response
    from app.utils.calendar_utils import generate_ics_content
    import unicodedata
    import re

    repo = AppointmentRepository(db)
    appointment = await repo.get_by_id(randevu_id)

    if not appointment:
        raise HTTPException(status_code=404, detail="Randevu bulunamadı")

    # Generate iCal content
    ics_content = generate_ics_content(appointment)

    # Build filename - sanitize for ASCII compatibility
    def sanitize_filename(name: str) -> str:
        # Replace Turkish characters with ASCII equivalents
        replacements = {
            "ş": "s",
            "Ş": "S",
            "ı": "i",
            "İ": "I",
            "ğ": "g",
            "Ğ": "G",
            "ü": "u",
            "Ü": "U",
            "ö": "o",
            "Ö": "O",
            "ç": "c",
            "Ç": "C",
        }
        for tr, en in replacements.items():
            name = name.replace(tr, en)
        # Remove any remaining non-ASCII characters
        name = (
            unicodedata.normalize("NFKD", name)
            .encode("ASCII", "ignore")
            .decode("ASCII")
        )
        # Replace spaces and special chars with underscore
        name = re.sub(r"[^\w\-.]", "_", name)
        return name

    hasta_adi = ""
    if appointment.hasta:
        hasta_adi = f"{appointment.hasta.ad}_{appointment.hasta.soyad}_"
    date_str = appointment.start.strftime("%Y%m%d") if appointment.start else "randevu"
    filename = sanitize_filename(f"{hasta_adi}{date_str}.ics")

    return Response(
        content=ics_content.encode("utf-8"),
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
