from pydantic import BaseModel, ConfigDict, field_validator
from uuid import UUID
from datetime import date, datetime
from typing import Optional, Any, Union, List


class PatientDemographicsBase(BaseModel):
    model_config = ConfigDict(extra="ignore")

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
    cep_tel: Optional[str] = None
    tani1: Optional[str] = None  # Legacy mapped from son_tani
    son_tani: Optional[str] = None
    tani2: Optional[str] = None
    tani3: Optional[str] = None
    email: Optional[str] = None
    kimlik_notlar: Optional[str] = None
    doktor: Optional[str] = None
    referans: Optional[str] = None
    postakodu: Optional[str] = None
    kurum: Optional[str] = None
    sigorta: Optional[str] = None
    ozelsigorta: Optional[str] = None
    cocuk_sayisi: Optional[Any] = None
    faks: Optional[str] = None
    sms_izin: Optional[Union[bool, str]] = True
    email_izin: Optional[Union[bool, str]] = True
    iletisim_kaynagi: Optional[str] = None
    iletisim_tercihi: Optional[str] = None
    indirim_grubu: Optional[str] = None
    dil: Optional[str] = "Türkçe"
    personel_ids: Optional[str] = None
    created_by: Optional[int] = None
    etiketler: Optional[str] = None
    kayit_notu: Optional[str] = None
    protokol_no: Optional[str] = None
    iletisim_kisi: Optional[List[dict]] = None

    @field_validator("sms_izin", "email_izin", mode="before")
    @classmethod
    def validate_permissions(cls, v: Any) -> str:
        if v is True or v == "True":
            return "Evet"
        if v is False or v == "False":
            return "Hayır"
        if v is None:
            return "Evet"
        return str(v)

    @field_validator("cocuk_sayisi", mode="before")
    @classmethod
    def validate_cocuk(cls, v: Any) -> Optional[int]:
        if v == "" or v is None:
            return None
        try:
            return int(v)
        except:
            return None


class PatientDemographicsCreate(PatientDemographicsBase):
    pass


class PatientDemographicsUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    tc_kimlik: Optional[str] = None
    ad: Optional[str] = None
    soyad: Optional[str] = None
    cinsiyet: Optional[str] = None
    dogum_tarihi: Optional[date] = None
    dogum_yeri: Optional[str] = None
    kan_grubu: Optional[str] = None
    medeni_hal: Optional[str] = None
    meslek: Optional[str] = None
    adres: Optional[str] = None
    ev_tel: Optional[str] = None
    cep_tel: Optional[str] = None
    email: Optional[str] = None
    kimlik_notlar: Optional[str] = None
    doktor: Optional[str] = None
    referans: Optional[str] = None
    postakodu: Optional[str] = None
    kurum: Optional[str] = None
    sigorta: Optional[str] = None
    ozelsigorta: Optional[str] = None
    cocuk_sayisi: Optional[Any] = None
    faks: Optional[str] = None
    sms_izin: Optional[Union[bool, str]] = None
    email_izin: Optional[Union[bool, str]] = None
    iletisim_kaynagi: Optional[str] = None
    iletisim_tercihi: Optional[str] = None
    indirim_grubu: Optional[str] = None
    dil: Optional[str] = None
    personel_ids: Optional[str] = None
    etiketler: Optional[str] = None
    kayit_notu: Optional[str] = None
    protokol_no: Optional[str] = None
    iletisim_kisi: Optional[List[dict]] = None


class PatientDemographics(PatientDemographicsBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PatientFullProfile(PatientDemographics):
    """
    Clean Domain Entity aggregating demographics and latest clinical status.
    Decoupled from legacy JSON keys.
    """

    son_muayene: Optional[dict] = None
    son_tani: Optional[str] = None
    son_muayene_tarihi: Optional[date] = None

    # Aggregate Counts
    muayene_count: int = 0
    imaging_count: int = 0
    operation_count: int = 0
    followup_count: int = 0
    document_count: int = 0
    photo_count: int = 0
