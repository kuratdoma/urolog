from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID


class PatientLegacyResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: UUID
    tc_kimlik: Optional[str] = None
    ad: Optional[str] = ""
    soyad: Optional[str] = ""
    cinsiyet: Optional[str] = None
    dogum_tarihi: Optional[date] = None
    dogum_yeri: Optional[str] = None
    kan_grubu: Optional[str] = None
    medeni_hal: Optional[str] = None
    meslek: Optional[str] = None
    adres: Optional[str] = None
    ev_tel: Optional[str] = None
    is_tel: Optional[str] = None
    cep_tel: Optional[str] = None
    email: Optional[str] = None
    kimlik_notlar: Optional[str] = None
    doktor: Optional[str] = None
    referans: Optional[str] = None
    postakodu: Optional[str] = None
    kurum: Optional[str] = None
    sigorta: Optional[str] = None
    ozelsigorta: Optional[str] = None
    cocuk_sayisi: Optional[str] = None
    sms_izin: Optional[str] = None
    email_izin: Optional[str] = None
    iletisim_kaynagi: Optional[str] = None
    iletisim_tercihi: Optional[str] = None
    indirim_grubu: Optional[str] = None
    dil: Optional[str] = "Türkçe"
    etiketler: Optional[str] = None
    kayit_notu: Optional[str] = None
    protokol_no: Optional[str] = None
    iletisim_kisi: Optional[List[dict]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Extended Legacy Fields
    tani1: Optional[str] = None  # Legacy mapped from son_tani
    son_tani: Optional[str] = None
    tani2: Optional[str] = None
    tani3: Optional[str] = None
    son_muayene_tarihi: Optional[date] = None
    son_islem_tarihi: Optional[datetime] = None
    son_islem_turu: Optional[str] = None
    telefon_gorusme_sayisi: int = 0

    # Batch counts
    muayene_count: int = 0
    imaging_count: int = 0
    operation_count: int = 0
    followup_count: int = 0
    document_count: int = 0
    photo_count: int = 0
