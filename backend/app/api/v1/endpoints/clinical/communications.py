from typing import Any, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.repositories.clinical.repository import ClinicalRepository
from app.schemas.clinical import (
    HastaNotuCreate,
    HastaNotuResponse,
    HastaNotuUpdate,
    TelefonGorusmesiCreate,
    TelefonGorusmesiResponse,
    TelefonGorusmesiUpdate,
    KisiselNotCreate,
    KisiselNotResponse,
    KisiselNotUpdate,
)
from app.core.permissions import UserRole, Action
from app.services.audit_service import AuditService
from app.models.user import User

router = APIRouter(dependencies=[Depends(deps.get_current_user)])

# RBAC: yetkiler PERMISSION_MATRIX["clinical"] üzerinden işlem bazında uygulanır.
# Router seviyesinde tek rol listesi kullanmak salt-okunur rollerin de
# yazma uçlarına erişmesine yol açardı.
_read = deps.require_permission("clinical", Action.READ)
_create = deps.require_permission("clinical", Action.CREATE)
_update = deps.require_permission("clinical", Action.UPDATE)
_delete = deps.require_permission("clinical", Action.DELETE)


# --- TAKIP ---
@router.get("/patients/{hasta_id}/takip", response_model=List[HastaNotuResponse], dependencies=[Depends(_read)])
async def read_takip(hasta_id: str, db: AsyncSession = Depends(deps.get_db)) -> Any:
    repo = ClinicalRepository(db)
    return await repo.get_takip_by_patient(hasta_id)


@router.get("/takip/{id}", dependencies=[Depends(_read)])
async def read_takip_note(*, db: AsyncSession = Depends(deps.get_db), id: UUID) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.get_takip_note(id)
    if not result:
        raise HTTPException(status_code=404, detail="Follow-up note not found")

    return {
        "id": result.id,
        "hasta_id": result.hasta_id,
        "tarih": result.tarih,
        "tur": result.tip,
        "durum": result.sembol,
        "notlar": result.icerik,
        "created_at": result.created_at,
    }


@router.post("/takip", response_model=HastaNotuResponse, dependencies=[Depends(_create)])
async def create_takip(
    *,
    db: AsyncSession = Depends(deps.get_db),
    takip_in: HastaNotuCreate,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.create_takip(takip_in)

    await AuditService.log(
        db=db,
        action="TAKIP_NOTU_CREATE",
        user_id=current_user.id,
        resource_type="takip_notu",
        resource_id=str(result["id"]),
        details={"hasta_id": str(result["hasta_id"])},
    )
    return result


@router.put("/takip/{id}", response_model=HastaNotuResponse, dependencies=[Depends(_update)])
async def update_takip(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    takip_in: HastaNotuUpdate,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.update_takip(id, takip_in)
    if not result:
        raise HTTPException(status_code=404, detail="Follow-up note not found")

    await AuditService.log(
        db=db,
        action="TAKIP_NOTU_UPDATE",
        user_id=current_user.id,
        resource_type="takip_notu",
        resource_id=str(result["id"]),
        details={"hasta_id": str(result["hasta_id"])},
    )
    return result


@router.delete("/takip/{id}", dependencies=[Depends(_delete)])
async def delete_takip(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.delete_takip(id)
    if not result:
        raise HTTPException(status_code=404, detail="Follow-up note not found")

    await AuditService.log(
        db=db,
        action="TAKIP_NOTU_DELETE",
        user_id=current_user.id,
        resource_type="takip_notu",
        resource_id=str(id),
        details={},
    )
    return {"status": "success", "id": id}


# --- TELEFON GÖRÜŞMELERİ ---
@router.get(
    "/patients/{hasta_id}/phone-calls", response_model=List[TelefonGorusmesiResponse],
    dependencies=[Depends(_read)],
)
async def read_phone_calls(
    hasta_id: str, db: AsyncSession = Depends(deps.get_db)
) -> Any:
    repo = ClinicalRepository(db)
    return await repo.get_phone_calls_by_patient(hasta_id)


@router.post("/phone-calls", response_model=TelefonGorusmesiResponse, dependencies=[Depends(_create)])
async def create_phone_call(
    *, db: AsyncSession = Depends(deps.get_db), phone_call_in: TelefonGorusmesiCreate
) -> Any:
    repo = ClinicalRepository(db)
    return await repo.create_phone_call(phone_call_in)


@router.put("/phone-calls/{id}", response_model=TelefonGorusmesiResponse, dependencies=[Depends(_update)])
async def update_phone_call(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    phone_call_in: TelefonGorusmesiUpdate
) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.update_phone_call(id, phone_call_in)
    if not result:
        raise HTTPException(status_code=404, detail="Phone call not found")
    return result


@router.delete("/phone-calls/{id}", dependencies=[Depends(_delete)])
async def delete_phone_call(*, db: AsyncSession = Depends(deps.get_db), id: UUID) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.delete_phone_call(id)
    if not result:
        raise HTTPException(status_code=404, detail="Phone call not found")
    return {"status": "success", "id": id}


# --- KİŞİSEL NOTLAR (DOCTOR ONLY) ---
@router.get(
    "/patients/{hasta_id}/private-notes", response_model=List[KisiselNotResponse],
    dependencies=[Depends(deps.require_role(UserRole.ADMIN, UserRole.DOCTOR))]
)
async def read_private_notes(
    hasta_id: str, db: AsyncSession = Depends(deps.get_db)
) -> Any:
    repo = ClinicalRepository(db)
    return await repo.get_private_notes_by_patient(hasta_id)


@router.post(
    "/private-notes", response_model=KisiselNotResponse,
    dependencies=[Depends(deps.require_role(UserRole.ADMIN, UserRole.DOCTOR))]
)
async def create_private_note(
    *, db: AsyncSession = Depends(deps.get_db), note_in: KisiselNotCreate
) -> Any:
    repo = ClinicalRepository(db)
    return await repo.create_private_note(note_in)


@router.put(
    "/private-notes/{id}", response_model=KisiselNotResponse,
    dependencies=[Depends(deps.require_role(UserRole.ADMIN, UserRole.DOCTOR))]
)
async def update_private_note(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    note_in: KisiselNotUpdate
) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.update_private_note(id, note_in)
    if not result:
        raise HTTPException(status_code=404, detail="Private note not found")
    return result


@router.delete(
    "/private-notes/{id}",
    dependencies=[Depends(deps.require_role(UserRole.ADMIN, UserRole.DOCTOR))]
)
async def delete_private_note(*, db: AsyncSession = Depends(deps.get_db), id: UUID) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.delete_private_note(id)
    if not result:
        raise HTTPException(status_code=404, detail="Private note not found")
    return {"status": "success", "id": id}
