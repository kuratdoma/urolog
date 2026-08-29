from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from decimal import Decimal

from app.models.stock import HareketTipi


# --- ÜRÜN ŞEMALARI ---
class StokUrunBase(BaseModel):
    urun_adi: str = Field(min_length=1, max_length=255)
    marka: Optional[str] = Field(default=None, max_length=100)
    urun_tipi: Optional[str] = Field(default=None, max_length=50)
    birim: Optional[str] = Field(default=None, max_length=20)
    birim_fiyat: Optional[Decimal] = Field(default=0, ge=0)
    min_stok: Optional[int] = Field(default=5, ge=0)
    barkod: Optional[str] = Field(default=None, max_length=50)
    aktif: Optional[bool] = True


class StokUrunCreate(StokUrunBase):
    pass


class StokUrunUpdate(StokUrunBase):
    urun_adi: Optional[str] = Field(default=None, min_length=1, max_length=255)
    # NOT: mevcut_stok bilerek yok. Stok yalnızca hareket/alım kayıtları
    # üzerinden değişir; doğrudan yazmak ledger ile sayacı tutarsız bırakır.
    # Sayım düzeltmesi için: POST /stock/movements (hareket_tipi=DUZELTME).


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
    miktar: int = Field(gt=0, description="Alım miktarı pozitif olmalıdır")
    birim_fiyat: Decimal = Field(ge=0)
    toplam_tutar: Optional[Decimal] = Field(default=None, ge=0)
    fatura_no: Optional[str] = Field(default=None, max_length=50)
    notlar: Optional[str] = None


class StokAlimCreate(StokAlimBase):
    pass


class StokAlimResponse(StokAlimBase):
    id: int
    created_at: Optional[datetime] = None
    urun_adi: Optional[str] = None  # repository join ile doldurur

    model_config = ConfigDict(from_attributes=True)


# --- HAREKET ŞEMALARI ---
class StokHareketBase(BaseModel):
    urun_id: int
    hasta_id: Optional[UUID] = None
    hareket_tipi: HareketTipi  # GIRIS | CIKIS | DUZELTME — serbest metin kabul edilmez
    # GIRIS/CIKIS: değişim miktarı (pozitif). DUZELTME: sayımda bulunan
    # gerçek stok adedi (0 dahil) — fark sunucuda hesaplanır.
    miktar: int = Field(ge=0)
    islem_tarihi: Optional[datetime] = None
    kaynak: Optional[str] = Field(default="Manuel", max_length=50)
    kaynak_ref: Optional[str] = Field(default=None, max_length=50)
    notlar: Optional[str] = None


class StokHareketCreate(StokHareketBase):
    pass


class StokHareketResponse(StokHareketBase):
    id: int
    # Kayıtlı hareketin miktarı DUZELTME'de negatif olabilir (ledger farkı),
    # bu yüzden yanıtta ge=0 kısıtı yoktur.
    miktar: int
    kullanici_id: Optional[int] = None
    created_at: Optional[datetime] = None
    urun_adi: Optional[str] = None
    hasta_adi: Optional[str] = None  # repository join ile doldurur

    model_config = ConfigDict(from_attributes=True)


# --- RAPORLAMA ---
class StokOzet(BaseModel):
    toplam_urun: int
    toplam_stok_adedi: int
    toplam_stok_degeri: Decimal
    dusuk_stoklu_urunler: int
