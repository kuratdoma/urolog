from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.core.permissions import UserRole
from app.repositories.stock_repository import StockRepository
from app.schemas.stock import (
    StokUrunCreate,
    StokUrunUpdate,
    StokUrunResponse,
    StokAlimCreate,
    StokAlimResponse,
    StokHareketCreate,
    StokHareketResponse,
    StokOzet,
)
from app.models.user import User
from app.services.audit_service import AuditService

router = APIRouter(
    # RBAC: ADMIN, DOCTOR, NURSE can access stock (read). FRONTDESK excluded.
    dependencies=[Depends(deps.require_role(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE))]
)

# --- ÜRÜNLER (PRODUCTS) ---


@router.get("/products", response_model=List[StokUrunResponse])
async def read_products(
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """Stoktaki ürünleri listele."""
    repo = StockRepository(db)
    return await repo.get_products(search=search, skip=skip, limit=limit)


@router.post("/products", response_model=StokUrunResponse)
async def create_product(
    *,
    db: AsyncSession = Depends(deps.get_db),
    product_in: StokUrunCreate,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Yeni stok ürünü tanımla."""
    repo = StockRepository(db)
    product = await repo.create_product(product_in)

    await AuditService.log(
        db=db,
        action="STOK_URUN_CREATE",
        user_id=current_user.id,
        resource_type="stok_urunler",
        resource_id=str(product.id),
        details={"name": product.urun_adi},
    )
    return product


@router.get("/products/{id}", response_model=StokUrunResponse)
async def read_product(*, db: AsyncSession = Depends(deps.get_db), id: int) -> Any:
    """Ürün detayını getir."""
    repo = StockRepository(db)
    product = await repo.get_product(id)
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    return product


@router.put("/products/{id}", response_model=StokUrunResponse)
async def update_product(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    product_in: StokUrunUpdate,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Ürün bilgilerini güncelle."""
    repo = StockRepository(db)
    product = await repo.update_product(id, product_in)
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")

    await AuditService.log(
        db=db,
        action="STOK_URUN_UPDATE",
        user_id=current_user.id,
        resource_type="stok_urunler",
        resource_id=str(product.id),
        details={"updated_fields": list(product_in.dict(exclude_unset=True).keys())},
    )
    return product


@router.delete("/products/{id}")
async def delete_product(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.require_role(UserRole.ADMIN))
) -> Any:
    """Ürünü sil (soft delete)."""
    repo = StockRepository(db)
    success = await repo.delete_product(id)
    if not success:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")

    await AuditService.log(
        db=db,
        action="STOK_URUN_DELETE",
        user_id=current_user.id,
        resource_type="stok_urunler",
        resource_id=str(id),
        details={},
    )
    return {"status": "success", "id": id}


# --- STOK ALIMLARI (PURCHASES) ---


@router.get("/purchases", response_model=List[StokAlimResponse])
async def read_purchases(
    product_id: Optional[int] = None, db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """Alım geçmişini listele."""
    repo = StockRepository(db)
    return await repo.get_purchases(product_id=product_id)


@router.post("/purchases", response_model=StokAlimResponse)
async def create_purchase(
    *,
    db: AsyncSession = Depends(deps.get_db),
    purchase_in: StokAlimCreate,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Yeni alım kaydet ve stok miktarını artır."""
    repo = StockRepository(db)
    purchase = await repo.create_purchase(purchase_in)

    await AuditService.log(
        db=db,
        action="STOK_ALIM_CREATE",
        user_id=current_user.id,
        resource_type="stok_alimlari",
        resource_id=str(purchase.id),
        details={"urun_id": str(purchase.urun_id), "miktar": purchase.miktar},
    )
    return purchase


# --- STOK HAREKETLERİ (MOVEMENTS) ---


@router.get("/movements", response_model=List[StokHareketResponse])
async def read_movements(
    product_id: Optional[int] = None,
    limit: int = 100,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """Stok hareketlerini listele."""
    repo = StockRepository(db)
    return await repo.get_movements(product_id=product_id, limit=limit)


@router.post("/movements", response_model=StokHareketResponse)
async def create_movement(
    *,
    db: AsyncSession = Depends(deps.get_db),
    movement_in: StokHareketCreate,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Manuel stok hareketi ekle (Giriş/Çıkış/Düzeltme)."""
    repo = StockRepository(db)
    movement = await repo.create_movement(movement_in, user_id=current_user.id)

    await AuditService.log(
        db=db,
        action="STOK_HAREKET_CREATE",
        user_id=current_user.id,
        resource_type="stok_hareketleri",
        resource_id=str(movement.id),
        details={"type": movement_in.hareket_tipi, "urun_id": str(movement.urun_id)},
    )
    return movement


# --- RAPORLAMA ---


@router.get("/summary", response_model=StokOzet)
async def read_stock_summary(db: AsyncSession = Depends(deps.get_db)) -> Any:
    """Genel stok özeti (Dashboard için)."""
    repo = StockRepository(db)
    return await repo.get_summary()
