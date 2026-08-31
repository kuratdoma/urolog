from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID


class RandevuBase(BaseModel):
    hasta_id: Optional[UUID] = None
    title: str
    type: Optional[str] = None
    start: datetime
    end: datetime
    status: Optional[str] = "scheduled"
    notes: Optional[str] = None
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None


class RandevuCreate(RandevuBase):
    pass


class RandevuUpdate(BaseModel):
    hasta_id: Optional[UUID] = None
    title: Optional[str] = None
    type: Optional[str] = None
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    is_deleted: Optional[int] = None
    cancel_reason: Optional[str] = None
    delete_reason: Optional[str] = None


class HastaBasic(BaseModel):
    id: UUID
    ad: str
    soyad: str
    tc_kimlik: Optional[str] = None
    cep_tel: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ClinicalBriefSchema(BaseModel):
    """Compact clinical snapshot for agenda cards — last exam + last note."""
    # Son Muayene
    son_muayene_tarih: Optional[datetime] = None
    son_muayene_sikayet: Optional[str] = None
    son_muayene_tani: Optional[str] = None       # tani_kesin veya tani1
    son_muayene_sonuc: Optional[str] = None       # sonuc veya oneriler
    son_muayene_tedavi: Optional[str] = None

    # Son Takip Notu
    son_not_tarih: Optional[datetime] = None
    son_not_icerik: Optional[str] = None
    son_not_tip: Optional[str] = None

    # Yeni Hasta / İlk Kayıt Durumu
    is_new_patient: Optional[bool] = False
    hasta_notu: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RandevuResponse(RandevuBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_name: Optional[str] = None
    updated_by_name: Optional[str] = None
    is_deleted: Optional[int] = 0
    cancel_reason: Optional[str] = None
    delete_reason: Optional[str] = None
    hasta: Optional[HastaBasic] = None
    payment_status: Optional[str] = None # 'paid', 'unpaid', 'partial'
    has_lab_results: Optional[bool] = False
    clinical_brief: Optional[ClinicalBriefSchema] = None

    model_config = ConfigDict(from_attributes=True)
