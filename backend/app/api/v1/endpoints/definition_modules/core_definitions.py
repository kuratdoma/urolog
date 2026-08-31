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
    RandevuTuru,
    RandevuTuruCreate,
)

router = APIRouter()


# Kurumlar
@router.get("/kurumlar", response_model=List[Definition])
@cache(expire=3600, namespace=CacheNS.KURUMLAR)
async def get_kurumlar(db: AsyncSession = Depends(deps.get_db)):
    repo = DefinitionRepository(db)
    return await repo.get_kurumlar()


@router.post("/kurumlar", response_model=Definition)
async def create_kurum(
    obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    result = await repo.create_kurum(ad=obj_in.ad, aktif=obj_in.aktif)
    await invalidate(CacheNS.KURUMLAR, CacheNS.BOOTSTRAP)
    return result


@router.put("/kurumlar/{id}", response_model=Definition)
async def update_kurum(
    id: int, obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    db_obj = await repo.update_kurum(id, ad=obj_in.ad, aktif=obj_in.aktif)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Kurum bulunamadı")
    await invalidate(CacheNS.KURUMLAR, CacheNS.BOOTSTRAP)
    return db_obj


@router.delete("/kurumlar/{id}")
async def delete_kurum(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = DefinitionRepository(db)
    if not await repo.delete_kurum(id):
        raise HTTPException(status_code=404, detail="Kurum bulunamadı")
    await invalidate(CacheNS.KURUMLAR, CacheNS.BOOTSTRAP)
    return {"status": "success"}


# Meslekler
@router.get("/meslekler", response_model=List[Definition])
@cache(expire=3600, namespace=CacheNS.MESLEKLER)
async def get_meslekler(db: AsyncSession = Depends(deps.get_db)):
    repo = DefinitionRepository(db)
    return await repo.get_meslekler()


@router.post("/meslekler", response_model=Definition)
async def create_meslek(
    obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    result = await repo.create_meslek(ad=obj_in.ad, aktif=obj_in.aktif)
    await invalidate(CacheNS.MESLEKLER, CacheNS.BOOTSTRAP)
    return result


@router.put("/meslekler/{id}", response_model=Definition)
async def update_meslek(
    id: int, obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    db_obj = await repo.update_meslek(id, ad=obj_in.ad, aktif=obj_in.aktif)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Meslek bulunamadı")
    await invalidate(CacheNS.MESLEKLER, CacheNS.BOOTSTRAP)
    return db_obj


@router.delete("/meslekler/{id}")
async def delete_meslek(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = DefinitionRepository(db)
    if not await repo.delete_meslek(id):
        raise HTTPException(status_code=404, detail="Meslek bulunamadı")
    await invalidate(CacheNS.MESLEKLER, CacheNS.BOOTSTRAP)
    return {"status": "success"}


# Sigortalar
@router.get("/sigortalar", response_model=List[Definition])
@cache(expire=3600, namespace=CacheNS.SIGORTALAR)
async def get_sigortalar(db: AsyncSession = Depends(deps.get_db)):
    repo = DefinitionRepository(db)
    return await repo.get_sigortalar()


@router.post("/sigortalar", response_model=Definition)
async def create_sigorta(
    obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    result = await repo.create_sigorta(ad=obj_in.ad, aktif=obj_in.aktif)
    await invalidate(CacheNS.SIGORTALAR, CacheNS.BOOTSTRAP)
    return result


@router.put("/sigortalar/{id}", response_model=Definition)
async def update_sigorta(
    id: int, obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    db_obj = await repo.update_sigorta(id, ad=obj_in.ad, aktif=obj_in.aktif)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Sigorta bulunamadı")
    await invalidate(CacheNS.SIGORTALAR, CacheNS.BOOTSTRAP)
    return db_obj


@router.delete("/sigortalar/{id}")
async def delete_sigorta(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = DefinitionRepository(db)
    if not await repo.delete_sigorta(id):
        raise HTTPException(status_code=404, detail="Sigorta bulunamadı")
    await invalidate(CacheNS.SIGORTALAR, CacheNS.BOOTSTRAP)
    return {"status": "success"}


# Anestezi
@router.get("/anestezi-turleri", response_model=List[Definition])
@cache(expire=3600, namespace=CacheNS.ANESTEZI)
async def get_anestezi_turleri(db: AsyncSession = Depends(deps.get_db)):
    repo = DefinitionRepository(db)
    return await repo.get_anestezi_turleri()


@router.post("/anestezi-turleri", response_model=Definition)
async def create_anestezi_turu(
    obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    result = await repo.create_anestezi_turu(ad=obj_in.ad, aktif=obj_in.aktif)
    await invalidate(CacheNS.ANESTEZI)
    return result


@router.put("/anestezi-turleri/{id}", response_model=Definition)
async def update_anestezi_turu(
    id: int, obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    db_obj = await repo.update_anestezi_turu(id, ad=obj_in.ad, aktif=obj_in.aktif)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Anestezi türü bulunamadı")
    await invalidate(CacheNS.ANESTEZI)
    return db_obj


@router.delete("/anestezi-turleri/{id}")
async def delete_anestezi_turu(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = DefinitionRepository(db)
    if not await repo.delete_anestezi_turu(id):
        raise HTTPException(status_code=404, detail="Anestezi türü bulunamadı")
    await invalidate(CacheNS.ANESTEZI)
    return {"status": "success"}


# Randevu Türleri
@router.get("/randevu-turleri", response_model=List[RandevuTuru])
@cache(expire=3600, namespace=CacheNS.RANDEVU_TURLERI)
async def get_randevu_turleri(db: AsyncSession = Depends(deps.get_db)):
    repo = DefinitionRepository(db)
    return await repo.get_randevu_turleri()


@router.post("/randevu-turleri", response_model=RandevuTuru)
async def create_randevu_turu(
    obj_in: RandevuTuruCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    result = await repo.create_randevu_turu(
        ad=obj_in.ad, renk=obj_in.renk, sira=obj_in.sira, aktif=obj_in.aktif
    )
    await invalidate(CacheNS.RANDEVU_TURLERI, CacheNS.BOOTSTRAP)
    return result


@router.put("/randevu-turleri/{id}", response_model=RandevuTuru)
async def update_randevu_turu(
    id: int, obj_in: RandevuTuruCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    db_obj = await repo.update_randevu_turu(
        id, ad=obj_in.ad, renk=obj_in.renk, sira=obj_in.sira, aktif=obj_in.aktif
    )
    if not db_obj:
        raise HTTPException(status_code=404, detail="Randevu türü bulunamadı")
    await invalidate(CacheNS.RANDEVU_TURLERI, CacheNS.BOOTSTRAP)
    return db_obj


@router.delete("/randevu-turleri/{id}")
async def delete_randevu_turu(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = DefinitionRepository(db)
    if not await repo.delete_randevu_turu(id):
        raise HTTPException(status_code=404, detail="Randevu türü bulunamadı")
    await invalidate(CacheNS.RANDEVU_TURLERI, CacheNS.BOOTSTRAP)
    return {"status": "success"}


# Takip Konuları
@router.get("/takip-konulari", response_model=List[Definition])
@cache(expire=3600, namespace=CacheNS.TAKIP_KONULARI)
async def get_takip_konulari(db: AsyncSession = Depends(deps.get_db)):
    repo = DefinitionRepository(db)
    return await repo.get_takip_konulari()


@router.post("/takip-konulari", response_model=Definition)
async def create_takip_konusu(
    obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    result = await repo.create_takip_konusu(ad=obj_in.ad, aktif=obj_in.aktif)
    await invalidate(CacheNS.TAKIP_KONULARI, CacheNS.BOOTSTRAP)
    return result


@router.put("/takip-konulari/{id}", response_model=Definition)
async def update_takip_konusu(
    id: int, obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    db_obj = await repo.update_takip_konusu(id, ad=obj_in.ad, aktif=obj_in.aktif)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Takip konusu bulunamadı")
    await invalidate(CacheNS.TAKIP_KONULARI, CacheNS.BOOTSTRAP)
    return db_obj


@router.delete("/takip-konulari/{id}")
async def delete_takip_konusu(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = DefinitionRepository(db)
    if not await repo.delete_takip_konusu(id):
        raise HTTPException(status_code=404, detail="Takip konusu bulunamadı")
    await invalidate(CacheNS.TAKIP_KONULARI, CacheNS.BOOTSTRAP)
    return {"status": "success"}


# Hastaneler
@router.get("/hastaneler", response_model=List[Definition])
async def get_hastaneler(db: AsyncSession = Depends(deps.get_db)):
    repo = SystemRepository(db)
    return await repo.get_hastaneler()


@router.post("/hastaneler", response_model=Definition)
async def create_hastane(
    obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = SystemRepository(db)
    return await repo.create_hastane(ad=obj_in.ad, aktif=obj_in.aktif)


@router.put("/hastaneler/{id}", response_model=Definition)
async def update_hastane(
    id: int, obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = SystemRepository(db)
    db_obj = await repo.update_hastane(id, ad=obj_in.ad, aktif=obj_in.aktif)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Hastane bulunamadı")
    return db_obj


@router.delete("/hastaneler/{id}")
async def delete_hastane(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = SystemRepository(db)
    if not await repo.delete_hastane(id):
        raise HTTPException(status_code=404, detail="Hastane bulunamadı")
    return {"status": "success"}


# Bootstrap endpoint
@router.get("/bootstrap")
@cache(expire=3600, namespace="def:bootstrap")
async def get_bootstrap_definitions(db: AsyncSession = Depends(deps.get_db)):
    """
    Form açılışında ihtiyaç duyulan temel tanım listelerini tek istekte döner.
    7 ayrı HTTP çağrısı yerine tek çağrı ile ağ maliyetini düşürür.
    Redis'te 1 saat önbelleklenir; tanımlar değiştiğinde geçersiz kılınır.
    """
    repo = DefinitionRepository(db)

    doktorlar = await repo.get_doktorlar()
    kurumlar = await repo.get_kurumlar()
    meslekler = await repo.get_meslekler()
    sigortalar = await repo.get_sigortalar()
    takip_konulari = await repo.get_takip_konulari()
    randevu_turleri = await repo.get_randevu_turleri()
    recete_sablonlari = await repo.get_recete_sablonlari()
    anestezi_turleri = await repo.get_anestezi_tipleri()
    hastaneler = await repo.get_hastaneler()
    cerrahlar = await repo.get_cerrahlar()
    anestezi_personelleri = await repo.get_anestezi_personelleri()

    return {
        "doktorlar": doktorlar,
        "kurumlar": kurumlar,
        "meslekler": meslekler,
        "sigortalar": sigortalar,
        "takip_konulari": takip_konulari,
        "randevu_turleri": randevu_turleri,
        "recete_sablonlari": recete_sablonlari,
        "anestezi_turleri": anestezi_turleri,
        "anestezi_tipleri": anestezi_turleri,
        "hastaneler": hastaneler,
        "cerrahlar": cerrahlar,
        "anestezi_personelleri": anestezi_personelleri,
    }
