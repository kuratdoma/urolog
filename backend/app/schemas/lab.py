from datetime import date
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


# Genel Lab
class GenelLabSonucBase(BaseModel):
    tarih: Optional[date] = None
    tetkik_adi: Optional[str] = None
    sonuc: Optional[str] = None
    birim: Optional[str] = None
    referans_araligi: Optional[str] = None
    bayrak: Optional[str] = None
    aciklama: Optional[str] = None
    kaynak: Optional[str] = None


class GenelLabSonucCreate(GenelLabSonucBase):
    hasta_id: UUID


class GenelLabSonucResponse(GenelLabSonucBase):
    id: int
    hasta_id: UUID

    model_config = ConfigDict(from_attributes=True)


# Sperm Analizi
class SpermAnaliziBase(BaseModel):
    tarih: Optional[date] = None
    perhiz: Optional[str] = None
    volum: Optional[str] = None
    likefaksiyon: Optional[str] = None
    viskozite: Optional[str] = None
    aglutinasyon: Optional[str] = None
    yuvarlak_hucre: Optional[str] = None
    sayi: Optional[str] = None
    motilite: Optional[str] = None
    p_motilite: Optional[str] = None
    tpmss: Optional[str] = None
    kruger: Optional[str] = None
    metod: Optional[str] = None

    # New Fields
    ph: Optional[str] = None
    total_sperm_sayisi: Optional[str] = None
    motilite_pr: Optional[str] = None
    motilite_np: Optional[str] = None
    motilite_im: Optional[str] = None
    motilite_4: Optional[str] = None
    motilite_3: Optional[str] = None
    motilite_2: Optional[str] = None
    motilite_1: Optional[str] = None
    morfoloji_bas: Optional[str] = None
    morfoloji_boyun: Optional[str] = None
    morfoloji_kuyruk: Optional[str] = None
    notlar: Optional[str] = None


class SpermAnaliziCreate(SpermAnaliziBase):
    hasta_id: UUID


class SpermAnaliziResponse(SpermAnaliziBase):
    id: int
    hasta_id: UUID

    model_config = ConfigDict(from_attributes=True)


# Urodinami
class UrodinamiBase(BaseModel):
    tarih: Optional[date] = None
    qmax: Optional[float] = None
    average_flow: Optional[float] = None
    voided_volume: Optional[float] = None
    residual_urine: Optional[float] = None
    sistometry: Optional[str] = None
    bac: Optional[str] = None


class UrodinamiCreate(UrodinamiBase):
    hasta_id: UUID


class UrodinamiResponse(UrodinamiBase):
    id: int
    hasta_id: UUID

    model_config = ConfigDict(from_attributes=True)


# Uroflowmetri (NEW)
class LabUroflowmetriBase(BaseModel):
    tarih: Optional[date] = None
    qmax: Optional[float] = None
    average_flow: Optional[float] = None
    volume: Optional[float] = None
    residual_urine: Optional[float] = None
    comment: Optional[str] = None
    pdf_url: Optional[str] = None


class LabUroflowmetriCreate(LabUroflowmetriBase):
    hasta_id: UUID


class LabUroflowmetriResponse(LabUroflowmetriBase):
    id: int
    hasta_id: UUID

    model_config = ConfigDict(from_attributes=True)


# Goruntuleme
class GoruntulemeSonucBase(BaseModel):
    tarih: Optional[date] = None
    tetkik_adi: Optional[str] = None
    sonuc: Optional[str] = None
    sembol: Optional[str] = None


class GoruntulemeSonucCreate(GoruntulemeSonucBase):
    hasta_id: UUID


class GoruntulemeSonucResponse(GoruntulemeSonucBase):
    id: int
    hasta_id: UUID

    model_config = ConfigDict(from_attributes=True)
