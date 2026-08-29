from typing import Any, List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.repositories.clinical.repository import ClinicalRepository
from app.schemas.clinical import (
    MuayeneCreate,
    MuayeneUpdate,
    MuayeneResponse,
)
from app.services.audit_service import AuditService
from app.models.user import User

router = APIRouter(dependencies=[Depends(deps.get_current_user)])

@router.get("/muayeneler/report", response_model=List[MuayeneResponse])
async def read_muayeneler_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    repo = ClinicalRepository(db)
    return await repo.get_all_muayeneler(
        start_date=start_date, end_date=end_date, search=search
    )


@router.get("/patients/{hasta_id}/muayeneler", response_model=List[MuayeneResponse])
async def read_muayeneler(
    hasta_id: str, db: AsyncSession = Depends(deps.get_db)
) -> Any:
    try:
        from app.controllers.legacy_adapters.clinical_adapter import (
            ClinicalLegacyAdapter,
        )

        adapter = ClinicalLegacyAdapter(db)
        return await adapter.get_patient_muayeneler(hasta_id)
    except Exception as e:
        import traceback
        print(f"🔥 muayeneler error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="İşlem sırasında bir hata oluştu")


@router.get("/muayeneler/{id}", response_model=MuayeneResponse)
async def read_muayene(*, db: AsyncSession = Depends(deps.get_db), id: UUID) -> Any:
    try:
        from app.controllers.legacy_adapters.clinical_adapter import (
            ClinicalLegacyAdapter,
        )

        adapter = ClinicalLegacyAdapter(db)
        muayene = await adapter.orchestrator.clinical_repo.get_examination(id)
        if not muayene:
            raise HTTPException(status_code=404, detail="Examination not found")
        return muayene
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"read_muayene error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="İşlem sırasında bir hata oluştu")


@router.post("/muayeneler", response_model=MuayeneResponse)
async def create_muayene(
    *,
    db: AsyncSession = Depends(deps.get_db),
    muayene_in: MuayeneCreate,
    request: Request,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    try:
        from app.controllers.legacy_adapters.clinical_adapter import (
            ClinicalLegacyAdapter,
        )
        from app.core.user_context import UserContext

        context = UserContext(
            user_id=current_user.id,
            username=current_user.username,
            ip_address=request.client.host,
        )
        adapter = ClinicalLegacyAdapter(db, context)
        result = await adapter.create_muayene(muayene_in.model_dump())

        await AuditService.log(
            db=db,
            action="MUAYENE_CREATE",
            user_id=current_user.id,
            resource_type="muayene",
            resource_id=str(result.id),
            details={"hasta_id": str(result.hasta_id), "tarih": str(result.tarih)},
        )
        return result
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"create_muayene error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="İşlem sırasında bir hata oluştu")


@router.put("/muayeneler/{id}", response_model=MuayeneResponse)
async def update_muayene(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    muayene_in: MuayeneUpdate,
    request: Request,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    try:
        from app.controllers.legacy_adapters.clinical_adapter import (
            ClinicalLegacyAdapter,
        )
        from app.core.user_context import UserContext

        context = UserContext(
            user_id=current_user.id,
            username=current_user.username,
            ip_address=request.client.host,
        )
        adapter = ClinicalLegacyAdapter(db, context)
        updated_muayene = await adapter.update_muayene(
            id, muayene_in.model_dump(exclude_unset=True)
        )
        if not updated_muayene:
            raise HTTPException(status_code=404, detail="Examination not found")

        await AuditService.log(
            db=db,
            action="MUAYENE_UPDATE",
            user_id=current_user.id,
            resource_type="muayene",
            resource_id=str(updated_muayene.id),
            details={"hasta_id": str(updated_muayene.hasta_id)},
        )
        return updated_muayene
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"update_muayene error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="İşlem sırasında bir hata oluştu")


@router.delete("/muayeneler/{id}")
async def delete_muayene(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    request: Request,
    current_user: User = Depends(deps.get_current_active_superuser)
) -> Any:
    try:
        from app.controllers.legacy_adapters.clinical_adapter import (
            ClinicalLegacyAdapter,
        )
        from app.core.user_context import UserContext

        context = UserContext(
            user_id=current_user.id,
            username=current_user.username,
            ip_address=request.client.host,
        )
        adapter = ClinicalLegacyAdapter(db, context)
        result = await adapter.delete_muayene(id)
        if not result:
            raise HTTPException(status_code=404, detail="Examination not found")

        await AuditService.log(
            db=db,
            action="MUAYENE_DELETE",
            user_id=current_user.id,
            resource_type="muayene",
            resource_id=str(id),
            details={},
        )
        return {"status": "success", "id": id}
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"delete_muayene error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="İşlem sırasında bir hata oluştu")
