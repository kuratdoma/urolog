from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.orchestrators.patient_orchestrator import PatientOrchestrator
from app.core.user_context import UserContext
from app.schemas.patient.legacy import PatientLegacyResponse
from app.schemas.patient.demographics import (
    PatientDemographicsCreate,
    PatientDemographicsUpdate,
    PatientFullProfile,
)


class PatientController:
    """
    Legacy Adapter Controller for Patient Operations.
    Ensures strict adherence to Legacy V1 API contracts.
    """

    def __init__(self, db: AsyncSession, context: Optional[UserContext] = None):
        self.orchestrator = PatientOrchestrator(db, context)

    def _map_to_legacy(self, profile: PatientFullProfile) -> PatientLegacyResponse:
        """
        Maps Clean Domain Object -> Legacy "Messy" response.
        """
        # Get all fields expected by the legacy schema
        legacy_fields = PatientLegacyResponse.model_fields.keys()

        # Dump domain profile and filter for legacy fields
        profile_data = profile.model_dump()
        data = {k: v for k, v in profile_data.items() if k in legacy_fields}

        # 1. Map Clinical Aggregates
        # Prioritize fields already attached to the profile (e.g. from get_multi batch fetch)
        # Fall back to son_muayene dict if available
        if profile.son_tani:
            data["son_tani"] = profile.son_tani
            data["tani1"] = profile.son_tani  # Legacy support
            data["son_muayene_tarihi"] = profile.son_muayene_tarihi
        elif profile.son_muayene:
            son = profile.son_muayene
            tani = (
                getattr(son, "tani1", None)
                if not isinstance(son, dict)
                else son.get("tani1")
            )
            data["son_tani"] = tani
            data["tani1"] = tani
            data["son_muayene_tarihi"] = (
                getattr(son, "tarih", None)
                if not isinstance(son, dict)
                else son.get("tarih")
            )
        else:
            data["son_tani"] = None
            data["tani1"] = None
            data["son_muayene_tarihi"] = None

        # 2. Map Booleans to Legacy "Evet"/"Hayır" Strings
        # This ensures the frontend dropdowns ('Evet'/'Hayır') match correctly
        if "sms_izin" in data:
            data["sms_izin"] = (
                "Evet"
                if data["sms_izin"] is True
                else "Hayır" if data["sms_izin"] is False else data["sms_izin"]
            )
        if "email_izin" in data:
            data["email_izin"] = (
                "Evet"
                if data["email_izin"] is True
                else "Hayır" if data["email_izin"] is False else data["email_izin"]
            )

        # 3. Ensure cocuk_sayisi is string for legacy compatibility if it comes as int
        if "cocuk_sayisi" in data and data["cocuk_sayisi"] is not None:
            data["cocuk_sayisi"] = str(data["cocuk_sayisi"])

        # 4. Batch Counters (Mapped from FullProfile aggregates)
        count_fields = [
            "muayene_count",
            "imaging_count",
            "operation_count",
            "followup_count",
            "document_count",
            "photo_count",
        ]
        for field in count_fields:
            if hasattr(profile, field):
                data[field] = getattr(profile, field)

        return PatientLegacyResponse(**data)

    async def get_patient_profile(
        self, patient_id: UUID
    ) -> Optional[PatientLegacyResponse]:
        """
        Retrieves full patient profile and adapts it to legacy response format.
        """
        profile = await self.orchestrator.get_patient_full_profile(patient_id)
        if not profile:
            return None
        return self._map_to_legacy(profile)

    async def get_patients(
        self,
        skip: int = 0,
        limit: int = 100,
        search: str = None,
        ad: str = None,
        soyad: str = None,
    ) -> List[PatientLegacyResponse]:
        """
        Retrieve list of patients mapped to legacy expectations with strict validation.
        """
        patients = await self.orchestrator.get_multi(skip, limit, search, ad, soyad)
        results = []
        for p in patients:
            # Create a full profile skeleton for mapping
            profile = PatientFullProfile.model_validate(p)
            results.append(self._map_to_legacy(profile))
        return results

    async def create_patient(
        self, patient_in: PatientDemographicsCreate
    ) -> PatientLegacyResponse:
        """
        Creates patient and returns legacy response.
        """
        profile = await self.orchestrator.create_patient(patient_in)
        return self._map_to_legacy(profile)

    async def update_patient(
        self, patient_id: UUID, patient_in: PatientDemographicsUpdate
    ) -> Optional[PatientLegacyResponse]:
        """
        Updates patient and returns legacy response.
        """
        profile = await self.orchestrator.update_patient(patient_id, patient_in)
        if not profile:
            return None
        return self._map_to_legacy(profile)

    async def delete_patient(self, patient_id: UUID) -> bool:
        """
        Delete patient across all shards.
        """
        return await self.orchestrator.delete_patient_transactional(patient_id)

    async def get_timeline(self, patient_id: UUID) -> List[dict]:
        """Get summarized patient activity timeline."""
        return await self.orchestrator.get_timeline(patient_id)

    async def get_counts(self, patient_id: UUID) -> dict:
        """Get clinical record counts."""
        return await self.orchestrator.get_counts(patient_id)

    async def get_unique_references(self) -> List[str]:
        """Get unique referral sources."""
        return await self.orchestrator.get_unique_references()
