from datetime import date, datetime
from typing import Optional, Any, Union, List
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class PatientBase(BaseModel):
    tc_kimlik: Optional[str] = None
    ad: str
    soyad: str
    cinsiyet: Optional[str] = None
    dogum_tarihi: Optional[date] = None
    dogum_yeri: Optional[str] = None
    kan_grubu: Optional[str] = None
    medeni_hal: Optional[str] = None
    meslek: Optional[str] = None

    # Contact
    adres: Optional[str] = None
    ev_tel: Optional[str] = None
    is_tel: Optional[str] = None
    cep_tel: Optional[str] = None
    email: Optional[str] = None

    kimlik_notlar: Optional[str] = None
    doktor: Optional[str] = None

    # New Fields
    referans: Optional[str] = None
    postakodu: Optional[str] = None
    kurum: Optional[str] = None
    sigorta: Optional[str] = None
    ozelsigorta: Optional[str] = None
    cocuk_sayisi: Optional[Any] = None

    # Visual based new fields
    sms_izin: Optional[Union[bool, str]] = True
    email_izin: Optional[Union[bool, str]] = True
    iletisim_kaynagi: Optional[str] = None
    iletisim_tercihi: Optional[str] = None
    arama_izni: Optional[str] = "Evet"
    iletisim_yakini_iliski: Optional[str] = None
    iletisim_yakini_tel: Optional[str] = None
    kayit_notu: Optional[str] = None
    iletisim_kisi: Optional[List[dict]] = None


class PatientCreate(PatientBase):
    pass


class PatientUpdate(PatientBase):
    ad: Optional[str] = None
    soyad: Optional[str] = None


class PatientResponse(PatientBase):
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    son_muayene_tarihi: Optional[date] = None  # Last examination date
    son_tani: Optional[str] = None  # Last diagnosis
    telefon_gorusme_sayisi: Optional[int] = 0
    protokol_no: Optional[str] = None
    has_private_notes: bool = False
    created_by: Optional[int] = None

    created_by: Optional[int] = None

    model_config = ConfigDict(from_attributes=True, extra="ignore")
