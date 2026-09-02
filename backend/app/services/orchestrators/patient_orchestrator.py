import traceback
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.patient.demographics_repository import DemographicsRepository
from app.repositories.patient.stats_repository import PatientStatsRepository
from app.repositories.patient.timeline_repository import PatientTimelineRepository
from app.repositories.clinical.repository import ClinicalRepository
from app.repositories.finance.income_repository import IncomeRepository
from app.schemas.patient.demographics import (
    PatientDemographicsCreate,
    PatientDemographicsUpdate,
    PatientFullProfile,
)
from app.schemas.clinical_schemas import MuayeneResponse
from app.core.user_context import UserContext


class PatientOrchestrator:
    def __init__(self, db: AsyncSession, context: Optional[UserContext] = None):
        self.db = db
        self.context = context
        self.demographics_repo = DemographicsRepository(db, context)
        self.stats_repo = PatientStatsRepository(db, context)
        self.timeline_repo = PatientTimelineRepository(db, context)
        self.clinical_repo = ClinicalRepository(db, context)
        self.income_repo = IncomeRepository(db, context)

    async def get_patient_full_profile(
        self, patient_id: UUID
    ) -> Optional[PatientFullProfile]:
        """
        Aggregates demographics, clinical stats, and return a legacy-compatible dict.
        Matches PatientResponse schema.
        """
        patient_task = self.demographics_repo.get_by_id(patient_id)
        clinical_task = self.clinical_repo.get_examinations_by_patient(patient_id)

        # Await sequentially to avoid asyncpg 'another operation is in progress' errors
        import logging
        logger = logging.getLogger(__name__)
        from fastapi import HTTPException

        try:
            patient = await patient_task
        except Exception as e:
            logger.error(f"Failed to fetch patient data for {patient_id}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Hasta profil verileri yüklenemedi")

        try:
            exams = await clinical_task
        except Exception as e:
            logger.error(f"Failed to fetch clinical data for patient {patient_id}: {e}", exc_info=True)
            # Clinical Data Resilience (AC #3): Return demographics with empty clinical history
            exams = []

        if not patient:
            raise HTTPException(status_code=404, detail="Hasta bulunamadı")

        # 3. Build aggregate DTO (Clean Domain Object)
        son_muayene = exams[0] if exams else None

        # We assume patient is already a Pydantic model or equivalent ORM object
        # Convert ORM to Pydantic first if needed, but assuming repository returns ORM or dict that fits
        # If 'patient' is ORM, from_attributes=True in Config handles it.

        # --- Audit Log (Story 2.2: KVKK Compliant) ---
        if self.context and self.context.user_id:
            from app.services.audit_service import AuditService

            try:
                await AuditService.log(
                    db=self.db,
                    action="PATIENT_VIEW",
                    user_id=self.context.user_id,
                    resource_type="patient",
                    resource_id=str(patient.id),
                    details={"access_type": "full_profile"},  # No PII here
                )
            except Exception:
                traceback.print_exc()

        profile = PatientFullProfile.model_validate(patient)
        if son_muayene:
            profile.son_muayene = MuayeneResponse.model_validate(
                son_muayene
            ).model_dump()

        return profile

    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        search: str = None,
        ad: str = None,
        soyad: str = None,
    ) -> List[PatientFullProfile]:
        """
        Returns a list of patients with demographics AND latest clinical summary AND record counts.
        Uses batch-fetching to avoid N+1 query problems.
        """
        # 1. Fetch patients
        patients_data = await self.demographics_repo.get_multi(
            skip=skip, limit=limit, search=search, ad=ad, soyad=soyad
        )
        if not patients_data:
            return []

        # 2. Batch-fetch latest examinations and counts in parallel
        patient_ids = [item[0].id for item in patients_data]

        exam_task = self.clinical_repo.get_latest_examinations_for_patients(patient_ids)
        stats_task = self.stats_repo.get_counts_batch(patient_ids)

        # Await sequentially to avoid asyncpg 'another operation is in progress' errors
        latest_exams = await exam_task
        stats_map = await stats_task

        # 3. Create lookup map for exams
        exam_map = {e.hasta_id: e for e in latest_exams}

        # 4. Attach summaries and validate to domain DTO
        results = []
        for p, son_islem_tarihi, son_islem_turu in patients_data:
            exam = exam_map.get(p.id)
            stats = stats_map.get(p.id, {})

            # Formatted diagnosis (AC #1): [ICD_KODU] Tanı Metni
            son_tani = None
            son_muayene_tarihi = None

            if exam:
                son_muayene_tarihi = exam.tarih

                if exam.tani1:
                    son_tani = exam.tani1
                elif exam.tani1_kodu:
                    son_tani = f"[{exam.tani1_kodu}]"

            # Manual population to avoid ORM attribute issues during validation
            profile = PatientFullProfile.model_validate(p)
            profile.son_tani = son_tani
            profile.son_muayene_tarihi = son_muayene_tarihi.date() if isinstance(son_muayene_tarihi, datetime) else son_muayene_tarihi
            profile.son_islem_tarihi = son_islem_tarihi
            profile.son_islem_turu = son_islem_turu

            # If updated_at is None, fallback to son_islem_tarihi or created_at
            if not profile.updated_at:
                profile.updated_at = son_islem_tarihi or profile.created_at

            # Attach Batch Counts
            for k, v in stats.items():
                setattr(profile, f"{k}_count", v)

            results.append(profile)

        return results

    async def create_patient(
        self, patient_in: PatientDemographicsCreate
    ) -> Optional[PatientFullProfile]:
        """
        Creates a patient in the sharded repository only.
        """
        # 1. Create in Sharded Table
        patient = await self.demographics_repo.create(patient_in)

        # 2. Synchronous Commit
        await self.db.commit()
        await self.db.refresh(patient)

        return await self.get_patient_full_profile(patient.id)

    async def update_patient(
        self, patient_id: UUID, patient_in: PatientDemographicsUpdate
    ) -> Optional[PatientFullProfile]:
        """
        Updates patient demographics in the sharded repository.
        """
        # 1. Update Sharded
        await self.demographics_repo.update(patient_id, patient_in)

        await self.db.commit()
        return await self.get_patient_full_profile(patient_id)

    async def delete_patient_transactional(self, patient_id: UUID) -> bool:
        """
        Perform a resilient atomic soft-delete across all shards.
        Guarantees that partial failure rolls back all changes.
        """
        from app.services.audit_service import AuditService

        purged_resources = []
        try:
            # 1. Delete clinical data
            await self.clinical_repo.delete_patient_clinical_data(patient_id)
            purged_resources.append("clinical")

            # 2. Delete finance data
            if hasattr(self.income_repo, "delete_patient_finance_data"):
                await self.income_repo.delete_patient_finance_data(patient_id)
                purged_resources.append("finance")
            else:
                print(
                    f"WARNING: delete_patient_finance_data not implemented in {self.income_repo.__class__.__name__}"
                )

            # 3. Delete core patient record
            await self.demographics_repo.soft_delete(patient_id)
            purged_resources.append("demographics")

            # 4. Audit Log (AC #4) - Inside transaction to ensure consistency
            if self.context and self.context.user_id:
                await AuditService.log(
                    db=self.db,
                    action="SYSTEM_DELETE_PATIENT",
                    user_id=self.context.user_id,
                    resource_type="patient",
                    resource_id=str(patient_id),
                    details={"status": "purged", "purged_resources": purged_resources},
                )

            # 5. Atomic Commit (2PC Simulation)
            await self.db.commit()
            return True
        except Exception as e:
            # AC #1: Explicit Rollback on ANY failure
            await self.db.rollback()
            print(
                f"[ORCHESTRATOR] Atomic delete failed for patient {patient_id}. Shard failure suspected. Error: {e}"
            )
            raise

    async def get_timeline(self, patient_id: UUID) -> List[dict]:
        """Get summarized patient activity timeline."""
        return await self.timeline_repo.get_timeline(patient_id)

    async def get_counts(self, patient_id: UUID) -> dict:
        """Get clinical record counts."""
        return await self.stats_repo.get_counts(patient_id)

    async def get_unique_references(self) -> List[str]:
        """Get unique referral sources."""
        return await self.demographics_repo.get_unique_references()
