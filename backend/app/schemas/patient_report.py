"""
Patient Report DTO Schema

Aggregated report combining data from Patient, Clinical, and Finance shards.
Designed for graceful degradation - each section is optional with warnings.
"""

from datetime import date, datetime
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class PatientDemographics(BaseModel):
    """Core patient identity and contact information."""

    id: UUID
    tc_kimlik: Optional[str] = None
    ad: str
    soyad: str
    cinsiyet: Optional[str] = None
    dogum_tarihi: Optional[date] = None
    dogum_yeri: Optional[str] = None
    kan_grubu: Optional[str] = None
    medeni_hal: Optional[str] = None
    meslek: Optional[str] = None
    cocuk_sayisi: Optional[str] = None

    # Contact
    cep_tel: Optional[str] = None
    ev_tel: Optional[str] = None
    is_tel: Optional[str] = None
    email: Optional[str] = None
    adres: Optional[str] = None
    ilce: Optional[str] = None
    sehir: Optional[str] = None
    postakodu: Optional[str] = None

    # Institution
    kurum: Optional[str] = None
    sigorta: Optional[str] = None
    ozelsigorta: Optional[str] = None
    protokol_no: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ExaminationSummary(BaseModel):
    """Summary of a clinical examination."""

    id: Any
    tarih: date
    doktor: Optional[str] = None
    sikayet: Optional[str] = None
    on_tani: Optional[str] = None
    kesin_tani: Optional[str] = None
    ipss_skor: Optional[int] = None
    iief_skor: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class LabResultSummary(BaseModel):
    """Summary of a lab result."""

    id: Any
    tarih: date
    test_adi: Optional[str] = None
    sonuc: Optional[str] = None
    referans_aralik: Optional[str] = None
    birim: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FinanceSummary(BaseModel):
    """Financial summary for the patient."""

    total_income: float = 0.0
    total_expense: float = 0.0
    balance: float = 0.0
    last_payment_date: Optional[date] = None
    pending_services: List[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class PatientReportDTO(BaseModel):
    """
    Aggregated patient report combining data from multiple shards.

    Each section is optional to support graceful degradation.
    The 'warnings' field indicates which data could not be fetched.
    """

    # Patient Shard
    demographics: Optional[PatientDemographics] = None

    # Clinical Shard
    examinations: List[ExaminationSummary] = Field(default_factory=list)
    lab_results: List[LabResultSummary] = Field(default_factory=list)

    # Finance Shard
    finance_summary: Optional[FinanceSummary] = None

    # Metadata
    warnings: List[str] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.now)

    @property
    def has_warnings(self) -> bool:
        return len(self.warnings) > 0

    @property
    def is_complete(self) -> bool:
        return self.demographics is not None and self.finance_summary is not None
