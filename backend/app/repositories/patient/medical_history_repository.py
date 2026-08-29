from typing import Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.medical_history import Anamnez
from app.core.user_context import UserContext


class MedicalHistoryRepository:
    def __init__(self, session: AsyncSession, context: Optional[UserContext] = None):
        self.session = session
        self.context = context

    async def get_by_patient_id(self, patient_id: UUID) -> Optional[Anamnez]:
        stmt = select(Anamnez).where(Anamnez.hasta_id == patient_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
