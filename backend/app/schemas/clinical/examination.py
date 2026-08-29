from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import date, datetime
from typing import Optional


class ExaminationBase(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    hasta_id: UUID
    tarih: Optional[date] = None
    sikayet: Optional[str] = None
    oyku: Optional[str] = None
    tansiyon: Optional[str] = None
    ates: Optional[str] = None
    kvah: Optional[str] = None
    bobrek_sag: Optional[str] = None
    bobrek_sol: Optional[str] = None
    suprapubik_kitle: Optional[str] = None
    rektal_tuse: Optional[str] = None
    tani1: Optional[str] = None
    tani1_kodu: Optional[str] = None
    tedavi: Optional[str] = None
    sonuc: Optional[str] = None
    doktor: Optional[str] = None
    bulgu_notu: Optional[str] = None
    recete: Optional[str] = None
    ipss_skor: Optional[str] = None
    iief_ef_skor: Optional[str] = None
    fizik_muayene: Optional[str] = None


class ExaminationCreate(ExaminationBase):
    pass


class Examination(ExaminationBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
