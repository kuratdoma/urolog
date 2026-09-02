from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.permissions import UserRole, Action
from app.repositories.finance.recurring_repository import RecurringRepository
from app.schemas.finance import (
    DuzenliGiderResponse,
    DuzenliGiderCreate,
    DuzenliGiderUpdate,
    BekleyenUretimResponse,
    UretimSonucResponse,
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


# =============================================================================
# DÜZENLİ GİDERLER
# =============================================================================
@router.get("/recurring-expenses", response_model=List[DuzenliGiderResponse], dependencies=[Depends(_read)])
async def get_duzenli_giderler(
    aktif_only: bool = Query(False), db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """Düzenli gider şablonlarını listele."""
    return await RecurringRepository(db).list_templates(aktif_only=aktif_only)


@router.post("/recurring-expenses", response_model=DuzenliGiderResponse, dependencies=[Depends(_create)])
async def create_duzenli_gider(
    *,
    db: AsyncSession = Depends(deps.get_db),
    sablon_in: DuzenliGiderCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Yeni düzenli gider şablonu oluştur."""
    repo = RecurringRepository(
        db, UserContext(user_id=current_user.id, username=current_user.username)
    )
    sablon = await repo.create_template(sablon_in)

    await AuditService.log(
        db=db,
        action="duzenli_gider_create",
        user_id=current_user.id,
        resource_type="duzenli_gider",
        resource_id=str(sablon.id),
        details={"ad": sablon.ad, "tutar": float(sablon.tutar)},
    )
    return sablon


@router.get(
    "/recurring-expenses/pending", response_model=List[BekleyenUretimResponse],
    dependencies=[Depends(_read)],
)
async def get_bekleyen_uretimler(db: AsyncSession = Depends(deps.get_db)) -> Any:
    """
    Üretilmeyi bekleyen dönemlerin önizlemesi.

    Oluşturmadan önce ne kadar ve kaç kayıt üretileceğini gösterir.
    """
    return await RecurringRepository(db).get_pending()


@router.post("/recurring-expenses/generate", response_model=UretimSonucResponse, dependencies=[Depends(_read)])
async def uret_duzenli_giderler(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Bekleyen dönemler için gider işlemlerini oluşturur.

    Üretilen kayıtlar 'bekliyor' durumundadır ve ödeme içermez; kasa bakiyesi
    ancak ödeme girildiğinde değişir. Aynı dönem iki kez üretilmez.
    """
    repo = RecurringRepository(
        db, UserContext(user_id=current_user.id, username=current_user.username)
    )
    sonuc = await repo.generate()

    if sonuc["adet"]:
        await AuditService.log(
            db=db,
            action="duzenli_gider_generate",
            user_id=current_user.id,
            resource_type="duzenli_gider",
            resource_id="batch",
            details={"adet": sonuc["adet"], "toplam_tutar": sonuc["toplam_tutar"]},
        )
    return sonuc


@router.put("/recurring-expenses/{sablon_id}", response_model=DuzenliGiderResponse, dependencies=[Depends(_update)])
async def update_duzenli_gider(
    sablon_id: int,
    *,
    db: AsyncSession = Depends(deps.get_db),
    sablon_in: DuzenliGiderUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Düzenli gider şablonunu güncelle."""
    repo = RecurringRepository(db)
    sablon = await repo.update_template(sablon_id, sablon_in)
    if not sablon:
        raise HTTPException(status_code=404, detail="Şablon bulunamadı")

    await AuditService.log(
        db=db,
        action="duzenli_gider_update",
        user_id=current_user.id,
        resource_type="duzenli_gider",
        resource_id=str(sablon_id),
        details={"alanlar": list(sablon_in.model_dump(exclude_unset=True).keys())},
    )
    return sablon


@router.delete("/recurring-expenses/{sablon_id}")
async def delete_duzenli_gider(
    sablon_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.require_role(UserRole.ADMIN)),
) -> Any:
    """
    Şablonu pasife alır (silmez).

    Üretilmiş gider kayıtlarının kaynağı izlenebilir kalmalı.
    """
    repo = RecurringRepository(db)
    if not await repo.delete_template(sablon_id):
        raise HTTPException(status_code=404, detail="Şablon bulunamadı")

    await AuditService.log(
        db=db,
        action="duzenli_gider_deactivate",
        user_id=current_user.id,
        resource_type="duzenli_gider",
        resource_id=str(sablon_id),
        details={},
    )
    return {"success": True}
