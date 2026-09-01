from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_cache.decorator import cache
from app.api import deps
from app.core.cache_invalidation import CacheNS, invalidate
from app.models.user import User
from app.repositories.definition_repository import DefinitionRepository
from app.repositories.system_repository import SystemRepository
from app.schemas.definition import (
    Definition,
    DefinitionCreate,
    BiyopsiSablonu,
    BiyopsiSablonuCreate,
    TetkikTanim,
    TetkikTanimCreate,
    ReceteSablonu,
    ReceteSablonuCreate,
    SablonTanim,
    SablonTanimCreate,
)

router = APIRouter()


# Biyopsi
@router.get("/biyopsi-sablonlari", response_model=List[BiyopsiSablonu])
async def get_biyopsi_sablonlari(db: AsyncSession = Depends(deps.get_db)):
    repo = DefinitionRepository(db)
    return await repo.get_biyopsi_sablonlari()


@router.post("/biyopsi-sablonlari", response_model=BiyopsiSablonu)
async def create_biyopsi_sablonu(
    obj_in: BiyopsiSablonuCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    return await repo.create_biyopsi_sablonu(
        ad=obj_in.ad, icerik=obj_in.icerik, aktif=obj_in.aktif
    )


@router.put("/biyopsi-sablonlari/{id}", response_model=BiyopsiSablonu)
async def update_biyopsi_sablonu(
    id: int, obj_in: BiyopsiSablonuCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    db_obj = await repo.update_biyopsi_sablonu(
        id, ad=obj_in.ad, icerik=obj_in.icerik, aktif=obj_in.aktif
    )
    if not db_obj:
        raise HTTPException(status_code=404, detail="Biyopsi şablonu bulunamadı")
    return db_obj


@router.delete("/biyopsi-sablonlari/{id}")
async def delete_biyopsi_sablonu(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = DefinitionRepository(db)
    if not await repo.delete_biyopsi_sablonu(id):
        raise HTTPException(status_code=404, detail="Biyopsi şablonu bulunamadı")
    return {"status": "success"}


# Tetkik Tanımları
@router.get("/tetkikler", response_model=List[TetkikTanim])
async def get_tetkikler(db: AsyncSession = Depends(deps.get_db)):
    repo = DefinitionRepository(db)
    return await repo.get_tetkikler()


@router.post("/tetkikler", response_model=TetkikTanim)
async def create_tetkik(
    obj_in: TetkikTanimCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    return await repo.create_tetkik(
        kod=obj_in.kod,
        ad=obj_in.ad,
        grup=obj_in.grup,
        birim=obj_in.birim,
        referans_araligi=obj_in.referans_araligi,
        aktif=obj_in.aktif,
    )


@router.put("/tetkikler/{id}", response_model=TetkikTanim)
async def update_tetkik(
    id: int, obj_in: TetkikTanimCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    db_obj = await repo.update_tetkik(
        id,
        kod=obj_in.kod,
        ad=obj_in.ad,
        grup=obj_in.grup,
        birim=obj_in.birim,
        referans_araligi=obj_in.referans_araligi,
        aktif=obj_in.aktif,
    )
    if not db_obj:
        raise HTTPException(status_code=404, detail="Tetkik tanımı bulunamadı")
    return db_obj


@router.delete("/tetkikler/{id}")
async def delete_tetkik(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = DefinitionRepository(db)
    if not await repo.delete_tetkik(id):
        raise HTTPException(status_code=404, detail="Tetkik tanımı bulunamadı")
    return {"status": "success"}


# Reçete Şablonları
@router.get("/recete-sablonlari", response_model=List[ReceteSablonu])
@cache(expire=3600, namespace=CacheNS.RECETE_SABLONLARI)
async def get_recete_sablonlari(db: AsyncSession = Depends(deps.get_db)):
    repo = DefinitionRepository(db)
    return await repo.get_recete_sablonlari()


@router.post("/recete-sablonlari", response_model=ReceteSablonu)
async def create_recete_sablonu(
    obj_in: ReceteSablonuCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    result = await repo.create_recete_sablonu(
        ad=obj_in.ad,
        aciklama=obj_in.aciklama,
        ilaclar=obj_in.ilaclar,
        aktif=obj_in.aktif,
    )
    await invalidate(CacheNS.RECETE_SABLONLARI, CacheNS.BOOTSTRAP)
    return result


@router.put("/recete-sablonlari/{id}", response_model=ReceteSablonu)
async def update_recete_sablonu(
    id: int, obj_in: ReceteSablonuCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    db_obj = await repo.update_recete_sablonu(
        id,
        ad=obj_in.ad,
        aciklama=obj_in.aciklama,
        ilaclar=obj_in.ilaclar,
        aktif=obj_in.aktif,
    )
    if not db_obj:
        raise HTTPException(status_code=404, detail="Reçete şablonu bulunamadı")
    await invalidate(CacheNS.RECETE_SABLONLARI, CacheNS.BOOTSTRAP)
    return db_obj


@router.delete("/recete-sablonlari/{id}")
async def delete_recete_sablonu(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = DefinitionRepository(db)
    if not await repo.delete_recete_sablonu(id):
        raise HTTPException(status_code=404, detail="Reçete şablonu bulunamadı")
    await invalidate(CacheNS.RECETE_SABLONLARI, CacheNS.BOOTSTRAP)
    return {"status": "success"}


# Genel Şablonlar
@router.get("/sablonlar", response_model=List[SablonTanim])
async def get_sablonlar(
    grup: Optional[str] = Query(None, description="Filtrelenecek grup (örn. 'operation_note', 'medical_intervention')"),
    alan: Optional[str] = Query(None, description="Grup takma adı"),
    db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    target_group = grup or alan
    return await repo.get_sablonlar(grup=target_group)


@router.post("/sablonlar", response_model=SablonTanim)
async def create_sablon(
    obj_in: SablonTanimCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    return await repo.create_sablon(
        grup=obj_in.grup,
        icerik=obj_in.icerik,
        kod=obj_in.kod,
        aktif=obj_in.aktif
    )


@router.put("/sablonlar/{id}", response_model=SablonTanim)
async def update_sablon(
    id: int, obj_in: SablonTanimCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    db_obj = await repo.update_sablon(
        id,
        grup=obj_in.grup,
        icerik=obj_in.icerik,
        kod=obj_in.kod,
        aktif=obj_in.aktif
    )
    if not db_obj:
        raise HTTPException(status_code=404, detail="Şablon bulunamadı")
    return db_obj


@router.delete("/sablonlar/{id}")
async def delete_sablon(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = DefinitionRepository(db)
    if not await repo.delete_sablon(id):
        raise HTTPException(status_code=404, detail="Şablon bulunamadı")
    return {"status": "success"}


# ICD Codes
@router.get("/icd")
async def get_icd_codes(
    q: Optional[str] = Query(None, description="Arama terimi (kod veya başlık)", min_length=2),
    limit: int = Query(50, description="Döndürülecek maksimum kayıt sayısı", le=100),
    db: AsyncSession = Depends(deps.get_db)
):
    repo = SystemRepository(db)
    return await repo.search_icd(query=q, limit=limit)


@router.get("/icd-search")
@cache(expire=3600, namespace=CacheNS.ICD)
async def search_icd_codes(
    q: str = Query(..., description="Arama terimi (kod veya başlık)"),
    limit: int = Query(20, description="Döndürülecek maksimum kayıt sayısı", le=100),
    db: AsyncSession = Depends(deps.get_db)
):
    repo = SystemRepository(db)
    return await repo.search_icd_ranked(q, limit=limit)


@router.get("/icd-lookup")
@cache(expire=3600, namespace=CacheNS.ICD)
async def lookup_icd_code(
    code: str = Query(..., description="Aranacak ICD kodu"),
    db: AsyncSession = Depends(deps.get_db)
):
    repo = SystemRepository(db)
    names = await repo.lookup_icd_names([code])
    name = names.get(code.strip().upper())
    return {"code": code, "name": name, "found": name is not None}


@router.post("/icd-lookup-batch")
async def lookup_icd_codes_batch(
    codes: List[str],
    db: AsyncSession = Depends(deps.get_db)
):
    repo = SystemRepository(db)
    return await repo.lookup_icd_names(codes)


@router.get("/icd/{kod}")
async def get_icd_by_code(
    kod: str,
    db: AsyncSession = Depends(deps.get_db)
):
    repo = SystemRepository(db)
    entry = await repo.get_icd_by_code(kod)
    if not entry:
        raise HTTPException(status_code=404, detail="ICD kodu bulunamadı")
    return entry
