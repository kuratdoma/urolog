from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.orchestrators.clinical_orchestrator import ClinicalOrchestrator
from app.core.user_context import UserContext


class ClinicalLegacyAdapter:
    """
    Adapter to bridge Legacy Clinical API v1 to the Sharded Orchestrator.
    """

    def __init__(self, db: AsyncSession, context: Optional[UserContext] = None):
        self.orchestrator = ClinicalOrchestrator(db, context)

    async def get_patient_muayeneler(self, hasta_id: str):
        return await self.orchestrator.get_patient_examinations_only(UUID(hasta_id))

    async def get_patient_operasyonlar(self, hasta_id: str):
        return await self.orchestrator.get_patient_operations_only(UUID(hasta_id))

    async def create_muayene(self, muayene_in_dict: dict):
        return await self.orchestrator.create_examination_safely(muayene_in_dict)

    async def update_muayene(self, exam_id: UUID, muayene_in_dict: dict):
        return await self.orchestrator.update_examination_safely(
            exam_id, muayene_in_dict
        )

    async def create_operasyon(self, op_in_dict: dict):
        return await self.orchestrator.create_operation_safely(op_in_dict)

    async def update_operasyon(self, op_id: UUID, op_in_dict: dict):
        return await self.orchestrator.update_operation_safely(op_id, op_in_dict)

    async def delete_muayene(self, exam_id: UUID):
        # Transactional sharded delete only
        return await self.orchestrator.delete_examination_safely(exam_id)

    async def delete_operasyon(self, op_id: UUID):
        # Transactional sharded delete only
        return await self.orchestrator.delete_operation_safely(op_id)
