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
    RandevuTuru,
    RandevuTuruCreate,
    BiyopsiSablonu,
    BiyopsiSablonuCreate,
    Doktor,
    DoktorCreate,
    TetkikTanim,
    TetkikTanimCreate,
    ReceteSablonu,
    ReceteSablonuCreate,
    SablonTanim,
    SablonTanimCreate,
)

router = APIRouter(
    # SEC-09: Router seviyesinde kimlik doğrulama
    dependencies=[Depends(deps.get_current_user)]
)


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
@router.get("/anestezi-tipleri", response_model=List[Definition])
@cache(expire=3600, namespace=CacheNS.ANESTEZI)
async def get_anestezi_tipleri(db: AsyncSession = Depends(deps.get_db)):
    repo = DefinitionRepository(db)
    return await repo.get_anestezi_tipleri()


@router.post("/anestezi-tipleri", response_model=Definition)
async def create_anestezi(
    obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    result = await repo.create_anestezi(ad=obj_in.ad, aktif=obj_in.aktif)
    await invalidate(CacheNS.ANESTEZI)
    return result


@router.put("/anestezi-tipleri/{id}", response_model=Definition)
async def update_anestezi(
    id: int, obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    db_obj = await repo.update_anestezi(id, ad=obj_in.ad, aktif=obj_in.aktif)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Anestezi tipi bulunamadı")
    await invalidate(CacheNS.ANESTEZI)
    return db_obj


@router.delete("/anestezi-tipleri/{id}")
async def delete_anestezi(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = DefinitionRepository(db)
    if not await repo.delete_anestezi(id):
        raise HTTPException(status_code=404, detail="Anestezi tipi bulunamadı")
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
        ad=obj_in.ad, sure=obj_in.sure, renk=obj_in.renk, aktif=obj_in.aktif
    )
    await invalidate(CacheNS.RANDEVU_TURLERI, CacheNS.BOOTSTRAP)
    return result


@router.put("/randevu-turleri/{id}", response_model=RandevuTuru)
async def update_randevu_turu(
    id: int, obj_in: RandevuTuruCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    db_obj = await repo.update_randevu_turu(
        id, ad=obj_in.ad, sure=obj_in.sure, renk=obj_in.renk, aktif=obj_in.aktif
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


# Biyopsi
@router.get("/biyopsi-sablonlari", response_model=List[BiyopsiSablonu])
async def get_biyopsi_sablonlari(db: AsyncSession = Depends(deps.get_db)):
    repo = DefinitionRepository(db)
    return await repo.get_biyopsi_sablonlari()


@router.post("/biyopsi-sablonlari", response_model=BiyopsiSablonu)
async def create_biyopsi(
    obj_in: BiyopsiSablonuCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    return await repo.create_biyopsi(
        no=obj_in.no, lokasyon=obj_in.lokasyon, aktif=obj_in.aktif
    )


@router.put("/biyopsi-sablonlari/{id}", response_model=BiyopsiSablonu)
async def update_biyopsi(
    id: int, obj_in: BiyopsiSablonuCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    db_obj = await repo.update_biyopsi(
        id, no=obj_in.no, lokasyon=obj_in.lokasyon, aktif=obj_in.aktif
    )
    if not db_obj:
        raise HTTPException(status_code=404, detail="Biyopsi şablonu bulunamadı")
    return db_obj


@router.delete("/biyopsi-sablonlari/{id}")
async def delete_biyopsi(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = DefinitionRepository(db)
    if not await repo.delete_biyopsi(id):
        raise HTTPException(status_code=404, detail="Biyopsi şablonu bulunamadı")
    return {"status": "success"}


# Doktorlar
@router.get("/doktorlar", response_model=List[Doktor])
@cache(expire=3600, namespace=CacheNS.DOKTORLAR)
async def get_doktorlar(db: AsyncSession = Depends(deps.get_db)):
    repo = DefinitionRepository(db)
    return await repo.get_doktorlar()


@router.post("/doktorlar", response_model=Doktor)
async def create_doktor(obj_in: DoktorCreate, db: AsyncSession = Depends(deps.get_db)):
    repo = DefinitionRepository(db)
    result = await repo.create_doktor(
        ad_soyad=obj_in.ad_soyad,
        brans=obj_in.brans,
        diploma_no=obj_in.diploma_no,
        tescil_no=obj_in.tescil_no,
        uzmanlik_tescil_no=obj_in.uzmanlik_tescil_no,
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
        tescil_no=obj_in.tescil_no,
        uzmanlik_tescil_no=obj_in.uzmanlik_tescil_no,
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


# Tetkik Tanımları
@router.get("/tetkik-tanimlari", response_model=List[TetkikTanim])
async def get_tetkik_tanimlari(
    grup: Optional[str] = None, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    return await repo.get_tetkik_tanimlari(grup=grup)


@router.post("/tetkik-tanimlari", response_model=TetkikTanim)
async def create_tetkik(
    obj_in: TetkikTanimCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    return await repo.create_tetkik(ad=obj_in.ad, grup=obj_in.grup, sira=obj_in.sira, aktif=obj_in.aktif)


@router.put("/tetkik-tanimlari/{id}", response_model=TetkikTanim)
async def update_tetkik(
    id: int, obj_in: TetkikTanimCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    db_obj = await repo.update_tetkik(
        id, ad=obj_in.ad, grup=obj_in.grup, sira=obj_in.sira, aktif=obj_in.aktif
    )
    if not db_obj:
        raise HTTPException(status_code=404, detail="Tetkik tanımı bulunamadı")
    return db_obj


@router.delete("/tetkik-tanimlari/{id}")
async def delete_tetkik(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = DefinitionRepository(db)
    if not await repo.delete_tetkik(id):
        raise HTTPException(status_code=404, detail="Tetkik tanımı bulunamadı")
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
        ad=obj_in.ad, icerik=obj_in.icerik, aktif=obj_in.aktif
    )
    await invalidate(CacheNS.RECETE_SABLONLARI, CacheNS.BOOTSTRAP)
    return result


@router.put("/recete-sablonlari/{id}", response_model=ReceteSablonu)
async def update_recete_sablonu(
    id: int, obj_in: ReceteSablonuCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    db_obj = await repo.update_recete_sablonu(
        id, ad=obj_in.ad, icerik=obj_in.icerik, aktif=obj_in.aktif
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
    grup: Optional[str] = Query(None), db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    return await repo.get_sablonlar(grup=grup)


@router.post("/sablonlar", response_model=SablonTanim)
async def create_sablon(
    obj_in: SablonTanimCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    return await repo.create_sablon(
        grup=obj_in.grup, icerik=obj_in.icerik, kod=obj_in.kod, aktif=obj_in.aktif
    )


@router.put("/sablonlar/{id}", response_model=SablonTanim)
async def update_sablon(
    id: int, obj_in: SablonTanimCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    db_obj = await repo.update_sablon(
        id, grup=obj_in.grup, icerik=obj_in.icerik, kod=obj_in.kod, aktif=obj_in.aktif
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


# Hastaneler
@router.get("/hastaneler", response_model=List[Definition])
async def get_hastaneler(db: AsyncSession = Depends(deps.get_db)):
    repo = DefinitionRepository(db)
    return await repo.get_hastaneler()


@router.post("/hastaneler", response_model=Definition)
async def create_hastane(
    obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    return await repo.create_hastane(ad=obj_in.ad, aktif=obj_in.aktif)


@router.put("/hastaneler/{id}", response_model=Definition)
async def update_hastane(
    id: int, obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    db_obj = await repo.update_hastane(id, ad=obj_in.ad, aktif=obj_in.aktif)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Hastane bulunamadı")
    return db_obj


@router.delete("/hastaneler/{id}")
async def delete_hastane(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = DefinitionRepository(db)
    if not await repo.delete_hastane(id):
        raise HTTPException(status_code=404, detail="Hastane bulunamadı")
    return {"status": "success"}


# Cerrahlar
@router.get("/cerrahlar", response_model=List[Definition])
async def get_cerrahlar(db: AsyncSession = Depends(deps.get_db)):
    repo = DefinitionRepository(db)
    return await repo.get_cerrahlar()


@router.post("/cerrahlar", response_model=Definition)
async def create_cerrah(
    obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    return await repo.create_cerrah(ad=obj_in.ad, aktif=obj_in.aktif)


@router.put("/cerrahlar/{id}", response_model=Definition)
async def update_cerrah(
    id: int, obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    db_obj = await repo.update_cerrah(id, ad=obj_in.ad, aktif=obj_in.aktif)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Cerrah bulunamadı")
    return db_obj


@router.delete("/cerrahlar/{id}")
async def delete_cerrah(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = DefinitionRepository(db)
    if not await repo.delete_cerrah(id):
        raise HTTPException(status_code=404, detail="Cerrah bulunamadı")
    return {"status": "success"}


# Anestezi Personelleri
@router.get("/anestezi-personelleri", response_model=List[Definition])
async def get_anestezi_personelleri(db: AsyncSession = Depends(deps.get_db)):
    repo = DefinitionRepository(db)
    return await repo.get_anestezi_personelleri()


@router.post("/anestezi-personelleri", response_model=Definition)
async def create_anestezi_personeli(
    obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    return await repo.create_anestezi_personeli(ad=obj_in.ad, aktif=obj_in.aktif)


@router.put("/anestezi-personelleri/{id}", response_model=Definition)
async def update_anestezi_personeli(
    id: int, obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    db_obj = await repo.update_anestezi_personeli(id, ad=obj_in.ad, aktif=obj_in.aktif)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Anestezi personeli bulunamadı")
    return db_obj


@router.delete("/anestezi-personelleri/{id}")
async def delete_anestezi_personeli(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = DefinitionRepository(db)
    if not await repo.delete_anestezi_personeli(id):
        raise HTTPException(status_code=404, detail="Anestezi personeli bulunamadı")
    return {"status": "success"}


# Hemşireler
@router.get("/hemsireler", response_model=List[Definition])
async def get_hemsireler(db: AsyncSession = Depends(deps.get_db)):
    repo = DefinitionRepository(db)
    return await repo.get_hemsireler()


@router.post("/hemsireler", response_model=Definition)
async def create_hemsire(
    obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    return await repo.create_hemsire(ad=obj_in.ad, aktif=obj_in.aktif)


@router.put("/hemsireler/{id}", response_model=Definition)
async def update_hemsire(
    id: int, obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    db_obj = await repo.update_hemsire(id, ad=obj_in.ad, aktif=obj_in.aktif)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Hemşire bulunamadı")
    return db_obj


@router.delete("/hemsireler/{id}")
async def delete_hemsire(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = DefinitionRepository(db)
    if not await repo.delete_hemsire(id):
        raise HTTPException(status_code=404, detail="Hemşire bulunamadı")
    return {"status": "success"}


# Asistanlar
@router.get("/asistanlar", response_model=List[Definition])
async def get_asistanlar(db: AsyncSession = Depends(deps.get_db)):
    repo = DefinitionRepository(db)
    return await repo.get_asistanlar()


@router.post("/asistanlar", response_model=Definition)
async def create_asistan(
    obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    return await repo.create_asistan(ad=obj_in.ad, aktif=obj_in.aktif)


@router.put("/asistanlar/{id}", response_model=Definition)
async def update_asistan(
    id: int, obj_in: DefinitionCreate, db: AsyncSession = Depends(deps.get_db)
):
    repo = DefinitionRepository(db)
    db_obj = await repo.update_asistan(id, ad=obj_in.ad, aktif=obj_in.aktif)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Asistan bulunamadı")
    return db_obj


@router.delete("/asistanlar/{id}")
async def delete_asistan(id: int, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_superuser)):
    repo = DefinitionRepository(db)
    if not await repo.delete_asistan(id):
        raise HTTPException(status_code=404, detail="Asistan bulunamadı")
    return {"status": "success"}


# ICD Codes — tek gerçek kaynak: icd_tanilar tablosu (p008 trigram indeksleri).
# JSON dosyası yalnızca seed girdisidir, çalışma zamanında okunmaz.
@router.get("/icd-search")
async def search_icd(
    q: str = Query("", min_length=1),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(deps.get_db),
):
    repo = SystemRepository(db)
    return await repo.search_icd_ranked(q, limit)


# NOT: fastapi-cache anahtarını argümanlardan üretiyor; AsyncSession bağımlılığı
# her istekte farklı olduğu için @cache burada isabet üretmezdi. Indeksli tek
# satırlık sorgu zaten ucuz, bu yüzden cache kaldırıldı.
@router.get("/icd-lookup")
async def lookup_icd_name(
    code: str = Query(..., min_length=1),
    db: AsyncSession = Depends(deps.get_db),
):
    """
    Bulunamayan kod için `name: null` döner. Kodun kendisini ad gibi geri
    döndürmek rapor/PDF çıktısına sahte tanı adı sızdırıyordu.
    """
    names = await SystemRepository(db).lookup_icd_names([code])
    name = names.get(code.strip().upper())
    return {"code": code, "name": name, "found": name is not None}


@router.post("/icd-lookup-batch")
async def lookup_icd_names_batch(
    codes: List[str],
    db: AsyncSession = Depends(deps.get_db),
) -> dict:
    """
    Aynı sayfada birden fazla ICD kodunun adı gerektiğinde (ör. bir hasta
    listesi/dashboard tablosu) satır başına ayrı istek atmak yerine tek
    seferde toplu çözümleme. Bulunamayan kodlar `null` döner.
    """
    return await SystemRepository(db).lookup_icd_names(codes)


# ---------------------------------------------------------------------------
# Bootstrap endpoint — form açılışında 7 tanım listesi tek seferde
# ---------------------------------------------------------------------------
import asyncio
from pydantic import BaseModel


class BootstrapResponse(BaseModel):
    """
    Hasta formu / muayene ekranı için gereken tüm statik tanım listelerini
    tek HTTP yanıtında toplar. Böylece 7 ayrı istek yerine 1 istek gider
    (RTT ×7 → ×1). İlaçlar paginated/autocomplete olduğu için burada yok.
    """
    doktorlar: List[Doktor]
    kurumlar: List[Definition]
    meslekler: List[Definition]
    sigortalar: List[Definition]
    takip_konulari: List[Definition]
    randevu_turleri: List[RandevuTuru]
    recete_sablonlari: List[ReceteSablonu]


@router.get("/bootstrap", response_model=BootstrapResponse)
@cache(expire=3600, namespace="def:bootstrap")
async def get_bootstrap(db: AsyncSession = Depends(deps.get_db)):
    """
    Tüm tanım listelerini tek seferde döndürür. fastapi-cache Redis'te 1 saat
    saklar; yazma endpoint'leri (POST/PUT/DELETE) ilgili namespace'lerini
    invalidate ettiğinde bu cache de bağımsız olarak yenilenecektir — ilk
    sonraki istek taze veriyi çeker ve tekrar cache'e yazar.

    NOT: asyncio.gather burada 7 DB sorgusunu gerçekten paralel çalıştırır,
    çünkü her biri bağımsız async I/O işlemi. Toplam süre en uzun sorgu
    kadar olur (yaklaşık max(t1…t7)), 7 sorgunun toplamı değil.
    """
    repo = DefinitionRepository(db)
    (
        doktorlar,
        kurumlar,
        meslekler,
        sigortalar,
        takip_konulari,
        randevu_turleri,
        recete_sablonlari,
    ) = await asyncio.gather(
        repo.get_doktorlar(),
        repo.get_kurumlar(),
        repo.get_meslekler(),
        repo.get_sigortalar(),
        repo.get_takip_konulari(),
        repo.get_randevu_turleri(),
        repo.get_recete_sablonlari(),
    )
    return BootstrapResponse(
        doktorlar=doktorlar,
        kurumlar=kurumlar,
        meslekler=meslekler,
        sigortalar=sigortalar,
        takip_konulari=takip_konulari,
        randevu_turleri=randevu_turleri,
        recete_sablonlari=recete_sablonlari,
    )
