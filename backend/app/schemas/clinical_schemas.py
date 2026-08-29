from datetime import date, datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


# Muayene Schemas
class MuayeneBase(BaseModel):
    tarih: Optional[date] = None
    sikayet: Optional[str] = None
    oyku: Optional[str] = None

    # Physical Exam
    tansiyon: Optional[str] = None
    ates: Optional[str] = None
    kvah: Optional[str] = None
    bobrek_sag: Optional[str] = None
    bobrek_sol: Optional[str] = None
    suprapubik_kitle: Optional[str] = None
    ego: Optional[str] = None
    rektal_tuse: Optional[str] = None

    tani1: Optional[str] = None
    tani1_kodu: Optional[str] = None
    tani2: Optional[str] = None
    tani2_kodu: Optional[str] = None
    tani3: Optional[str] = None
    tani3_kodu: Optional[str] = None
    tani4: Optional[str] = None
    tani4_kodu: Optional[str] = None
    tani5: Optional[str] = None
    tani5_kodu: Optional[str] = None
    oneriler: Optional[str] = None
    tedavi: Optional[str] = None
    sonuc: Optional[str] = None

    # Symptoms
    disuri: Optional[str] = None
    pollakiuri: Optional[str] = None
    nokturi: Optional[str] = None
    hematuri: Optional[str] = None
    genital_akinti: Optional[str] = None
    kabizlik: Optional[str] = None
    tas_oyku: Optional[str] = None

    # IPSS
    catallanma: Optional[str] = None
    projeksiyon_azalma: Optional[str] = None
    kalibre_incelme: Optional[str] = None
    idrar_bas_zorluk: Optional[str] = None
    kesik_idrar_yapma: Optional[str] = None
    terminal_damlama: Optional[str] = None
    residiv_hissi: Optional[str] = None
    urgency: Optional[str] = None
    inkontinans: Optional[str] = None

    # New Fields
    recete: Optional[str] = None
    ozgecmis: Optional[str] = None
    soygecmis: Optional[str] = None
    kullandigi_ilaclar: Optional[str] = None
    kan_sulandirici: Optional[int] = 0
    aliskanliklar: Optional[str] = None
    sistem_sorgu: Optional[str] = None
    ipss_skor: Optional[str] = None
    iief_ef_skor: Optional[str] = None
    iief_ef_answers: Optional[str] = None
    fizik_muayene: Optional[str] = None
    erektil_islev: Optional[str] = None
    ejakulasyon: Optional[str] = None
    mshq: Optional[str] = None
    prosedur: Optional[str] = None
    doktor: Optional[str] = None
    bulgu_notu: Optional[str] = None
    allerjiler: Optional[str] = None


class MuayeneCreate(MuayeneBase):
    hasta_id: UUID


class MuayeneUpdate(MuayeneBase):
    pass


class MuayeneResponse(MuayeneBase):
    id: UUID
    hasta_id: UUID

    model_config = ConfigDict(from_attributes=True)


# Operation/Operasyon Schema
class OperasyonBase(BaseModel):
    tarih: Optional[date] = None
    ameliyat: Optional[str] = None
    pre_op_tani: Optional[str] = None
    post_op_tani: Optional[str] = None
    notlar: Optional[str] = None
    ekip: Optional[str] = None
    patoloji: Optional[str] = None
    anestezi_tur: Optional[str] = None
    claviendindo: Optional[str] = None
    hastane_id: Optional[str] = None
    asa_skoru: Optional[str] = None
    anestezi_sekli: Optional[str] = None


class OperasyonCreate(OperasyonBase):
    hasta_id: UUID


class OperasyonUpdate(OperasyonBase):
    pass


class OperasyonResponse(OperasyonBase):
    id: UUID
    hasta_id: UUID

    model_config = ConfigDict(from_attributes=True)


# Takip/HastaNotu Schemas
class HastaNotuBase(BaseModel):
    tarih: Optional[date] = None
    tur: Optional[str] = None  # DB: tip
    notlar: Optional[str] = None  # DB: icerik
    durum: Optional[str] = None  # DB: sembol
    etiketler: Optional[str] = None


class HastaNotuCreate(HastaNotuBase):
    hasta_id: UUID


class HastaNotuUpdate(HastaNotuBase):
    pass


class HastaNotuResponse(HastaNotuBase):
    id: UUID
    hasta_id: UUID
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# Fotoğraf Arşivi Schemas
class FotografBase(BaseModel):
    tarih: Optional[date] = None
    asama: Optional[str] = None
    baslik: Optional[str] = None
    etiketler: Optional[str] = None
    dosya_yolu: Optional[str] = None
    dosya_adi: Optional[str] = None
    notlar: Optional[str] = None


class FotografCreate(FotografBase):
    hasta_id: UUID


class FotografUpdate(FotografBase):
    pass


class FotografResponse(FotografBase):
    id: UUID
    hasta_id: UUID
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# Tetkik Sonuçları (Görüntüleme ve Laboratuvar) Schemas
class TetkikSonucBase(BaseModel):
    tarih: Optional[date] = None
    kategori: Optional[str] = None  # 'Goruntuleme' or 'Laboratuvar'
    tetkik_adi: Optional[str] = None
    sonuc: Optional[str] = None
    birim: Optional[str] = None
    referans_araligi: Optional[str] = None
    sembol: Optional[str] = None  # 'check', 'warning', etc.
    dosya_yolu: Optional[str] = None
    dosya_adi: Optional[str] = None


class TetkikSonucCreate(TetkikSonucBase):
    hasta_id: UUID


class TetkikSonucUpdate(TetkikSonucBase):
    pass


class TetkikSonucResponse(TetkikSonucBase):
    id: UUID
    hasta_id: UUID

    model_config = ConfigDict(from_attributes=True)


# Telefon Görüşmeleri Schemas
class TelefonGorusmesiBase(BaseModel):
    tarih: Optional[date] = None
    notlar: Optional[str] = None
    doktor: Optional[str] = None


class TelefonGorusmesiCreate(TelefonGorusmesiBase):
    hasta_id: UUID


class TelefonGorusmesiUpdate(TelefonGorusmesiBase):
    pass


class TelefonGorusmesiResponse(TelefonGorusmesiBase):
    id: UUID
    hasta_id: UUID
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# Kişisel Notlar (Private Notes) Schemas
class KisiselNotBase(BaseModel):
    icerik: Optional[str] = None


class KisiselNotCreate(KisiselNotBase):
    hasta_id: UUID


class KisiselNotUpdate(KisiselNotBase):
    pass


class KisiselNotResponse(KisiselNotBase):
    id: UUID
    hasta_id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# İstirahat Raporu Schemas
class IstirahatRaporuBase(BaseModel):
    tarih: Optional[date] = None
    baslangic_tarihi: Optional[date] = None
    bitis_tarihi: Optional[date] = None

    icd_kodu: Optional[str] = None
    tani: Optional[str] = None

    karar: Optional[str] = None  # "calisir", "kontrol"
    kontrol_tarihi: Optional[date] = None


class IstirahatRaporuCreate(IstirahatRaporuBase):
    hasta_id: UUID


class IstirahatRaporuUpdate(IstirahatRaporuBase):
    pass


class IstirahatRaporuResponse(IstirahatRaporuBase):
    id: UUID
    hasta_id: UUID
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# Konsültasyon Raporu Schemas
class KonsultasyonRaporuBase(BaseModel):
    tarih: Optional[date] = None
    hitap_klinisyen: Optional[str] = None
    ozgecmis: Optional[str] = None
    tani: Optional[str] = None
    ilaclar: Optional[str] = None
    sikayet: Optional[str] = None
    oyku: Optional[str] = None
    talep: Optional[str] = None
    konsultasyon_sorular: Optional[str] = None
    doktor: Optional[str] = None
    rapor_metni: Optional[str] = None


class KonsultasyonRaporuCreate(KonsultasyonRaporuBase):
    hasta_id: UUID


class KonsultasyonRaporuUpdate(KonsultasyonRaporuBase):
    pass


class KonsultasyonRaporuResponse(KonsultasyonRaporuBase):
    id: UUID
    hasta_id: UUID
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# Durum Bildirir Raporu Schemas
class DurumBildirirRaporuBase(BaseModel):
    tarih: Optional[date] = None
    tani_bulgular: Optional[str] = None
    icd_kodu: Optional[str] = None
    sonuc_kanaat: Optional[str] = None


class DurumBildirirRaporuCreate(DurumBildirirRaporuBase):
    hasta_id: UUID


class DurumBildirirRaporuUpdate(DurumBildirirRaporuBase):
    pass


class DurumBildirirRaporuResponse(DurumBildirirRaporuBase):
    id: UUID
    hasta_id: UUID
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# Tıbbi Müdahale Raporu Schemas
class TibbiMudahaleRaporuBase(BaseModel):
    tarih: Optional[datetime] = None
    islem_basligi: Optional[str] = None
    islem_detayi: Optional[str] = None
    sonuc_oneriler: Optional[str] = None


class TibbiMudahaleRaporuCreate(TibbiMudahaleRaporuBase):
    hasta_id: UUID


class TibbiMudahaleRaporuUpdate(TibbiMudahaleRaporuBase):
    pass


class TibbiMudahaleRaporuResponse(TibbiMudahaleRaporuBase):
    id: UUID
    hasta_id: UUID
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# Trus Biyopsi Schemas
class TrusBiyopsiBase(BaseModel):
    tarih: Optional[date] = None
    psa_total: Optional[str] = None
    rektal_tuse: Optional[str] = None
    mri_var: Optional[bool] = False
    mri_tarih: Optional[date] = None
    mri_ozet: Optional[str] = None
    pirads_lezyon_boyut: Optional[str] = None
    pirads_lezyon_lokasyon: Optional[str] = None
    lokasyonlar: Optional[str] = None  # JSON string
    prosedur_notu: Optional[str] = None


class TrusBiyopsiCreate(TrusBiyopsiBase):
    hasta_id: UUID


class TrusBiyopsiUpdate(TrusBiyopsiBase):
    pass


class TrusBiyopsiResponse(TrusBiyopsiBase):
    id: UUID
    hasta_id: UUID
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
