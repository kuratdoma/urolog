from typing import List
from fastapi import APIRouter, Depends, HTTPException
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
    Doktor,
    DoktorCreate,
)

router = APIRouter()


# Doktorlar
@router.get("/doktorlar", response_model=List[Doktor])
@cache(expire=3600, namespace=CacheNS.DOKTORLAR)
async def get_doktorlar(db: AsyncSession = Depends(deps.get_db)):
    repo = DefinitionRepository(db)
    return await repo.get_doktorlar()


@router.post("/doktorlar", response_model=Doktor)
async def create_doktor(
    obj_in: DoktorCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    result = await repo.create_doktor(
        ad_soyad=obj_in.ad_soyad,
        brans=obj_in.brans,
        diploma_no=obj_in.diploma_no,
        aktif=obj_in.aktif,
    )
    await invalidate(CacheNS.DOKTORLAR, CacheNS.BOOTSTRAP)
    return result


@router.put("/doktorlar/{id}", response_model=Doktor)
async def update_doktor(
    id: int, obj_in: DoktorCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    db_obj = await repo.update_doktor(
        id,
        ad_soyad=obj_in.ad_soyad,
        brans=obj_in.brans,
        diploma_no=obj_in.diploma_no,
        aktif=obj_in.aktif,
    )
    if not db_obj:
        raise HTTPException(status_code=404, detail="Doktor bulunamadı")
    await invalidate(CacheNS.DOKTORLAR, CacheNS.BOOTSTRAP)
    return db_obj


@router.delete("/doktorlar/{id}")
async def delete_doktor(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = DefinitionRepository(db)
    if not await repo.delete_doktor(id):
        raise HTTPException(status_code=404, detail="Doktor bulunamadı")
    await invalidate(CacheNS.DOKTORLAR, CacheNS.BOOTSTRAP)
    return {"status": "success"}


# Cerrahlar
@router.get("/cerrahlar", response_model=List[Definition])
async def get_cerrahlar(db: AsyncSession = Depends(deps.get_db)):
    repo = SystemRepository(db)
    return await repo.get_cerrahlar()


@router.post("/cerrahlar", response_model=Definition)
async def create_cerrah(
    obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = SystemRepository(db)
    return await repo.create_cerrah(ad=obj_in.ad, aktif=obj_in.aktif)


@router.put("/cerrahlar/{id}", response_model=Definition)
async def update_cerrah(
    id: int, obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = SystemRepository(db)
    db_obj = await repo.update_cerrah(id, ad=obj_in.ad, aktif=obj_in.aktif)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Cerrah bulunamadı")
    return db_obj


@router.delete("/cerrahlar/{id}")
async def delete_cerrah(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = SystemRepository(db)
    if not await repo.delete_cerrah(id):
        raise HTTPException(status_code=404, detail="Cerrah bulunamadı")
    return {"status": "success"}


# Anestezi Personelleri
@router.get("/anestezi-personelleri", response_model=List[Definition])
async def get_anestezi_personelleri(db: AsyncSession = Depends(deps.get_db)):
    repo = SystemRepository(db)
    return await repo.get_anestezi_personelleri()


@router.post("/anestezi-personelleri", response_model=Definition)
async def create_anestezi_personeli(
    obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = SystemRepository(db)
    return await repo.create_anestezi_personeli(ad=obj_in.ad, aktif=obj_in.aktif)


@router.put("/anestezi-personelleri/{id}", response_model=Definition)
async def update_anestezi_personeli(
    id: int, obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = SystemRepository(db)
    db_obj = await repo.update_anestezi_personeli(id, ad=obj_in.ad, aktif=obj_in.aktif)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Anestezi personeli bulunamadı")
    return db_obj


@router.delete("/anestezi-personelleri/{id}")
async def delete_anestezi_personeli(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = SystemRepository(db)
    if not await repo.delete_anestezi_personeli(id):
        raise HTTPException(status_code=404, detail="Anestezi personeli bulunamadı")
    return {"status": "success"}


# Hemşireler
@router.get("/hemsireler", response_model=List[Definition])
async def get_hemsireler(db: AsyncSession = Depends(deps.get_db)):
    repo = SystemRepository(db)
    return await repo.get_hemsireler()


@router.post("/hemsireler", response_model=Definition)
async def create_hemsire(
    obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = SystemRepository(db)
    return await repo.create_hemsire(ad=obj_in.ad, aktif=obj_in.aktif)


@router.put("/hemsireler/{id}", response_model=Definition)
async def update_hemsire(
    id: int, obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = SystemRepository(db)
    db_obj = await repo.update_hemsire(id, ad=obj_in.ad, aktif=obj_in.aktif)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Hemşire bulunamadı")
    return db_obj


@router.delete("/hemsireler/{id}")
async def delete_hemsire(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = SystemRepository(db)
    if not await repo.delete_hemsire(id):
        raise HTTPException(status_code=404, detail="Hemşire bulunamadı")
    return {"status": "success"}


# Asistanlar
@router.get("/asistanlar", response_model=List[Definition])
async def get_asistanlar(db: AsyncSession = Depends(deps.get_db)):
    repo = SystemRepository(db)
    return await repo.get_asistanlar()


@router.post("/asistanlar", response_model=Definition)
async def create_asistan(
    obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = SystemRepository(db)
    return await repo.create_asistan(ad=obj_in.ad, aktif=obj_in.aktif)


@router.put("/asistanlar/{id}", response_model=Definition)
async def update_asistan(
    id: int, obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = SystemRepository(db)
    db_obj = await repo.update_asistan(id, ad=obj_in.ad, aktif=obj_in.aktif)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Asistan bulunamadı")
    return db_obj


@router.delete("/asistanlar/{id}")
async def delete_asistan(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = SystemRepository(db)
    if not await repo.delete_asistan(id):
        raise HTTPException(status_code=404, detail="Asistan bulunamadı")
    return {"status": "success"}
