from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from decimal import Decimal


# --- ÜRÜN ŞEMALARI ---
class StokUrunBase(BaseModel):
    urun_adi: str
    marka: Optional[str] = None
    urun_tipi: Optional[str] = None
    birim: Optional[str] = None
    birim_fiyat: Optional[Decimal] = 0
    min_stok: Optional[int] = 5
    barkod: Optional[str] = None
    aktif: Optional[bool] = True


class StokUrunCreate(StokUrunBase):
    pass


class StokUrunUpdate(StokUrunBase):
    urun_adi: Optional[str] = None
    mevcut_stok: Optional[int] = None  # Manuel güncelleme için


class StokUrunResponse(StokUrunBase):
    id: int
    mevcut_stok: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# --- ALIM ŞEMALARI ---
class StokAlimBase(BaseModel):
    urun_id: int
    firma_id: Optional[int] = None
    alim_tarihi: Optional[datetime] = None
    miktar: int
    birim_fiyat: Decimal
    toplam_tutar: Optional[Decimal] = None
    fatura_no: Optional[str] = None
    notlar: Optional[str] = None


class StokAlimCreate(StokAlimBase):
    pass


class StokAlimResponse(StokAlimBase):
    id: int
    created_at: Optional[datetime] = None
    urun_adi: Optional[str] = None  # Kolaylık için join edip doldurabiliriz

    model_config = ConfigDict(from_attributes=True)


# --- HAREKET ŞEMALARI ---
class StokHareketBase(BaseModel):
    urun_id: int
    hasta_id: Optional[str] = None
    hareket_tipi: str  # GIRIS, CIKIS, DUZELTME
    miktar: int
    islem_tarihi: Optional[datetime] = None
    kaynak: Optional[str] = "Manuel"
    kaynak_ref: Optional[str] = None
    notlar: Optional[str] = None


class StokHareketCreate(StokHareketBase):
    pass


class StokHareketResponse(StokHareketBase):
    id: int
    kullanici_id: Optional[int] = None
    created_at: Optional[datetime] = None
    urun_adi: Optional[str] = None
    hasta_adi: Optional[str] = None  # Frontend'de göstermek için

    model_config = ConfigDict(from_attributes=True)


# --- RAPORLAMA ---
class StokOzet(BaseModel):
    toplam_urun: int
    toplam_stok_adedi: int
    toplam_stok_degeri: Decimal
    dusuk_stoklu_urunler: int
