from typing import Any, List, Optional
from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.permissions import Action
from app.repositories.finance.income_repository import IncomeRepository
from app.services.orchestrators.finance_orchestrator import FinanceOrchestrator
from app.schemas.finance import (
    FinansIslemResponse,
    HastaCariResponse,
    AcikIslemResponse,
    HastaEkstreResponse,
    TopluTahsilatRequest,
    TopluTahsilatResponse,
)
from app.services.audit_service import AuditService
from app.models.user import User
from app.core.user_context import UserContext

router = APIRouter()

# RBAC: yetkiler PERMISSION_MATRIX["finance"] üzerinden işlem bazında uygulanır.
# Router seviyesinde tek rol listesi kullanmak salt-okunur rollerin de
# yazma uçlarına erişmesine yol açardı.
_read = deps.require_permission("finance", Action.READ)
_create = deps.require_permission("finance", Action.CREATE)


# =============================================================================
# HASTA CARİ
# =============================================================================
@router.get(
    "/patients/{hasta_id}/transactions", response_model=List[FinansIslemResponse],
    dependencies=[Depends(_read)],
)
async def get_hasta_islemler(
    hasta_id: str, db: AsyncSession = Depends(deps.get_db)
) -> Any:
    repo = IncomeRepository(db)
    return await repo.get_patient_transactions(UUID(hasta_id))


@router.get("/patients/{hasta_id}/balance", response_model=HastaCariResponse, dependencies=[Depends(_read)])
async def get_hasta_cari(hasta_id: str, db: AsyncSession = Depends(deps.get_db)) -> Any:
    repo = IncomeRepository(db)
    cari = await repo.get_patient_balance(UUID(hasta_id))
    return HastaCariResponse(**cari)


@router.get("/patients/{hasta_id}/statement", response_model=HastaEkstreResponse, dependencies=[Depends(_read)])
async def get_hasta_ekstre(
    hasta_id: str,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Hasta cari ekstresi — tarih sıralı borç/alacak dökümü ve yürüyen bakiye.

    Hastaya verilebilir hesap özeti; her tahakkuk ve her tahsilat ayrı satır.
    """
    repo = IncomeRepository(db)
    return await repo.get_patient_statement(
        UUID(hasta_id), start_date=start_date, end_date=end_date
    )


@router.get(
    "/patients/{hasta_id}/open-transactions", response_model=List[AcikIslemResponse],
    dependencies=[Depends(_read)],
)
async def get_hasta_acik_islemler(
    hasta_id: str, db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """Hastanın tamamı tahsil edilmemiş gelir işlemleri — en eski vade önce."""
    repo = IncomeRepository(db)
    return await repo.get_open_transactions(UUID(hasta_id))


@router.post("/patients/{hasta_id}/collect", response_model=TopluTahsilatResponse, dependencies=[Depends(_create)])
async def toplu_tahsilat(
    hasta_id: str,
    *,
    db: AsyncSession = Depends(deps.get_db),
    tahsilat_in: TopluTahsilatRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Hastanın açık borçlarına toplu tahsilat dağıtır (en eski vadeden başlayarak).

    Ön masada hasta tek tutar öderken hangi faturaya ne kadar yazılacağı
    otomatik hesaplanır.
    """
    orchestrator = FinanceOrchestrator(
        db, UserContext(user_id=current_user.id, username=current_user.username)
    )
    try:
        sonuc = await orchestrator.collect_bulk(
            patient_id=UUID(hasta_id),
            tutar=tahsilat_in.tutar,
            kasa_id=tahsilat_in.kasa_id,
            odeme_yontemi=tahsilat_in.odeme_yontemi,
            odeme_tarihi=tahsilat_in.odeme_tarihi,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    await AuditService.log(
        db=db,
        action="finans_toplu_tahsilat",
        user_id=current_user.id,
        resource_type="patient",
        resource_id=hasta_id,
        details=sonuc,
    )
    return sonuc


@router.get("/patients/debtors", response_model=List[HastaCariResponse], dependencies=[Depends(_read)])
async def get_borclu_hastalar(
    min_borc: float = Query(0, ge=0),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """Borçlu hastaları listele (bakiyeye göre azalan)"""
    repo = IncomeRepository(db)
    return await repo.get_debtor_patients(min_borc=min_borc, skip=skip, limit=limit)
