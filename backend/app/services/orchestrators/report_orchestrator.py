"""
Report Orchestrator Service

Aggregates patient data from multiple shards for PDF report generation.
Implements graceful degradation - continues with partial data if a shard fails.
"""

import asyncio
import logging
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.patient.demographics_repository import DemographicsRepository
from app.repositories.clinical.repository import ClinicalRepository
from app.repositories.finance.income_repository import IncomeRepository
from app.core.user_context import UserContext
from app.schemas.patient_report import (
    PatientReportDTO,
    PatientDemographics,
    ExaminationSummary,
    LabResultSummary,
    FinanceSummary,
)

logger = logging.getLogger(__name__)


class ReportOrchestrator:
    """
    Orchestrates data aggregation from Patient, Clinical, and Finance shards.

    Uses asyncio.gather with return_exceptions=True for fault-tolerant parallel fetches.
    If a shard fails, partial data is returned with a warning.
    """

    def __init__(self, db: AsyncSession, context: Optional[UserContext] = None):
        self.db = db
        self.patient_repo = DemographicsRepository(db, context)
        self.clinical_repo = ClinicalRepository(db, context)
        self.income_repo = IncomeRepository(db, context)

    async def get_patient_report(self, patient_id: UUID) -> PatientReportDTO:
        """
        Fetch aggregated patient report from all shards.

        Returns partial data if any shard fails, with warnings indicating which data
        could not be retrieved.
        """
        warnings: List[str] = []

        # Sequential fetch from all shards with exception handling
        results = []
        for task in [
            self._fetch_demographics(patient_id),
            self._fetch_examinations(patient_id),
            self._fetch_lab_results(patient_id),
            self._fetch_finance_summary(patient_id)
        ]:
            try:
                res = await task
                results.append(res)
            except Exception as e:
                results.append(e)

        # Process demographics
        demographics = None
        if isinstance(results[0], Exception):
            logger.error(
                f"Failed to fetch demographics for patient {patient_id}: {results[0]}"
            )
            warnings.append("Hasta demografik bilgileri alınamadı")
        else:
            demographics = results[0]

        # Process examinations
        examinations: List[ExaminationSummary] = []
        if isinstance(results[1], Exception):
            logger.error(
                f"Failed to fetch examinations for patient {patient_id}: {results[1]}"
            )
            warnings.append("Muayene geçmişi alınamadı")
        else:
            examinations = results[1] or []

        # Process lab results
        lab_results: List[LabResultSummary] = []
        if isinstance(results[2], Exception):
            logger.error(
                f"Failed to fetch lab results for patient {patient_id}: {results[2]}"
            )
            warnings.append("Laboratuvar sonuçları alınamadı")
        else:
            lab_results = results[2] or []

        # Process finance summary
        finance_summary = None
        if isinstance(results[3], Exception):
            logger.error(
                f"Failed to fetch finance for patient {patient_id}: {results[3]}"
            )
            warnings.append("Finansal bilgiler alınamadı")
        else:
            finance_summary = results[3]

        return PatientReportDTO(
            demographics=demographics,
            examinations=examinations,
            lab_results=lab_results,
            finance_summary=finance_summary,
            warnings=warnings,
            generated_at=datetime.now(),
        )

    async def _fetch_demographics(
        self, patient_id: UUID
    ) -> Optional[PatientDemographics]:
        """Fetch patient demographics from Patient shard."""
        patient = await self.patient_repo.get_by_id(patient_id)
        if not patient:
            return None

        return PatientDemographics(
            id=patient.id,
            tc_kimlik=patient.tc_kimlik,
            ad=patient.ad,
            soyad=patient.soyad,
            cinsiyet=patient.cinsiyet,
            dogum_tarihi=patient.dogum_tarihi,
            dogum_yeri=patient.dogum_yeri,
            kan_grubu=patient.kan_grubu,
            medeni_hal=patient.medeni_hal,
            meslek=patient.meslek,
            cocuk_sayisi=patient.cocuk_sayisi,
            # Contact
            cep_tel=patient.cep_tel,
            ev_tel=patient.ev_tel,
            is_tel=patient.is_tel,
            email=patient.email,
            adres=patient.adres,
            ilce=getattr(patient, "ilce", None),
            sehir=getattr(patient, "sehir", None),
            postakodu=getattr(patient, "postakodu", None),
            # Institution
            kurum=getattr(patient, "kurum", None),
            sigorta=getattr(patient, "sigorta", None),
            ozelsigorta=getattr(patient, "ozelsigorta", None),
            protokol_no=getattr(patient, "protokol_no", None),
        )

    async def _fetch_examinations(self, patient_id: UUID) -> List[ExaminationSummary]:
        """Fetch examination history from Clinical shard."""
        exams = await self.clinical_repo.get_examinations_by_patient(patient_id)

        return [
            ExaminationSummary(
                id=e.id,
                tarih=e.tarih,
                doktor=e.doktor,
                sikayet=e.sikayet,
                on_tani=getattr(e, "tani1", None),
                kesin_tani=getattr(e, "tani_kesin", getattr(e, "tani1", None)),
                ipss_skor=self._calculate_ipss(e),
                iief_skor=self._calculate_iief(e),
            )
            for e in exams
        ]

    async def _fetch_lab_results(self, patient_id: UUID) -> List[LabResultSummary]:
        """Fetch lab results from Clinical shard."""
        # Check if method exists
        if not hasattr(self.clinical_repo, "get_lab_results_by_patient"):
            return []

        labs = await self.clinical_repo.get_lab_results_by_patient(patient_id)

        return [
            LabResultSummary(
                id=lab.id,
                tarih=lab.tarih,
                test_adi=lab.test_name if hasattr(lab, "test_name") else None,
                sonuc=lab.value if hasattr(lab, "value") else None,
                referans_aralik=(
                    lab.reference_range if hasattr(lab, "reference_range") else None
                ),
                birim=lab.unit if hasattr(lab, "unit") else None,
            )
            for lab in labs
        ]

    async def _fetch_finance_summary(
        self, patient_id: UUID
    ) -> Optional[FinanceSummary]:
        """Fetch finance summary from Finance shard."""
        try:
            # We use income_repo to fetch transactions.
            # Note: get_patient_transactions handles income/expense aggregating in the new shard if needed.
            txs = await self.income_repo.get_patient_transactions(patient_id)

            total_income = sum(
                float(tx.net_tutar or 0) for tx in txs if tx.islem_tipi == "gelir"
            )
            total_expense = sum(
                float(tx.net_tutar or 0) for tx in txs if tx.islem_tipi == "gider"
            )

            last_payment = next((tx for tx in txs if tx.islem_tipi == "gelir"), None)

            return FinanceSummary(
                total_income=total_income,
                total_expense=total_expense,
                balance=total_income - total_expense,
                last_payment_date=last_payment.tarih if last_payment else None,
                pending_services=[],
            )
        except Exception as e:
            logger.warning(f"Finance fetch failed: {e}")
            raise

    def _calculate_ipss(self, exam: Any) -> Optional[int]:
        """Calculate IPSS score from examination fields."""
        try:
            fields = [
                "pollakiuri",
                "urgency",
                "nokturi",
                "residiv_hissi",
                "kesik_idrar_yapma",
                "projeksiyon_azalma",
                "idrar_bas_zorluk",
            ]
            total = 0
            for f in fields:
                val = getattr(exam, f, None)
                if val:
                    total += int(val)
            return total if total > 0 else None
        except (ValueError, TypeError):
            return None

    def _calculate_iief(self, exam: Any) -> Optional[int]:
        """Calculate IIEF-EF score from examination fields."""
        try:
            fields = ["iief_q1", "iief_q2", "iief_q3", "iief_q4", "iief_q5", "iief_q6"]
            total = 0
            for f in fields:
                val = getattr(exam, f, None)
                if val:
                    total += int(val)
            return total if total > 0 else None
        except (ValueError, TypeError):
            return None


# Singleton factory function
def get_report_orchestrator(
    db: AsyncSession, context: Optional[UserContext] = None
) -> ReportOrchestrator:
    return ReportOrchestrator(db, context)
