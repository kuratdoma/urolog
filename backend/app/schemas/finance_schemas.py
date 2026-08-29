from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, ConfigDict, ConfigDict, Field


# =============================================================================
# FİNANS KATEGORİLERİ
# =============================================================================
class FinansKategoriBase(BaseModel):
    ad: str
    tip: str  # 'gelir', 'gider'
    ust_kategori_id: Optional[int] = None
    renk: Optional[str] = None
    ikon: Optional[str] = None
    aktif: bool = True


class FinansKategoriCreate(FinansKategoriBase):
    pass


class FinansKategoriUpdate(BaseModel):
    ad: Optional[str] = None
    tip: Optional[str] = None
    ust_kategori_id: Optional[int] = None
    renk: Optional[str] = None
    ikon: Optional[str] = None
    aktif: Optional[bool] = None


class FinansKategoriResponse(FinansKategoriBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# FİNANS HİZMETLERİ
# =============================================================================
class FinansHizmetBase(BaseModel):
    ad: str
    kod: Optional[str] = None
    kategori: Optional[str] = None
    varsayilan_fiyat: Optional[float] = None
    para_birimi: Optional[str] = "TRY"
    kdv_orani: int = 0
    aktif: bool = True


class FinansHizmetCreate(FinansHizmetBase):
    pass


class FinansHizmetUpdate(BaseModel):
    ad: Optional[str] = None
    kod: Optional[str] = None
    kategori: Optional[str] = None
    varsayilan_fiyat: Optional[float] = None
    para_birimi: Optional[str] = None
    kdv_orani: Optional[int] = None
    aktif: Optional[bool] = None


class FinansHizmetResponse(FinansHizmetBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# KASALAR
# =============================================================================
class KasaBase(BaseModel):
    ad: str
    tip: str  # 'nakit', 'banka', 'pos'
    bakiye: float = 0
    para_birimi: str = "TRY"
    banka_adi: Optional[str] = None
    iban: Optional[str] = None
    aktif: bool = True
    sira_no: int = 0


class KasaCreate(KasaBase):
    pass


class KasaUpdate(BaseModel):
    ad: Optional[str] = None
    tip: Optional[str] = None
    banka_adi: Optional[str] = None
    iban: Optional[str] = None
    aktif: Optional[bool] = None
    sira_no: Optional[int] = None


class KasaResponse(KasaBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class KasaTransferRequest(BaseModel):
    kaynak_kasa_id: int
    hedef_kasa_id: int
    tutar: float = Field(gt=0)
    aciklama: Optional[str] = None


# =============================================================================
# KASA HAREKETLERİ
# =============================================================================
class KasaHareketBase(BaseModel):
    kasa_id: int
    hareket_tipi: str  # 'giris', 'cikis'
    tutar: float
    aciklama: Optional[str] = None


class KasaHareketCreate(KasaHareketBase):
    islem_id: Optional[int] = None
    odeme_id: Optional[int] = None
    created_by: Optional[str] = None


class KasaHareketResponse(KasaHareketBase):
    id: int
    islem_id: Optional[int] = None
    odeme_id: Optional[int] = None
    tarih: Optional[datetime] = None
    onceki_bakiye: Optional[float] = None
    sonraki_bakiye: Optional[float] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# FİRMALAR
# =============================================================================
class FirmaBase(BaseModel):
    ad: str
    vergi_no: Optional[str] = None
    telefon: Optional[str] = None
    email: Optional[str] = None
    adres: Optional[str] = None
    notlar: Optional[str] = None


class FirmaCreate(FirmaBase):
    pass


class FirmaUpdate(BaseModel):
    ad: Optional[str] = None
    vergi_no: Optional[str] = None
    telefon: Optional[str] = None
    email: Optional[str] = None
    adres: Optional[str] = None
    notlar: Optional[str] = None


class FirmaResponse(FirmaBase):
    id: int
    created_at: Optional[datetime] = None
    toplam_borc: Optional[float] = None  # Computed field

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# FİNANS İŞLEM SATIRLARI
# =============================================================================
class FinansIslemSatirBase(BaseModel):
    hizmet_id: Optional[int] = None
    hizmet_adi: str
    adet: int = 1
    birim_fiyat: float
    toplam: float
    doktor: Optional[str] = None


class FinansIslemSatirCreate(FinansIslemSatirBase):
    pass


class FinansIslemSatirResponse(FinansIslemSatirBase):
    id: int
    islem_id: int

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# FİNANS ÖDEMELERİ
# =============================================================================
class FinansOdemeBase(BaseModel):
    kasa_id: Optional[int] = None
    odeme_tarihi: date
    tutar: float
    odeme_yontemi: (
        str  # 'nakit', 'kredi_karti', 'havale', 'sgk', 'ozel_sigorta', 'diger'
    )
    banka: Optional[str] = None
    taksit_sayisi: int = 1
    kapora: bool = False
    notlar: Optional[str] = None


class FinansOdemeCreate(FinansOdemeBase):
    pass


class FinansOdemeResponse(FinansOdemeBase):
    id: int
    islem_id: int
    created_at: Optional[datetime] = None
    kasa_adi: Optional[str] = None  # Computed field
    taksitler: List["FinansTaksitResponse"] = []

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# FİNANS TAKSİTLERİ
# =============================================================================
class FinansTaksitBase(BaseModel):
    taksit_no: int
    tutar: float
    vade_tarihi: date
    tahsil_tarihi: Optional[date] = None
    durum: str = "bekliyor"  # 'bekliyor', 'tahsil_edildi'


class FinansTaksitCreate(FinansTaksitBase):
    odeme_id: int


class FinansTaksitResponse(FinansTaksitBase):
    id: int
    odeme_id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# FİNANS İŞLEMLERİ (Ana İşlem)
# =============================================================================
class FinansIslemBase(BaseModel):
    hasta_id: Optional[UUID] = None
    muayene_id: Optional[UUID] = None
    tarih: date
    islem_tipi: str  # 'gelir', 'gider', 'transfer'
    durum: str = "tamamlandi"  # 'tamamlandi', 'bekliyor', 'iptal'
    kategori_id: Optional[int] = None
    aciklama: Optional[str] = None

    tutar: float
    net_tutar: float
    para_birimi: str = "TRY"

    kasa_id: Optional[int] = None
    firma_id: Optional[int] = None
    doktor: Optional[str] = None

    vade_tarihi: Optional[date] = None
    notlar: Optional[str] = None
    belge_url: Optional[str] = None


class FinansIslemCreate(FinansIslemBase):
    satirlar: List[FinansIslemSatirCreate] = []
    odemeler: List[FinansOdemeCreate] = []


class FinansIslemUpdate(BaseModel):
    tarih: Optional[date] = None
    durum: Optional[str] = None
    kategori_id: Optional[int] = None
    aciklama: Optional[str] = None
    tutar: Optional[float] = None
    net_tutar: Optional[float] = None
    kasa_id: Optional[int] = None
    firma_id: Optional[int] = None
    doktor: Optional[str] = None
    vade_tarihi: Optional[date] = None
    notlar: Optional[str] = None
    belge_url: Optional[str] = None


class FinansIslemResponse(FinansIslemBase):
    id: int
    referans_kodu: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    iptal_tarihi: Optional[datetime] = None
    iptal_nedeni: Optional[str] = None

    # Computed fields
    hasta_adi: Optional[str] = None
    kategori_adi: Optional[str] = None
    kasa_adi: Optional[str] = None
    firma_adi: Optional[str] = None

    # Relations
    satirlar: List[FinansIslemSatirResponse] = []
    odemeler: List[FinansOdemeResponse] = []

    model_config = ConfigDict(from_attributes=True)


class FinansIslemListResponse(BaseModel):
    """Liste görünümü için hafif response"""

    id: int
    referans_kodu: str
    hasta_id: Optional[UUID] = None
    hasta_adi: Optional[str] = None
    tarih: date
    islem_tipi: str
    durum: str
    tutar: float
    net_tutar: float
    aciklama: Optional[str] = None
    vade_tarihi: Optional[date] = None
    kategori_adi: Optional[str] = None
    kasa_adi: Optional[str] = None
    firma_adi: Optional[str] = None
    doktor: Optional[str] = None
    odenen_tutar: float = 0
    kalan_tutar: float = 0
    # Ödeme özeti — liste görünümünde odemeler ilişkisini yüklemeden
    odeme_sayisi: int = 0
    odeme_yontemi: Optional[str] = None  # Tek ödeme varsa yöntemi, çoklu ise None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class FinansIslemPaginationResponse(BaseModel):
    items: List[FinansIslemListResponse]
    total: int
    skip: int
    limit: int

    model_config = ConfigDict(from_attributes=True)


class FinansIslemIptalRequest(BaseModel):
    iptal_nedeni: str


# =============================================================================
# HASTA CARİ
# =============================================================================
class HastaCariResponse(BaseModel):
    hasta_id: UUID
    hasta_adi: Optional[str] = None
    toplam_borc: float = 0
    toplam_odeme: float = 0
    bakiye: float = 0  # Pozitif = borçlu
    vadesi_gecmis_borc: float = 0
    son_islem_tarihi: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# ÖZET ve RAPORLAR
# =============================================================================
class FinansOzetResponse(BaseModel):
    toplam_gelir: float = 0
    toplam_gider: float = 0
    net_bakiye: float = 0
    bekleyen_tahsilat: float = 0
    vadesi_gecmis_islem_sayisi: int = 0
    bugun_gelir: float = 0
    bugun_gider: float = 0


class GunlukOzetResponse(BaseModel):
    tarih: date
    gelir: float = 0
    gider: float = 0
    net: float = 0


class AylikOzetResponse(BaseModel):
    yil: int
    ay: int
    ay_adi: str
    gelir: float = 0
    gider: float = 0
    net: float = 0


# =============================================================================
# FİLTRELEME
# =============================================================================
class EkstreSatiriResponse(BaseModel):
    tarih: date
    referans_kodu: str
    aciklama: str
    tip: str  # 'borc' | 'alacak'
    borc: float = 0
    alacak: float = 0
    bakiye: float = 0


class HastaEkstreResponse(BaseModel):
    hasta_id: UUID
    baslangic: Optional[date] = None
    bitis: Optional[date] = None
    toplam_borc: float = 0
    toplam_alacak: float = 0
    bakiye: float = 0
    satirlar: List[EkstreSatiriResponse] = []


class AcikIslemResponse(BaseModel):
    """Toplu tahsilat ekranında listelenecek açık borç satırı."""
    id: int
    referans_kodu: str
    tarih: date
    vade_tarihi: Optional[date] = None
    aciklama: Optional[str] = None
    net_tutar: float = 0
    odenen_tutar: float = 0
    kalan_tutar: float = 0


class TopluTahsilatRequest(BaseModel):
    tutar: float = Field(gt=0)
    kasa_id: Optional[int] = None
    odeme_yontemi: str
    odeme_tarihi: date


class TahsilatDagitimSatiri(BaseModel):
    islem_id: int
    referans_kodu: str
    tutar: float
    kalan_borc: float


class TopluTahsilatResponse(BaseModel):
    tahsil_edilen: float
    islem_sayisi: int
    dagitim: List[TahsilatDagitimSatiri] = []


class KategoriKirilimResponse(BaseModel):
    kategori_id: Optional[int] = None
    kategori_adi: str
    renk: Optional[str] = None
    toplam: float = 0
    islem_sayisi: int = 0
    yuzde: float = 0


class YaslandirmaKovaResponse(BaseModel):
    kova: str  # vadesi_gelmedi, 0_30, 31_60, 61_90, 90_plus
    etiket: str
    tutar: float = 0
    islem_sayisi: int = 0


class FinansIslemFilters(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    islem_tipi: Optional[str] = None
    durum: Optional[str] = None
    kategori_id: Optional[int] = None
    odeme_yontemi: Optional[str] = None
    hasta_id: Optional[UUID] = None
    muayene_id: Optional[UUID] = None
    firma_id: Optional[int] = None
    kasa_id: Optional[int] = None
    min_tutar: Optional[float] = None
    max_tutar: Optional[float] = None
    referans: Optional[str] = None
    vade_gecmis: Optional[bool] = None


# =============================================================================
# ESKİ MODELLER (Geriye Uyumluluk)
# =============================================================================


# Kasa Tanim (Eski)
class KasaTanimBase(BaseModel):
    ad: str
    tip: str  # NAKIT, BANKA, POS
    para_birimi: Optional[str] = "TL"
    aktif: bool = True


class KasaTanimCreate(KasaTanimBase):
    pass


class KasaTanimResponse(KasaTanimBase):
    id: int
    bakiye: Optional[float] = 0  # Kasa bakiyesi
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# Hizmet Tanim (Eski)
class HizmetTanimBase(BaseModel):
    ad: str
    kod: Optional[str] = None
    fiyat: Optional[float] = 0.0
    para_birimi: Optional[str] = "TL"
    kdv_orani: Optional[int] = 0
    aktif: bool = True


class HizmetTanimCreate(HizmetTanimBase):
    pass


class HizmetTanimResponse(HizmetTanimBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# Finans Hareket (Eski)
class HastaFinansHareketBase(BaseModel):
    tarih: Optional[date] = None
    muayene_id: Optional[UUID] = None
    islem_tipi: str  # HIZMET, TAHSILAT

    hizmet_id: Optional[int] = None
    kasa_id: Optional[int] = None
    odeme_yontemi: Optional[str] = None  # Kredi Kartı, Nakit, Havale/EFT
    odeme_araci: Optional[str] = None
    referans_kodu: Optional[str] = None

    aciklama: Optional[str] = None
    borc: Optional[float] = 0.0
    alacak: Optional[float] = 0.0
    bakiye: Optional[float] = None
    doktor: Optional[str] = None


class HastaFinansHareketCreate(HastaFinansHareketBase):
    hasta_id: UUID


class HastaFinansHareketResponse(HastaFinansHareketBase):
    id: int
    hasta_id: UUID
    hizmet_ad: Optional[str] = None  # Optional computed field
    kasa_ad: Optional[str] = None  # Optional computed field

    model_config = ConfigDict(from_attributes=True)
