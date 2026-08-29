from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class DefinitionBase(BaseModel):
    ad: str
    aktif: bool = True


class DefinitionCreate(DefinitionBase):
    pass


class Definition(DefinitionBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RandevuTuruBase(BaseModel):
    ad: str
    sure: int = 30
    renk: str = "#3b82f6"
    aktif: bool = True


class RandevuTuruCreate(RandevuTuruBase):
    pass


class RandevuTuru(RandevuTuruBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class BiyopsiSablonuBase(BaseModel):
    no: Optional[int] = None
    lokasyon: str
    aktif: bool = True


class BiyopsiSablonuCreate(BiyopsiSablonuBase):
    pass


class BiyopsiSablonu(BiyopsiSablonuBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DoktorBase(BaseModel):
    ad_soyad: str
    brans: Optional[str] = None
    diploma_no: Optional[str] = None
    tescil_no: Optional[str] = None
    uzmanlik_tescil_no: Optional[str] = None
    aktif: bool = True


class DoktorCreate(DoktorBase):
    pass


class Doktor(DoktorBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TetkikTanimBase(BaseModel):
    ad: str
    grup: Optional[str] = None
    sira: int = 0
    aktif: bool = True


class TetkikTanimCreate(TetkikTanimBase):
    pass


class TetkikTanim(TetkikTanimBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TakipKonusuBase(BaseModel):
    ad: str
    aktif: bool = True


class TakipKonusuCreate(TakipKonusuBase):
    pass


class TakipKonusu(TakipKonusuBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ReceteSablonuBase(BaseModel):
    ad: str
    icerik: Optional[str] = None  # JSON string
    aktif: bool = True


class ReceteSablonuCreate(ReceteSablonuBase):
    pass


class ReceteSablonu(ReceteSablonuBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SablonTanimBase(BaseModel):
    grup: str
    kod: Optional[str] = None
    icerik: str
    aktif: bool = True


class SablonTanimCreate(SablonTanimBase):
    pass


class SablonTanim(SablonTanimBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
