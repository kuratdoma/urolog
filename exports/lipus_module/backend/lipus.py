from typing import Any, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.repositories.clinical.repository import ClinicalRepository
from app.schemas.clinical.lipus import (
    LipusDetailsCreate,
    LipusDetailsUpdate,
    LipusDetailsResponse,
    LipusDashboardItem,
)
from app.services.audit_service import AuditService
from app.models.user import User

router = APIRouter(prefix="/lipus", tags=["lipus"], dependencies=[Depends(deps.get_current_user)])

@router.get("/patients/{hasta_id}/dashboard", response_model=List[LipusDashboardItem])
async def read_lipus_dashboard(
    hasta_id: UUID, db: AsyncSession = Depends(deps.get_db)
) -> Any:
    try:
        repo = ClinicalRepository(db)
        return await repo.get_lipus_dashboard_data(hasta_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/muayene/{muayene_id}", response_model=LipusDetailsResponse)
async def read_lipus_details(
    muayene_id: UUID, db: AsyncSession = Depends(deps.get_db)
) -> Any:
    repo = ClinicalRepository(db)
    details = await repo.get_lipus_details(muayene_id)
    if not details:
        raise HTTPException(status_code=404, detail="Lipus details not found for this examination")
    return details

@router.post("", response_model=LipusDetailsResponse)
async def create_lipus_details(
    *,
    db: AsyncSession = Depends(deps.get_db),
    lipus_in: LipusDetailsCreate,
    request: Request,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    repo = ClinicalRepository(db)
    # Check if muayene exists
    muayene = await repo.get_examination(lipus_in.muayene_id)
    if not muayene:
        raise HTTPException(status_code=404, detail="Associated examination not found")
    
    # Check if details already exist
    existing = await repo.get_lipus_details(lipus_in.muayene_id)
    if existing:
         raise HTTPException(status_code=400, detail="Lipus details already exist for this examination")

    result = await repo.create_lipus_details(lipus_in.model_dump())
    
    await AuditService.log(
        db=db,
        action="LIPUS_DETAILS_CREATE",
        user_id=current_user.id,
        resource_type="lipus_details",
        resource_id=str(result.id),
        details={"muayene_id": str(result.muayene_id)},
    )
    return result

@router.put("/{id}", response_model=LipusDetailsResponse)
async def update_lipus_details(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    lipus_in: LipusDetailsUpdate,
    request: Request,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    repo = ClinicalRepository(db)
    updated = await repo.update_lipus_details(id, lipus_in.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Lipus details not found")
    
    await AuditService.log(
        db=db,
        action="LIPUS_DETAILS_UPDATE",
        user_id=current_user.id,
        resource_type="lipus_details",
        resource_id=str(id),
        details={},
    )
    return updated

@router.delete("/{id}")
async def delete_lipus_details(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    current_user: User = Depends(deps.get_current_active_superuser)
) -> Any:
    repo = ClinicalRepository(db)
    success = await repo.delete_lipus_details(id)
    if not success:
        raise HTTPException(status_code=404, detail="Lipus details not found")
    
    await AuditService.log(
        db=db,
        action="LIPUS_DETAILS_DELETE",
        user_id=current_user.id,
        resource_type="lipus_details",
        resource_id=str(id),
        details={},
    )
    return {"status": "success"}
