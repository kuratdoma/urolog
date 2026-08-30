from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Type, TypeVar, Optional
from app.models.system import (
    Kurum,
    Meslek,
    OzelSigorta,
    AnesteziTipi,
    RandevuTuru,
    BiyopsiSablonu,
    Doktor,
    TetkikTanim,
    TakipKonusu,
    ReceteSablonu,
    SablonTanim,
    Hastane,
    Cerrah,
    AnesteziPersoneli,
    Hemsire,
    Asistan,
)
from app.models.base_class import Base

T = TypeVar("T", bound=Base)


class DefinitionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_all(self, model: Type[T]) -> List[T]:
        result = await self.db.execute(
            select(model).order_by(getattr(model, "id", None))
        )
        return result.scalars().all()

    async def _get_by_id(self, model: Type[T], id: int) -> Optional[T]:
        result = await self.db.execute(select(model).filter(model.id == id))
        return result.scalars().first()

    async def _create(self, model: Type[T], **kwargs) -> T:
        db_obj = model(**kwargs)
        self.db.add(db_obj)
        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj

    async def _update(self, model: Type[T], id: int, **kwargs) -> Optional[T]:
        db_obj = await self._get_by_id(model, id)
        if not db_obj:
            return None
        for key, value in kwargs.items():
            if value is not None:
                setattr(db_obj, key, value)
        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj

    async def _delete(self, model: Type[T], id: int) -> bool:
        db_obj = await self._get_by_id(model, id)
        if not db_obj:
            return False
        await self.db.delete(db_obj)
        await self.db.flush()
        return True

    # Kurumlar
    async def get_kurumlar(self) -> List[Kurum]:
        return await self._get_all(Kurum)

    async def create_kurum(self, ad: str, aktif: bool = True) -> Kurum:
        return await self._create(Kurum, ad=ad, aktif=aktif)

    async def update_kurum(
        self, id: int, ad: str = None, aktif: bool = None
    ) -> Optional[Kurum]:
        return await self._update(Kurum, id, ad=ad, aktif=aktif)

    async def delete_kurum(self, id: int) -> bool:
        return await self._delete(Kurum, id)

    # Meslekler
    async def get_meslekler(self) -> List[Meslek]:
        return await self._get_all(Meslek)

    async def create_meslek(self, ad: str, aktif: bool = True) -> Meslek:
        return await self._create(Meslek, ad=ad, aktif=aktif)

    async def update_meslek(
        self, id: int, ad: str = None, aktif: bool = None
    ) -> Optional[Meslek]:
        return await self._update(Meslek, id, ad=ad, aktif=aktif)

    async def delete_meslek(self, id: int) -> bool:
        return await self._delete(Meslek, id)

    # Sigortalar
    async def get_sigortalar(self) -> List[OzelSigorta]:
        return await self._get_all(OzelSigorta)

    async def create_sigorta(self, ad: str, aktif: bool = True) -> OzelSigorta:
        return await self._create(OzelSigorta, ad=ad, aktif=aktif)

    async def update_sigorta(
        self, id: int, ad: str = None, aktif: bool = None
    ) -> Optional[OzelSigorta]:
        return await self._update(OzelSigorta, id, ad=ad, aktif=aktif)

    async def delete_sigorta(self, id: int) -> bool:
        return await self._delete(OzelSigorta, id)

    # Anestezi
    async def get_anestezi_tipleri(self) -> List[AnesteziTipi]:
        return await self._get_all(AnesteziTipi)

    async def create_anestezi(self, ad: str, aktif: bool = True) -> AnesteziTipi:
        return await self._create(AnesteziTipi, ad=ad, aktif=aktif)

    async def update_anestezi(
        self, id: int, ad: str = None, aktif: bool = None
    ) -> Optional[AnesteziTipi]:
        return await self._update(AnesteziTipi, id, ad=ad, aktif=aktif)

    async def delete_anestezi(self, id: int) -> bool:
        return await self._delete(AnesteziTipi, id)

    # Randevu Türleri
    async def get_randevu_turleri(self) -> List[RandevuTuru]:
        return await self._get_all(RandevuTuru)

    async def create_randevu_turu(
        self, ad: str, sure: int, renk: str, aktif: bool = True
    ) -> RandevuTuru:
        return await self._create(RandevuTuru, ad=ad, sure=sure, renk=renk, aktif=aktif)

    async def update_randevu_turu(
        self,
        id: int,
        ad: str = None,
        sure: int = None,
        renk: str = None,
        aktif: bool = None,
    ) -> Optional[RandevuTuru]:
        return await self._update(
            RandevuTuru, id, ad=ad, sure=sure, renk=renk, aktif=aktif
        )

    async def delete_randevu_turu(self, id: int) -> bool:
        return await self._delete(RandevuTuru, id)

    # Biyopsi
    async def get_biyopsi_sablonlari(self) -> List[BiyopsiSablonu]:
        return await self._get_all(BiyopsiSablonu)

    async def create_biyopsi(
        self, no: Optional[int], lokasyon: str, aktif: bool = True
    ) -> BiyopsiSablonu:
        return await self._create(BiyopsiSablonu, no=no, lokasyon=lokasyon, aktif=aktif)

    async def update_biyopsi(
        self, id: int, no: int = None, lokasyon: str = None, aktif: bool = None
    ) -> Optional[BiyopsiSablonu]:
        return await self._update(
            BiyopsiSablonu, id, no=no, lokasyon=lokasyon, aktif=aktif
        )

    async def delete_biyopsi(self, id: int) -> bool:
        return await self._delete(BiyopsiSablonu, id)

    # Doktorlar
    async def get_doktorlar(self) -> List[Doktor]:
        return await self._get_all(Doktor)

    async def create_doktor(
        self,
        ad_soyad: str,
        brans: str = None,
        diploma_no: str = None,
        tescil_no: str = None,
        uzmanlik_tescil_no: str = None,
        aktif: bool = True,
    ) -> Doktor:
        return await self._create(
            Doktor,
            ad_soyad=ad_soyad,
            brans=brans,
            diploma_no=diploma_no,
            tescil_no=tescil_no,
            uzmanlik_tescil_no=uzmanlik_tescil_no,
            aktif=aktif,
        )

    async def update_doktor(
        self,
        id: int,
        ad_soyad: str = None,
        brans: str = None,
        diploma_no: str = None,
        tescil_no: str = None,
        uzmanlik_tescil_no: str = None,
        aktif: bool = None,
    ) -> Optional[Doktor]:
        return await self._update(
            Doktor,
            id,
            ad_soyad=ad_soyad,
            brans=brans,
            diploma_no=diploma_no,
            tescil_no=tescil_no,
            uzmanlik_tescil_no=uzmanlik_tescil_no,
            aktif=aktif,
        )

    async def delete_doktor(self, id: int) -> bool:
        return await self._delete(Doktor, id)

    # Tetkik Tanımları
    async def get_tetkik_tanimlari(self, grup: str = None) -> List[TetkikTanim]:
        if grup:
            result = await self.db.execute(
                select(TetkikTanim)
                .filter(TetkikTanim.grup == grup)
                .order_by(TetkikTanim.sira, TetkikTanim.ad)
            )
            return result.scalars().all()
        return await self._get_all(TetkikTanim)

    async def create_tetkik(
        self, ad: str, grup: str = None, sira: int = 0, aktif: bool = True
    ) -> TetkikTanim:
        return await self._create(TetkikTanim, ad=ad, grup=grup, sira=sira, aktif=aktif)

    async def update_tetkik(
        self, id: int, ad: str = None, grup: str = None, sira: int = None, aktif: bool = None
    ) -> Optional[TetkikTanim]:
        return await self._update(TetkikTanim, id, ad=ad, grup=grup, sira=sira, aktif=aktif)

    async def delete_tetkik(self, id: int) -> bool:
        return await self._delete(TetkikTanim, id)

    # Takip Konuları
    async def get_takip_konulari(self) -> List[TakipKonusu]:
        return await self._get_all(TakipKonusu)

    async def create_takip_konusu(self, ad: str, aktif: bool = True) -> TakipKonusu:
        return await self._create(TakipKonusu, ad=ad, aktif=aktif)

    async def update_takip_konusu(
        self, id: int, ad: str = None, aktif: bool = None
    ) -> Optional[TakipKonusu]:
        return await self._update(TakipKonusu, id, ad=ad, aktif=aktif)

    async def delete_takip_konusu(self, id: int) -> bool:
        return await self._delete(TakipKonusu, id)

    # Reçete Şablonları
    async def get_recete_sablonlari(self) -> List[ReceteSablonu]:
        return await self._get_all(ReceteSablonu)

    async def create_recete_sablonu(
        self, ad: str, icerik: str = None, aktif: bool = True
    ) -> ReceteSablonu:
        return await self._create(ReceteSablonu, ad=ad, icerik=icerik, aktif=aktif)

    async def update_recete_sablonu(
        self, id: int, ad: str = None, icerik: str = None, aktif: bool = None
    ) -> Optional[ReceteSablonu]:
        return await self._update(ReceteSablonu, id, ad=ad, icerik=icerik, aktif=aktif)

    async def delete_recete_sablonu(self, id: int) -> bool:
        return await self._delete(ReceteSablonu, id)

    # Genel Şablonlar (SablonTanim)
    async def get_sablonlar(self, grup: str = None) -> List[SablonTanim]:
        if grup:
            result = await self.db.execute(
                select(SablonTanim)
                .filter(SablonTanim.grup == grup)
                .order_by(SablonTanim.id)
            )
            return result.scalars().all()
        return await self._get_all(SablonTanim)

    async def create_sablon(
        self, grup: str, icerik: str, kod: str = None, aktif: bool = True
    ) -> SablonTanim:
        return await self._create(
            SablonTanim, grup=grup, icerik=icerik, kod=kod, aktif=aktif
        )

    async def update_sablon(
        self,
        id: int,
        grup: str = None,
        icerik: str = None,
        kod: str = None,
        aktif: bool = None,
    ) -> Optional[SablonTanim]:
        return await self._update(
            SablonTanim, id, grup=grup, icerik=icerik, kod=kod, aktif=aktif
        )

    async def delete_sablon(self, id: int) -> bool:
        return await self._delete(SablonTanim, id)

    # Hastaneler
    async def get_hastaneler(self) -> List[Hastane]:
        return await self._get_all(Hastane)

    async def create_hastane(self, ad: str, aktif: bool = True) -> Hastane:
        return await self._create(Hastane, ad=ad, aktif=aktif)

    async def update_hastane(self, id: int, ad: str = None, aktif: bool = None) -> Optional[Hastane]:
        return await self._update(Hastane, id, ad=ad, aktif=aktif)

    async def delete_hastane(self, id: int) -> bool:
        return await self._delete(Hastane, id)

    # Cerrahlar
    async def get_cerrahlar(self) -> List[Cerrah]:
        return await self._get_all(Cerrah)

    async def create_cerrah(self, ad: str, aktif: bool = True) -> Cerrah:
        return await self._create(Cerrah, ad=ad, aktif=aktif)

    async def update_cerrah(self, id: int, ad: str = None, aktif: bool = None) -> Optional[Cerrah]:
        return await self._update(Cerrah, id, ad=ad, aktif=aktif)

    async def delete_cerrah(self, id: int) -> bool:
        return await self._delete(Cerrah, id)

    # Anestezi Personelleri
    async def get_anestezi_personelleri(self) -> List[AnesteziPersoneli]:
        return await self._get_all(AnesteziPersoneli)

    async def create_anestezi_personeli(self, ad: str, aktif: bool = True) -> AnesteziPersoneli:
        return await self._create(AnesteziPersoneli, ad=ad, aktif=aktif)

    async def update_anestezi_personeli(self, id: int, ad: str = None, aktif: bool = None) -> Optional[AnesteziPersoneli]:
        return await self._update(AnesteziPersoneli, id, ad=ad, aktif=aktif)

    async def delete_anestezi_personeli(self, id: int) -> bool:
        return await self._delete(AnesteziPersoneli, id)

    # Hemşireler
    async def get_hemsireler(self) -> List[Hemsire]:
        return await self._get_all(Hemsire)

    async def create_hemsire(self, ad: str, aktif: bool = True) -> Hemsire:
        return await self._create(Hemsire, ad=ad, aktif=aktif)

    async def update_hemsire(self, id: int, ad: str = None, aktif: bool = None) -> Optional[Hemsire]:
        return await self._update(Hemsire, id, ad=ad, aktif=aktif)

    async def delete_hemsire(self, id: int) -> bool:
        return await self._delete(Hemsire, id)

    # Asistanlar
    async def get_asistanlar(self) -> List[Asistan]:
        return await self._get_all(Asistan)

    async def create_asistan(self, ad: str, aktif: bool = True) -> Asistan:
        return await self._create(Asistan, ad=ad, aktif=aktif)

    async def update_asistan(self, id: int, ad: str = None, aktif: bool = None) -> Optional[Asistan]:
        return await self._update(Asistan, id, ad=ad, aktif=aktif)

    async def delete_asistan(self, id: int) -> bool:
        return await self._delete(Asistan, id)
