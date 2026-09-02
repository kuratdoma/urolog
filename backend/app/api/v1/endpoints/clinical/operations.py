from typing import Any, List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.core.permissions import Action
from app.repositories.clinical.repository import ClinicalRepository
from app.schemas.clinical import (
    OperasyonCreate,
    OperasyonResponse,
    OperasyonUpdate,
)
from app.services.audit_service import AuditService
from app.models.user import User

router = APIRouter(dependencies=[Depends(deps.get_current_user)])

# RBAC: yetkiler PERMISSION_MATRIX["operations"] üzerinden işlem bazında uygulanır.
# Router seviyesinde tek rol listesi kullanmak salt-okunur rollerin de
# yazma uçlarına erişmesine yol açardı.
_read = deps.require_permission("operations", Action.READ)
_create = deps.require_permission("operations", Action.CREATE)
_update = deps.require_permission("operations", Action.UPDATE)


@router.get("/operasyonlar/report", response_model=List[OperasyonResponse], dependencies=[Depends(_read)])
async def read_operasyonlar_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    repo = ClinicalRepository(db)
    return await repo.get_all_operasyonlar(
        start_date=start_date, end_date=end_date, search=search
    )


@router.get("/patients/{hasta_id}/operasyonlar", response_model=List[OperasyonResponse], dependencies=[Depends(_read)])
async def read_operasyonlar(
    hasta_id: str, db: AsyncSession = Depends(deps.get_db)
) -> Any:
    try:
        from app.controllers.legacy_adapters.clinical_adapter import (
            ClinicalLegacyAdapter,
        )

        adapter = ClinicalLegacyAdapter(db)
        return await adapter.get_patient_operasyonlar(hasta_id)
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"read_operasyonlar error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="İşlem sırasında bir hata oluştu")


@router.get("/operasyonlar/{id}", response_model=OperasyonResponse, dependencies=[Depends(_read)])
async def read_operasyon(*, db: AsyncSession = Depends(deps.get_db), id: UUID) -> Any:
    try:
        from app.controllers.legacy_adapters.clinical_adapter import (
            ClinicalLegacyAdapter,
        )

        adapter = ClinicalLegacyAdapter(db)
        result = await adapter.orchestrator.clinical_repo.get_operation(id)
        if not result:
            raise HTTPException(status_code=404, detail="Operation not found")
        return result
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"read_operasyon error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="İşlem sırasında bir hata oluştu")


@router.post("/operasyonlar", response_model=OperasyonResponse, dependencies=[Depends(_create)])
async def create_operasyon(
    *,
    db: AsyncSession = Depends(deps.get_db),
    operasyon_in: OperasyonCreate,
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
        result = await adapter.create_operasyon(operasyon_in.model_dump())

        await AuditService.log(
            db=db,
            action="OPERASYON_CREATE",
            user_id=current_user.id,
            resource_type="operasyon",
            resource_id=str(result.id),
            details={"hasta_id": str(result.hasta_id)},
        )
        return result
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"create_operasyon error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="İşlem sırasında bir hata oluştu")


@router.put("/operasyonlar/{id}", response_model=OperasyonResponse, dependencies=[Depends(_update)])
async def update_operasyon(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    operasyon_in: OperasyonUpdate,
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
        result = await adapter.update_operasyon(
            id, operasyon_in.model_dump(exclude_unset=True)
        )
        if not result:
            raise HTTPException(status_code=404, detail="Operation not found")

        await AuditService.log(
            db=db,
            action="OPERASYON_UPDATE",
            user_id=current_user.id,
            resource_type="operasyon",
            resource_id=str(result.id),
            details={"hasta_id": str(result.hasta_id)},
        )
        return result
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"update_operasyon error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="İşlem sırasında bir hata oluştu")


@router.delete("/operasyonlar/{id}")
async def delete_operasyon(
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
        result = await adapter.delete_operasyon(id)
        if not result:
            raise HTTPException(status_code=404, detail="Operation not found")

        await AuditService.log(
            db=db,
            action="OPERASYON_DELETE",
            user_id=current_user.id,
            resource_type="operasyon",
            resource_id=str(id),
            details={},
        )
        return {"status": "success", "id": id}
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"delete_operasyon error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="İşlem sırasında bir hata oluştu")
