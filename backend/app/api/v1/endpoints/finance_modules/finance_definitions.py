from typing import Any, List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.permissions import UserRole, Action
from app.repositories.finance.accounts_repository import AccountsRepository
from app.repositories.finance.expense_repository import ExpenseRepository
from app.schemas.finance import (
    FinansKategoriResponse,
    FinansKategoriCreate,
    FinansKategoriUpdate,
    FinansHizmetResponse,
    FinansHizmetCreate,
    FinansHizmetUpdate,
    KasaResponse,
    KasaCreate,
    KasaUpdate,
    KasaTransferRequest,
    KasaHareketResponse,
    FirmaResponse,
    FirmaCreate,
    FirmaUpdate,
)
from app.services.audit_service import AuditService
from app.models.user import User

router = APIRouter()

# RBAC: yetkiler PERMISSION_MATRIX["finance"] üzerinden işlem bazında uygulanır.
# Router seviyesinde tek rol listesi kullanmak salt-okunur rollerin de
# yazma uçlarına erişmesine yol açardı.
_read = deps.require_permission("finance", Action.READ)
_create = deps.require_permission("finance", Action.CREATE)
_update = deps.require_permission("finance", Action.UPDATE)


# =============================================================================
# KATEGORİLER
# =============================================================================
@router.get("/categories", response_model=List[FinansKategoriResponse], dependencies=[Depends(_read)])
async def get_kategoriler(
    tip: Optional[str] = Query(None, description="'gelir' veya 'gider'"),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """Finans kategorilerini listele"""
    repo = AccountsRepository(db)
    return await repo.get_categories(tip=tip)


@router.get("/categories/{kategori_id}", response_model=FinansKategoriResponse, dependencies=[Depends(_read)])
async def get_kategori(
    kategori_id: int, db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """Kategori detayını getir"""
    repo = AccountsRepository(db)
    kategori = await repo.get_category(kategori_id)
    if not kategori:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    return kategori


@router.post("/categories", response_model=FinansKategoriResponse, dependencies=[Depends(_create)])
async def create_kategori(
    *,
    db: AsyncSession = Depends(deps.get_db),
    kategori_in: FinansKategoriCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Yeni kategori oluştur"""
    repo = AccountsRepository(db)
    kategori = await repo.create_category(kategori_in)

    await AuditService.log(
        db,
        action="category_created",
        resource_type="finance_category",
        resource_id=str(kategori.id),
        user_id=current_user.id,
        details={"ad": kategori.ad, "tip": kategori.tip},
    )

    return kategori


@router.put("/categories/{kategori_id}", response_model=FinansKategoriResponse, dependencies=[Depends(_update)])
async def update_kategori(
    kategori_id: int,
    *,
    db: AsyncSession = Depends(deps.get_db),
    kategori_in: FinansKategoriUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Kategori güncelle"""
    repo = AccountsRepository(db)
    kategori = await repo.update_category(kategori_id, kategori_in)
    if not kategori:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")

    await AuditService.log(
        db,
        action="category_updated",
        resource_type="finance_category",
        resource_id=str(kategori_id),
        user_id=current_user.id,
        details={"ad": kategori.ad},
    )

    return kategori


@router.delete("/categories/{kategori_id}")
async def delete_kategori(
    kategori_id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.require_role(UserRole.ADMIN))
) -> Any:
    """Kategori sil"""
    repo = AccountsRepository(db)
    try:
        result = await repo.delete_category(kategori_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not result:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    return {"success": True}


# =============================================================================
# HİZMETLER
# =============================================================================
@router.get("/services", response_model=List[FinansHizmetResponse], dependencies=[Depends(_read)])
async def get_hizmetler(
    aktif_only: bool = Query(True), db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """Hizmet/ürün listesini getir"""
    repo = AccountsRepository(db)
    return await repo.get_services(aktif_only=aktif_only)


@router.get("/services/{hizmet_id}", response_model=FinansHizmetResponse, dependencies=[Depends(_read)])
async def get_hizmet(hizmet_id: int, db: AsyncSession = Depends(deps.get_db)) -> Any:
    """Hizmet detayını getir"""
    repo = AccountsRepository(db)
    hizmet = await repo.get_service(hizmet_id)
    if not hizmet:
        raise HTTPException(status_code=404, detail="Hizmet bulunamadı")
    return hizmet


@router.post("/services", response_model=FinansHizmetResponse, dependencies=[Depends(_create)])
async def create_hizmet(
    *,
    db: AsyncSession = Depends(deps.get_db),
    hizmet_in: FinansHizmetCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Yeni hizmet oluştur"""
    repo = AccountsRepository(db)
    hizmet = await repo.create_service(hizmet_in)

    await AuditService.log(
        db,
        action="service_created",
        resource_type="finance_service",
        resource_id=str(hizmet.id),
        user_id=current_user.id,
        details={"ad": hizmet.ad, "fiyat": float(hizmet.varsayilan_fiyat or 0)},
    )

    return hizmet


@router.put("/services/{hizmet_id}", response_model=FinansHizmetResponse, dependencies=[Depends(_update)])
async def update_hizmet(
    hizmet_id: int,
    *,
    db: AsyncSession = Depends(deps.get_db),
    hizmet_in: FinansHizmetUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Hizmet güncelle"""
    repo = AccountsRepository(db)
    hizmet = await repo.update_service(hizmet_id, hizmet_in)
    if not hizmet:
        raise HTTPException(status_code=404, detail="Hizmet bulunamadı")

    await AuditService.log(
        db,
        action="service_updated",
        resource_type="finance_service",
        resource_id=str(hizmet_id),
        user_id=current_user.id,
        details={"ad": hizmet.ad},
    )

    return hizmet


@router.delete("/services/{hizmet_id}")
async def delete_hizmet(hizmet_id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.require_role(UserRole.ADMIN))) -> Any:
    """Hizmet sil"""
    repo = AccountsRepository(db)
    try:
        result = await repo.delete_service(hizmet_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not result:
        raise HTTPException(status_code=404, detail="Hizmet bulunamadı")
    return {"success": True}


# =============================================================================
# KASALAR
# =============================================================================
@router.get("/accounts", response_model=List[KasaResponse], dependencies=[Depends(_read)])
async def get_kasalar(
    aktif_only: bool = Query(True), db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """Kasa/hesap listesini getir"""
    repo = AccountsRepository(db)
    return await repo.get_accounts(aktif_only=aktif_only)


@router.get("/accounts/{kasa_id}", response_model=KasaResponse, dependencies=[Depends(_read)])
async def get_kasa(kasa_id: int, db: AsyncSession = Depends(deps.get_db)) -> Any:
    """Kasa detayını getir"""
    repo = AccountsRepository(db)
    kasa = await repo.get_account(kasa_id)
    if not kasa:
        raise HTTPException(status_code=404, detail="Kasa bulunamadı")
    return kasa


@router.get("/accounts/{kasa_id}/balance", dependencies=[Depends(_read)])
async def get_kasa_bakiye(kasa_id: int, db: AsyncSession = Depends(deps.get_db)) -> Any:
    """Kasa anlık bakiyesini getir"""
    repo = AccountsRepository(db)
    kasa = await repo.get_account(kasa_id)
    if not kasa:
        raise HTTPException(status_code=404, detail="Kasa bulunamadı")
    return {"kasa_id": kasa_id, "ad": kasa.ad, "bakiye": float(kasa.bakiye or 0)}


@router.get("/accounts/{kasa_id}/movements", response_model=List[KasaHareketResponse], dependencies=[Depends(_read)])
async def get_kasa_hareketleri(
    kasa_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """Kasa hareketlerini listele (tarihe göre azalan)"""
    repo = AccountsRepository(db)
    return await repo.get_account_movements(
        kasa_id, skip=skip, limit=limit, start_date=start_date, end_date=end_date
    )


@router.post("/accounts", response_model=KasaResponse, dependencies=[Depends(_create)])
async def create_kasa(
    *,
    db: AsyncSession = Depends(deps.get_db),
    kasa_in: KasaCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Yeni kasa oluştur"""
    repo = AccountsRepository(db)
    kasa = await repo.create_account(kasa_in)

    await AuditService.log(
        db,
        action="account_created",
        resource_type="finance_account",
        resource_id=str(kasa.id),
        user_id=current_user.id,
        details={"ad": kasa.ad, "tip": kasa.tip},
    )

    return kasa


@router.put("/accounts/{kasa_id}", response_model=KasaResponse, dependencies=[Depends(_update)])
async def update_kasa(
    kasa_id: int,
    *,
    db: AsyncSession = Depends(deps.get_db),
    kasa_in: KasaUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Kasa bilgilerini güncelle"""
    repo = AccountsRepository(db)
    kasa = await repo.update_account(kasa_id, kasa_in)
    if not kasa:
        raise HTTPException(status_code=404, detail="Kasa bulunamadı")

    await AuditService.log(
        db,
        action="account_updated",
        resource_type="finance_account",
        resource_id=str(kasa_id),
        user_id=current_user.id,
        details={"ad": kasa.ad},
    )

    return kasa


@router.delete("/accounts/{kasa_id}")
async def delete_kasa(kasa_id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.require_role(UserRole.ADMIN))) -> Any:
    """Kasayı kapat (pasife al). Hareket geçmişi korunur."""
    repo = AccountsRepository(db)
    try:
        result = await repo.delete_account(kasa_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not result:
        raise HTTPException(status_code=404, detail="Kasa bulunamadı")
    return {"success": True}


@router.post("/accounts/transfer", dependencies=[Depends(_create)])
async def transfer_between_accounts(
    *,
    db: AsyncSession = Depends(deps.get_db),
    transfer_in: KasaTransferRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Kasalar arası transfer yap"""
    repo = AccountsRepository(db)
    try:
        result = await repo.transfer_between_accounts(
            kaynak_id=transfer_in.kaynak_kasa_id,
            hedef_id=transfer_in.hedef_kasa_id,
            tutar=transfer_in.tutar,
            aciklama=transfer_in.aciklama,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not result:
        raise HTTPException(status_code=404, detail="Kaynak veya hedef kasa bulunamadı")

    await AuditService.log(
        db=db,
        action="kasa_transfer",
        user_id=current_user.id,
        resource_type="finance_account",
        resource_id=f"{transfer_in.kaynak_kasa_id}->{transfer_in.hedef_kasa_id}",
        details={**result, "aciklama": transfer_in.aciklama},
    )

    return {"success": True, **result}


# =============================================================================
# FİRMALAR
# =============================================================================
@router.get("/companies", response_model=List[FirmaResponse], dependencies=[Depends(_read)])
async def get_firmalar(db: AsyncSession = Depends(deps.get_db)) -> Any:
    """Firma listesini getir"""
    repo = ExpenseRepository(db)
    return await repo.get_firms()


@router.get("/companies/debts", dependencies=[Depends(_read)])
async def get_firma_borclar(db: AsyncSession = Depends(deps.get_db)) -> Any:
    """Tüm firma borçlarını listele"""
    repo = ExpenseRepository(db)
    return await repo.get_firm_debt_list()


@router.get("/companies/{firma_id}", response_model=FirmaResponse, dependencies=[Depends(_read)])
async def get_firma(firma_id: int, db: AsyncSession = Depends(deps.get_db)) -> Any:
    """Firma detayını ve borç durumunu getir"""
    repo = ExpenseRepository(db)
    firma = await repo.get_firm(firma_id)
    if not firma:
        raise HTTPException(status_code=404, detail="Firma bulunamadı")

    toplam_borc = await repo.get_firm_debt(firma_id)
    response = FirmaResponse.model_validate(firma)
    response.toplam_borc = toplam_borc
    return response


@router.post("/companies", response_model=FirmaResponse, dependencies=[Depends(_create)])
async def create_firma(
    *, db: AsyncSession = Depends(deps.get_db), firma_in: FirmaCreate
) -> Any:
    """Yeni firma oluştur"""
    repo = ExpenseRepository(db)
    return await repo.create_firm(firma_in)


@router.put("/companies/{firma_id}", response_model=FirmaResponse, dependencies=[Depends(_update)])
async def update_firma(
    firma_id: int, *, db: AsyncSession = Depends(deps.get_db), firma_in: FirmaUpdate
) -> Any:
    """Firma bilgilerini güncelle"""
    repo = ExpenseRepository(db)
    firma = await repo.update_firm(firma_id, firma_in)
    if not firma:
        raise HTTPException(status_code=404, detail="Firma bulunamadı")
    return firma
