from typing import Any, List, Optional
from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.permissions import UserRole
from app.repositories.finance.accounts_repository import AccountsRepository
from app.repositories.finance.income_repository import IncomeRepository
from app.repositories.finance.expense_repository import ExpenseRepository
from app.services.orchestrators.finance_orchestrator import FinanceOrchestrator
from app.schemas.finance import (
    # Kategoriler
    FinansKategoriResponse,
    FinansKategoriCreate,
    FinansKategoriUpdate,
    # Hizmetler (Yeni)
    FinansHizmetResponse,
    FinansHizmetCreate,
    FinansHizmetUpdate,
    # Kasalar (Yeni)
    KasaResponse,
    KasaCreate,
    KasaUpdate,
    KasaTransferRequest,
    KasaHareketResponse,
    # Firmalar
    FirmaResponse,
    FirmaCreate,
    FirmaUpdate,
    # İşlemler
    FinansIslemResponse,
    FinansIslemCreate,
    FinansIslemUpdate,
    FinansIslemPaginationResponse,
    FinansIslemIptalRequest,
    HastaCariResponse,
    FinansOzetResponse,
    GunlukOzetResponse,
    AylikOzetResponse,
)
from app.services.audit_service import AuditService
from app.models.user import User
from app.core.user_context import UserContext
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    # RBAC: Only ADMIN and DOCTOR can access finance module
    dependencies=[Depends(deps.require_role(UserRole.ADMIN, UserRole.DOCTOR))]
)


# =============================================================================
# KATEGORİLER
# =============================================================================
@router.get("/categories", response_model=List[FinansKategoriResponse])
async def get_kategoriler(
    tip: Optional[str] = Query(None, description="'gelir' veya 'gider'"),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """Finans kategorilerini listele"""
    repo = AccountsRepository(db)
    return await repo.get_categories(tip=tip)


@router.get("/categories/{kategori_id}", response_model=FinansKategoriResponse)
async def get_kategori(
    kategori_id: int, db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """Kategori detayını getir"""
    repo = AccountsRepository(db)
    kategori = await repo.get_category(kategori_id)
    if not kategori:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    return kategori


@router.post("/categories", response_model=FinansKategoriResponse)
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


@router.put("/categories/{kategori_id}", response_model=FinansKategoriResponse)
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
    result = await repo.delete_category(kategori_id)
    if not result:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    return {"success": True}


# =============================================================================
# HİZMETLER
# =============================================================================
@router.get("/services", response_model=List[FinansHizmetResponse])
async def get_hizmetler(
    aktif_only: bool = Query(True), db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """Hizmet/ürün listesini getir"""
    repo = AccountsRepository(db)
    return await repo.get_services(aktif_only=aktif_only)


@router.get("/services/{hizmet_id}", response_model=FinansHizmetResponse)
async def get_hizmet(hizmet_id: int, db: AsyncSession = Depends(deps.get_db)) -> Any:
    """Hizmet detayını getir"""
    repo = AccountsRepository(db)
    hizmet = await repo.get_service(hizmet_id)
    if not hizmet:
        raise HTTPException(status_code=404, detail="Hizmet bulunamadı")
    return hizmet


@router.post("/services", response_model=FinansHizmetResponse)
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


@router.put("/services/{hizmet_id}", response_model=FinansHizmetResponse)
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
    result = await repo.delete_service(hizmet_id)
    if not result:
        raise HTTPException(status_code=404, detail="Hizmet bulunamadı")
    return {"success": True}


# =============================================================================
# KASALAR
# =============================================================================
@router.get("/accounts", response_model=List[KasaResponse])
async def get_kasalar(
    aktif_only: bool = Query(True), db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """Kasa/hesap listesini getir"""
    repo = AccountsRepository(db)
    return await repo.get_accounts(aktif_only=aktif_only)


@router.get("/accounts/{kasa_id}", response_model=KasaResponse)
async def get_kasa(kasa_id: int, db: AsyncSession = Depends(deps.get_db)) -> Any:
    """Kasa detayını getir"""
    repo = AccountsRepository(db)
    kasa = await repo.get_account(kasa_id)
    if not kasa:
        raise HTTPException(status_code=404, detail="Kasa bulunamadı")
    return kasa


@router.get("/accounts/{kasa_id}/balance")
async def get_kasa_bakiye(kasa_id: int, db: AsyncSession = Depends(deps.get_db)) -> Any:
    """Kasa anlık bakiyesini getir"""
    repo = AccountsRepository(db)
    kasa = await repo.get_account(kasa_id)
    if not kasa:
        raise HTTPException(status_code=404, detail="Kasa bulunamadı")
    return {"kasa_id": kasa_id, "ad": kasa.ad, "bakiye": float(kasa.bakiye or 0)}


@router.get("/accounts/{kasa_id}/movements", response_model=List[KasaHareketResponse])
async def get_kasa_hareketleri(
    kasa_id: int,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """Kasa hareketlerini listele"""
    repo = AccountsRepository(db)
    return await repo.get_account_movements(kasa_id, limit=limit)


@router.post("/accounts", response_model=KasaResponse)
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


@router.put("/accounts/{kasa_id}", response_model=KasaResponse)
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
    """Kasa sil"""
    repo = AccountsRepository(db)
    result = await repo.delete_account(kasa_id)
    if not result:
        raise HTTPException(status_code=400, detail="Kasa silinemedi")
    return {"success": True}


@router.post("/accounts/transfer")
async def transfer_between_accounts(
    *,
    db: AsyncSession = Depends(deps.get_db),
    transfer_in: KasaTransferRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Kasalar arası transfer yap"""
    repo = AccountsRepository(db)
    result = await repo.transfer_between_accounts(
        kaynak_id=transfer_in.kaynak_kasa_id,
        hedef_id=transfer_in.hedef_kasa_id,
        tutar=transfer_in.tutar,
        aciklama=transfer_in.aciklama,
    )
    if not result:
        raise HTTPException(status_code=400, detail="Transfer yapılamadı")

    await AuditService.log(
        db=db,
        action="kasa_transfer",
        user_id=current_user.id,
        resource_type="finance_account",
        resource_id=f"{transfer_in.kaynak_kasa_id}->{transfer_in.hedef_kasa_id}",
        details={"tutar": transfer_in.tutar},
    )

    return {"success": True}


# =============================================================================
# FİRMALAR
# =============================================================================
@router.get("/companies", response_model=List[FirmaResponse])
async def get_firmalar(db: AsyncSession = Depends(deps.get_db)) -> Any:
    """Firma listesini getir"""
    repo = ExpenseRepository(db)
    return await repo.get_firms()


@router.get("/companies/debts")
async def get_firma_borclar(db: AsyncSession = Depends(deps.get_db)) -> Any:
    """Tüm firma borçlarını listele"""
    repo = ExpenseRepository(db)
    return await repo.get_firm_debt_list()


@router.get("/companies/{firma_id}", response_model=FirmaResponse)
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


@router.post("/companies", response_model=FirmaResponse)
async def create_firma(
    *, db: AsyncSession = Depends(deps.get_db), firma_in: FirmaCreate
) -> Any:
    """Yeni firma oluştur"""
    repo = ExpenseRepository(db)
    return await repo.create_firm(firma_in)


@router.put("/companies/{firma_id}", response_model=FirmaResponse)
async def update_firma(
    firma_id: int, *, db: AsyncSession = Depends(deps.get_db), firma_in: FirmaUpdate
) -> Any:
    """Firma bilgilerini güncelle"""
    repo = ExpenseRepository(db)
    firma = await repo.update_firm(firma_id, firma_in)
    if not firma:
        raise HTTPException(status_code=404, detail="Firma bulunamadı")
    return firma


# =============================================================================
# FİNANS İŞLEMLERİ
# =============================================================================
@router.get("/transactions", response_model=FinansIslemPaginationResponse)
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


@router.get("/transactions/{islem_id}", response_model=FinansIslemResponse)
async def get_islem(islem_id: int, db: AsyncSession = Depends(deps.get_db)) -> Any:
    """İşlem detayını getir"""
    repo = IncomeRepository(db)
    islem = await repo.get_transaction(islem_id)
    if not islem:
        raise HTTPException(status_code=404, detail="İşlem bulunamadı")
    return islem


@router.post("/transactions", response_model=FinansIslemResponse)
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


@router.put("/transactions/{islem_id}", response_model=FinansIslemResponse)
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


@router.post("/transactions/{islem_id}/cancel", response_model=FinansIslemResponse)
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


# =============================================================================
# HASTA CARİ
# =============================================================================
@router.get(
    "/patients/{hasta_id}/transactions", response_model=List[FinansIslemResponse]
)
async def get_hasta_islemler(
    hasta_id: str, db: AsyncSession = Depends(deps.get_db)
) -> Any:
    repo = IncomeRepository(db)
    return await repo.get_patient_transactions(UUID(hasta_id))


@router.get("/patients/{hasta_id}/balance", response_model=HastaCariResponse)
async def get_hasta_cari(hasta_id: str, db: AsyncSession = Depends(deps.get_db)) -> Any:
    repo = IncomeRepository(db)
    cari = await repo.get_patient_balance(UUID(hasta_id))
    return HastaCariResponse(**cari)


@router.get("/patients/debtors", response_model=List[HastaCariResponse])
async def get_borclu_hastalar(
    min_borc: float = Query(0, ge=0), db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """Borçlu hastaları listele"""
    repo = IncomeRepository(db)
    return await repo.get_debtor_patients(min_borc=min_borc)


# =============================================================================
# ÖZET VE RAPORLAR
# =============================================================================
@router.get("/summary", response_model=FinansOzetResponse)
async def get_finans_ozet(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """Genel finans özeti"""
    repo = IncomeRepository(db)
    summary = await repo.get_financial_summary(start_date=start_date, end_date=end_date)
    return FinansOzetResponse(**summary)


@router.get("/overdue", response_model=FinansIslemPaginationResponse)
async def get_vadesi_gecmis_islemler(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """Vadesi geçmiş işlemleri listele"""
    repo = IncomeRepository(db)
    items, total = await repo.search_transactions(
        vade_gecmis=True, skip=skip, limit=limit
    )
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/summary/daily", response_model=GunlukOzetResponse)
async def get_gunluk_ozet(
    tarih: Optional[date] = Query(None),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """Belirli bir günün finansal özeti"""
    if not tarih:
        tarih = date.today()
    repo = IncomeRepository(db)
    summary = await repo.get_financial_summary(start_date=tarih, end_date=tarih)
    return {
        "tarih": tarih,
        "gelir": summary["toplam_gelir"],
        "gider": summary["toplam_gider"],
        "net": summary["net_bakiye"],
    }


@router.get("/summary/monthly", response_model=List[AylikOzetResponse])
async def get_aylik_ozet(
    yil: int = Query(None), db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """Aylık finans özeti"""
    repo = AccountsRepository(db)
    if not yil:
        yil = date.today().year
    return await repo.get_aylik_ozet(yil)
