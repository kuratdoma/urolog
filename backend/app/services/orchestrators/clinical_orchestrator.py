from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.clinical.repository import ClinicalRepository
from app.repositories.patient.demographics_repository import DemographicsRepository
from app.core.user_context import UserContext


class ClinicalOrchestrator:
    """
    Orchestrates Clinical data across shards.
    Coordinates between Patient and Clinical shards.
    """

    def __init__(self, db: AsyncSession, context: Optional[UserContext] = None):
        self.clinical_repo = ClinicalRepository(db, context)
        self.patient_repo = DemographicsRepository(db, context)
        self.context = context

    async def get_patient_clinical_history(self, patient_id: UUID) -> dict:
        """
        Aggregates examinations, operations, notes, and tetkikler from the clinical shard.
        Also promotes tagged notes (e.g. MUAYENE:, GENEL LAB:) to respective categories.
        """
        # Ensure patient exists
        patient = await self.patient_repo.get_by_id(patient_id)
        if not patient:
            return {"error": "Patient not found"}

        exams = await self.clinical_repo.get_examinations_by_patient(patient_id)
        ops = await self.clinical_repo.get_operations_by_patient(patient_id)
        all_notes = await self.clinical_repo.get_notes_by_patient(patient_id)
        imagings = await self.clinical_repo.get_tetkikler_by_patient(
            patient_id, kategori="Goruntuleme"
        )
        labs = await self.clinical_repo.get_tetkikler_by_patient(
            patient_id, kategori="Laboratuvar"
        )

        # Promotion logic for legacy tagged notes
        final_notes = []
        for note in all_notes:
            content_upper = (note.icerik or "").upper()
            tip_upper = (note.tip or "").upper()

            # Match by Tip or Content Prefix
            if tip_upper == "MUAYENE" or content_upper.startswith("MUAYENE:"):
                exams.append(self._promote_note_to_exam(note))
            elif tip_upper == "GENEL LAB" or content_upper.startswith("GENEL LAB:"):
                labs.append(self._promote_note_to_lab(note))
            elif tip_upper == "GÖRÜNTÜLEME" or content_upper.startswith("GÖRÜNTÜLEME:"):
                imagings.append(self._promote_note_to_imaging(note))

            # Keep in notes regardless or only if not specifically promoted?
            # Users usually want to see them in "Takip" too.
            final_notes.append(note)

        from datetime import datetime

        def safe_sort_key(x):
            val = (
                getattr(x, "tarih", None)
                if not isinstance(x, dict)
                else x.get("tarih", None)
            )
            if val is None:
                return datetime.min
            # If it's already a datetime (or date), return it
            return val

        # Sort combined lists by date
        exams.sort(key=safe_sort_key, reverse=True)
        labs.sort(key=safe_sort_key, reverse=True)
        imagings.sort(key=safe_sort_key, reverse=True)

        return {
            "patient_id": str(patient_id),
            "patient_name": f"{patient.ad} {patient.soyad}",
            "examinations": exams,
            "operations": ops,
            "notes": final_notes,
            "imagings": imagings,
            "labs": labs,
        }

    async def get_patient_examinations_only(self, patient_id: UUID) -> list:
        """
        Optimized fetch for examinations only. Avoids fetching labs, imagings, and operations.
        Promotes MUAYENE notes to examinations using DB-level filtering.
        """
        exams = await self.clinical_repo.get_examinations_by_patient(patient_id)
        muayene_notes = await self.clinical_repo.get_muayene_notes_by_patient(patient_id)

        for note in muayene_notes:
            exams.append(self._promote_note_to_exam(note))

        from datetime import datetime
        def safe_sort_key(x):
            val = getattr(x, "tarih", None) if not isinstance(x, dict) else x.get("tarih", None)
            return val if val is not None else datetime.min

        exams.sort(key=safe_sort_key, reverse=True)
        return exams

    async def get_patient_operations_only(self, patient_id: UUID) -> list:
        """
        Optimized fetch for operations only. Avoids fetching unrelated data.
        """
        ops = await self.clinical_repo.get_operations_by_patient(patient_id)
        # Assuming no notes need to be promoted to operations currently
        
        from datetime import datetime
        def safe_sort_key(x):
            val = getattr(x, "tarih", None) if not isinstance(x, dict) else x.get("tarih", None)
            return val if val is not None else datetime.min

        ops.sort(key=safe_sort_key, reverse=True)
        return ops

    def _promote_note_to_exam(self, note):
        # Create a proxy dict or object that matches the expected frontend structure for Muayene
        # The frontend expects fields like 'sikayet', 'oyku', 'tani1', etc.
        return {
            "id": note.id,
            "hasta_id": str(note.hasta_id),
            "tarih": note.tarih if note.tarih else None,
            "sikayet": f"[PROMOTED NOTE] {note.tip or 'Muayene'}",
            "oyku": note.icerik,
            "is_promoted": True,
        }

    def _promote_note_to_lab(self, note):
        return {
            "id": note.id,
            "hasta_id": str(note.hasta_id),
            "tarih": note.tarih if note.tarih else None,
            "tetkik_adi": note.tip or "Laboratuvar Notu",
            "sonuc": note.icerik,
            "kategori": "Laboratuvar",
            "is_promoted": True,
        }

    def _promote_note_to_imaging(self, note):
        return {
            "id": note.id,
            "hasta_id": str(note.hasta_id),
            "tarih": note.tarih if note.tarih else None,
            "tetkik_adi": note.tip or "Görüntüleme Notu",
            "sonuc": note.icerik,
            "kategori": "Goruntuleme",
            "is_promoted": True,
        }

    async def create_examination_safely(self, exam_data: dict):
        """
        Transactional create after patient validation.
        """
        patient_id = exam_data.get("hasta_id")
        if not patient_id:
            raise ValueError("Patient ID is required")

        patient = await self.patient_repo.get_by_id(UUID(str(patient_id)))
        if not patient:
            raise ValueError("Referenced patient does not exist")

        result = await self.clinical_repo.create_examination(exam_data)
        return result

    async def update_examination_safely(self, exam_id: UUID, exam_data: dict):
        result = await self.clinical_repo.update_examination(exam_id, exam_data)
        return result

    async def create_operation_safely(self, op_data: dict):
        patient_id = op_data.get("hasta_id")
        if not patient_id:
            raise ValueError("Patient ID is required")
        patient = await self.patient_repo.get_by_id(UUID(str(patient_id)))
        if not patient:
            raise ValueError("Referenced patient does not exist")
        result = await self.clinical_repo.create_operation(op_data)
        return result

    async def update_operation_safely(self, op_id: UUID, op_data: dict):
        result = await self.clinical_repo.update_operation(op_id, op_data)
        return result

    async def delete_examination_safely(self, exam_id: UUID):
        """
        Transactional delete. Handles LipusDetails (Explicit Deletion),
        Muayene table, and promoted KlinikNot.
        """
        # 1. Explicit Deletion for LipusDetails (identified in Pre-mortem)
        await self.clinical_repo.delete_lipus_details(exam_id)

        # 2. Try deleting from Muayene table
        result = await self.clinical_repo.delete_examination(exam_id)

        # 3. Fallback: Check if it's a promoted note
        if not result:
            result = await self.clinical_repo.delete_note(exam_id)

        return result

    async def delete_operation_safely(self, op_id: UUID):
        result = await self.clinical_repo.delete_operation(op_id)
        return result

    async def delete_patient_history_transactional(self, patient_id: UUID):
        """
        2PC candidate: Mark patient and all clinical/finance data as deleted.
        """
        # This would be part of a larger distributed transaction
        return await self.clinical_repo.delete_patient_clinical_data(patient_id)
