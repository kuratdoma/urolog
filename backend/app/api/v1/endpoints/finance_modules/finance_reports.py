from typing import Any, List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.repositories.finance.accounts_repository import AccountsRepository
from app.repositories.finance.income_repository import IncomeRepository
from app.schemas.finance import (
    FinansIslemPaginationResponse,
    KategoriKirilimResponse,
    YaslandirmaKovaResponse,
    FinansOzetResponse,
    GunlukOzetResponse,
    AylikOzetResponse,
)

router = APIRouter()


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


@router.get(
    "/reports/category-breakdown", response_model=List[KategoriKirilimResponse]
)
async def get_kategori_kirilimi(
    islem_tipi: str = Query("gelir", description="'gelir' veya 'gider'"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """Kategori bazlı toplam, işlem sayısı ve yüzde dağılımı."""
    if islem_tipi not in ("gelir", "gider"):
        raise HTTPException(
            status_code=422, detail="islem_tipi 'gelir' veya 'gider' olmalıdır"
        )
    repo = IncomeRepository(db)
    return await repo.get_category_breakdown(
        islem_tipi=islem_tipi, start_date=start_date, end_date=end_date
    )


@router.get("/reports/aging", response_model=List[YaslandirmaKovaResponse])
async def get_yaslandirma_raporu(db: AsyncSession = Depends(deps.get_db)) -> Any:
    """
    Tahsilat yaşlandırma: açık alacakların vade yaşına göre dağılımı.

    90+ gün kovası tahsil edilebilirliği düşen alacağı gösterir.
    """
    repo = IncomeRepository(db)
    return await repo.get_aging_report()


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
