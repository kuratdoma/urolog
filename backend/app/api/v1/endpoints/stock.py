from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.core.permissions import Action
from app.repositories.stock_repository import StockRepository, StockError
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

# RBAC: yetkiler PERMISSION_MATRIX["stock"] üzerinden, işlem bazında uygulanır.
# Router seviyesinde tek bir rol listesi kullanmak, salt-okunur rollerin de
# yazma uçlarına erişebilmesine yol açıyordu.
router = APIRouter()

_read = deps.require_permission("stock", Action.READ)
_create = deps.require_permission("stock", Action.CREATE)
_update = deps.require_permission("stock", Action.UPDATE)
_delete = deps.require_permission("stock", Action.DELETE)


# --- ÜRÜNLER (PRODUCTS) ---


@router.get(
    "/products",
    response_model=List[StokUrunResponse],
    dependencies=[Depends(_read)],
)
async def read_products(
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
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
    current_user: User = Depends(_create)
) -> Any:
    """Yeni stok ürünü tanımla."""
    repo = StockRepository(db)
    try:
        product = await repo.create_product(product_in)
    except StockError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    await AuditService.log(
        db=db,
        action="STOK_URUN_CREATE",
        user_id=current_user.id,
        resource_type="stok_urunler",
        resource_id=str(product.id),
        details={"name": product.urun_adi},
    )
    return product


@router.get(
    "/products/{id}",
    response_model=StokUrunResponse,
    dependencies=[Depends(_read)],
)
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
    current_user: User = Depends(_update)
) -> Any:
    """Ürün bilgilerini güncelle."""
    repo = StockRepository(db)
    try:
        product = await repo.update_product(id, product_in)
    except StockError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")

    await AuditService.log(
        db=db,
        action="STOK_URUN_UPDATE",
        user_id=current_user.id,
        resource_type="stok_urunler",
        resource_id=str(product.id),
        details={
            "updated_fields": list(product_in.model_dump(exclude_unset=True).keys())
        },
    )
    return product


@router.delete("/products/{id}")
async def delete_product(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(_delete)
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


@router.get(
    "/purchases",
    response_model=List[StokAlimResponse],
    dependencies=[Depends(_read)],
)
async def read_purchases(
    product_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """Alım geçmişini listele."""
    repo = StockRepository(db)
    return await repo.get_purchases(product_id=product_id, skip=skip, limit=limit)


@router.post("/purchases", response_model=StokAlimResponse)
async def create_purchase(
    *,
    db: AsyncSession = Depends(deps.get_db),
    purchase_in: StokAlimCreate,
    current_user: User = Depends(_create)
) -> Any:
    """Yeni alım kaydet ve stok miktarını artır."""
    repo = StockRepository(db)
    try:
        purchase = await repo.create_purchase(purchase_in)
    except StockError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

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


@router.get(
    "/movements",
    response_model=List[StokHareketResponse],
    dependencies=[Depends(_read)],
)
async def read_movements(
    product_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """Stok hareketlerini listele."""
    repo = StockRepository(db)
    return await repo.get_movements(product_id=product_id, skip=skip, limit=limit)


@router.post("/movements", response_model=StokHareketResponse)
async def create_movement(
    *,
    db: AsyncSession = Depends(deps.get_db),
    movement_in: StokHareketCreate,
    current_user: User = Depends(_create)
) -> Any:
    """Manuel stok hareketi ekle (Giriş/Çıkış/Düzeltme)."""
    repo = StockRepository(db)
    try:
        movement = await repo.create_movement(movement_in, user_id=current_user.id)
    except StockError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    await AuditService.log(
        db=db,
        action="STOK_HAREKET_CREATE",
        user_id=current_user.id,
        resource_type="stok_hareketleri",
        resource_id=str(movement.id),
        details={
            "type": movement_in.hareket_tipi.value,
            "urun_id": str(movement.urun_id),
            "delta": movement.miktar,
        },
    )
    return movement


# --- RAPORLAMA ---


@router.get("/summary", response_model=StokOzet, dependencies=[Depends(_read)])
async def read_stock_summary(db: AsyncSession = Depends(deps.get_db)) -> Any:
    """Genel stok özeti (Dashboard için)."""
    repo = StockRepository(db)
    return await repo.get_summary()
