from typing import Any, Optional
from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.permissions import UserRole, Action
from app.repositories.finance.income_repository import IncomeRepository
from app.services.orchestrators.finance_orchestrator import FinanceOrchestrator
from app.schemas.finance import (
    FinansIslemResponse,
    FinansIslemCreate,
    FinansIslemUpdate,
    FinansIslemPaginationResponse,
    FinansIslemIptalRequest,
    FinansOdemeCreate,
    FinansTaksitResponse,
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
_update = deps.require_permission("finance", Action.UPDATE)
_delete = deps.require_permission("finance", Action.DELETE)


# =============================================================================
# FİNANS İŞLEMLERİ
# =============================================================================
@router.get("/transactions", response_model=FinansIslemPaginationResponse, dependencies=[Depends(_read)])
async def get_islemler(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    islem_tipi: Optional[str] = Query(None),
    durum: Optional[str] = Query(None),
    kategori_id: Optional[int] = Query(None),
    hasta_id: Optional[str] = Query(None),
    firma_id: Optional[int] = Query(None),
    kasa_id: Optional[int] = Query(None),
    referans: Optional[str] = Query(None),
    vade_gecmis: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """Finans işlemlerini filtreli ve sayfalı listele"""
    repo = IncomeRepository(db)

    try:
        hasta_uuid = UUID(hasta_id) if hasta_id else None
    except ValueError:
        raise HTTPException(status_code=422, detail="Geçersiz hasta_id formatı")

    items, total = await repo.search_transactions(
        start_date=start_date,
        end_date=end_date,
        islem_tipi=islem_tipi,
        durum=durum,
        kategori_id=kategori_id,
        hasta_id=hasta_uuid,
        firma_id=firma_id,
        kasa_id=kasa_id,
        referans=referans,
        vade_gecmis=vade_gecmis,
        skip=skip,
        limit=limit,
    )
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/transactions/{islem_id}", response_model=FinansIslemResponse, dependencies=[Depends(_read)])
async def get_islem(islem_id: int, db: AsyncSession = Depends(deps.get_db)) -> Any:
    """İşlem detayını getir"""
    repo = IncomeRepository(db)
    islem = await repo.get_transaction(islem_id)
    if not islem:
        raise HTTPException(status_code=404, detail="İşlem bulunamadı")
    return islem


@router.post("/transactions", response_model=FinansIslemResponse, dependencies=[Depends(_create)])
async def create_islem(
    *,
    db: AsyncSession = Depends(deps.get_db),
    islem_in: FinansIslemCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Yeni finans işlemi oluştur"""
    orchestrator = FinanceOrchestrator(
        db, UserContext(user_id=current_user.id, username=current_user.username)
    )
    try:
        islem = await orchestrator.create_transaction_safely(islem_in.model_dump())

        await AuditService.log(
            db=db,
            action="finans_islem_create",
            user_id=current_user.id,
            resource_type="finans_islem",
            resource_id=str(islem.id),
            details={"tutar": float(islem.net_tutar)},
        )
        return islem
    except ValueError:
        raise HTTPException(
            status_code=400, detail="İşlem oluşturulurken bir doğrulama hatası oluştu"
        )


@router.post(
    "/transactions/{islem_id}/payments", response_model=FinansIslemResponse,
    dependencies=[Depends(_create)],
)
async def add_islem_odeme(
    islem_id: int,
    *,
    db: AsyncSession = Depends(deps.get_db),
    odeme_in: FinansOdemeCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Mevcut işleme ödeme (tahsilat) ekler.

    Kasa bakiyesi güncellenir, hareket kaydı üretilir, taksitliyse plan çıkarılır
    ve tahsilat tamamlandığında işlem durumu 'tamamlandi' olur.
    """
    orchestrator = FinanceOrchestrator(
        db, UserContext(user_id=current_user.id, username=current_user.username)
    )
    try:
        islem = await orchestrator.add_payment(islem_id, odeme_in)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    await AuditService.log(
        db=db,
        action="finans_odeme_create",
        user_id=current_user.id,
        resource_type="finans_islem",
        resource_id=str(islem_id),
        details={"tutar": float(odeme_in.tutar), "kasa_id": odeme_in.kasa_id},
    )
    return islem


@router.delete(
    "/transactions/{islem_id}/payments/{odeme_id}", response_model=FinansIslemResponse,
    dependencies=[Depends(_delete)],
)
async def delete_islem_odeme(
    islem_id: int,
    odeme_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Yanlış girilmiş bir tahsilatı siler.

    Kasa etkisi ters hareketle geri alınır, taksit planı varsa birlikte silinir
    ve işlem durumu yeniden hesaplanır.
    """
    repo = IncomeRepository(
        db, UserContext(user_id=current_user.id, username=current_user.username)
    )
    try:
        silindi = await repo.delete_payment(islem_id, odeme_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not silindi:
        raise HTTPException(status_code=404, detail="Ödeme bulunamadı")

    await AuditService.log(
        db=db,
        action="finans_odeme_delete",
        user_id=current_user.id,
        resource_type="finans_islem",
        resource_id=str(islem_id),
        details={"odeme_id": odeme_id},
    )
    return await repo.get_transaction(islem_id)


@router.post("/installments/{taksit_id}/collect", response_model=FinansTaksitResponse, dependencies=[Depends(_create)])
async def tahsil_et_taksit(
    taksit_id: int,
    tahsil_tarihi: Optional[date] = Query(None, description="Boş bırakılırsa bugün"),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Taksiti tahsil edildi olarak işaretler.

    Kasa bakiyesini etkilemez — taksitli ödemede tutar, ödeme kaydı sırasında
    kasaya zaten girmiştir. Bu uç yalnızca taksit takibini günceller.
    """
    repo = IncomeRepository(db)
    taksit = await repo.collect_installment(taksit_id, tahsil_tarihi)
    if not taksit:
        raise HTTPException(status_code=404, detail="Taksit bulunamadı")

    await AuditService.log(
        db=db,
        action="finans_taksit_collect",
        user_id=current_user.id,
        resource_type="finans_taksit",
        resource_id=str(taksit_id),
        details={"tutar": float(taksit.tutar), "tarih": str(taksit.tahsil_tarihi)},
    )
    return taksit


@router.post("/installments/{taksit_id}/uncollect", response_model=FinansTaksitResponse, dependencies=[Depends(_create)])
async def tahsilat_geri_al_taksit(
    taksit_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Yanlış işaretlenmiş taksit tahsilatını geri alır."""
    repo = IncomeRepository(db)
    taksit = await repo.uncollect_installment(taksit_id)
    if not taksit:
        raise HTTPException(status_code=404, detail="Taksit bulunamadı")

    await AuditService.log(
        db=db,
        action="finans_taksit_uncollect",
        user_id=current_user.id,
        resource_type="finans_taksit",
        resource_id=str(taksit_id),
        details={"tutar": float(taksit.tutar)},
    )
    return taksit


@router.put("/transactions/{islem_id}", response_model=FinansIslemResponse, dependencies=[Depends(_update)])
async def update_islem(
    islem_id: int,
    *,
    db: AsyncSession = Depends(deps.get_db),
    islem_in: FinansIslemUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    İşlemin üst bilgilerini güncelle.

    Tutar/kasa değişiklikleri kasa bakiyesini etkilediğinden burada ele alınmaz;
    bunun için işlemi iptal edip yeniden oluşturun.
    """
    orchestrator = FinanceOrchestrator(
        db, UserContext(user_id=current_user.id, username=current_user.username)
    )
    try:
        islem = await orchestrator.update_transaction(
            islem_id, islem_in.model_dump(exclude_unset=True)
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not islem:
        raise HTTPException(status_code=404, detail="İşlem bulunamadı")

    await AuditService.log(
        db=db,
        action="finans_islem_update",
        user_id=current_user.id,
        resource_type="finans_islem",
        resource_id=str(islem_id),
        details={"alanlar": list(islem_in.model_dump(exclude_unset=True).keys())},
    )
    return islem


@router.post("/transactions/{islem_id}/cancel", response_model=FinansIslemResponse, dependencies=[Depends(_create)])
async def cancel_islem(
    islem_id: int,
    *,
    db: AsyncSession = Depends(deps.get_db),
    iptal_in: FinansIslemIptalRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """İşlemi iptal et"""
    orchestrator = FinanceOrchestrator(
        db, UserContext(user_id=current_user.id, username=current_user.username)
    )
    islem = await orchestrator.cancel_transaction(islem_id, iptal_in.iptal_nedeni)
    if not islem:
        raise HTTPException(status_code=404, detail="İşlem bulunamadı")
    return islem


@router.delete("/transactions/{islem_id}")
async def delete_islem(
    islem_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.require_role(UserRole.ADMIN)),
) -> Any:
    """İşlemi sil"""
    orchestrator = FinanceOrchestrator(
        db, UserContext(user_id=current_user.id, username=current_user.username)
    )
    result = await orchestrator.delete_transaction(islem_id)
    if not result:
        raise HTTPException(status_code=404, detail="İşlem bulunamadı")
    return {"success": True}
