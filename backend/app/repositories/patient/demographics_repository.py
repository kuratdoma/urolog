from typing import List, Optional
from uuid import UUID
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.patient.models import Hasta
from app.schemas.patient.demographics import (
    PatientDemographicsCreate,
    PatientDemographicsUpdate,
)
from app.core.user_context import UserContext
from app.core.audit import audited


class DemographicsRepository:
    def __init__(self, session: AsyncSession, context: Optional[UserContext] = None):
        self.session = session
        self.context = context

    @audited(action="PATIENT_VIEW", resource_type="patient", id_arg_name="patient_id")
    async def get_by_id(self, patient_id: UUID) -> Optional[Hasta]:
        stmt = select(Hasta).where(
            and_(
                Hasta.id == patient_id,
                Hasta.is_deleted == False,
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        search: str = None,
        ad: str = None,
        soyad: str = None,
    ) -> List[Hasta]:
        stmt = select(Hasta).where(
            Hasta.is_deleted == False
        )

        if ad:
            stmt = stmt.where(Hasta.ad.ilike(f"%{ad}%"))
        if soyad:
            stmt = stmt.where(Hasta.soyad.ilike(f"%{soyad}%"))
        if search:
            stmt = stmt.where(
                or_(
                    Hasta.ad.ilike(f"%{search}%"),
                    Hasta.soyad.ilike(f"%{search}%"),
                    Hasta.tc_kimlik.ilike(f"%{search}%"),
                    Hasta.protokol_no.ilike(f"%{search}%"),
                )
            )

        stmt = (
            stmt.order_by(Hasta.updated_at.desc().nulls_last())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    @audited(action="PATIENT_CREATE", resource_type="patient")
    async def create(
        self, patient_in: PatientDemographicsCreate
    ) -> Hasta:
        # Protocol Generation Logic via ProtocolService
        from app.services.protocol_service import ProtocolService
        protocol_no = await ProtocolService.generate_protocol_number(self.session)

        data = patient_in.model_dump()
        # Filter fields that don't exist in the model (e.g. legacy tani fields)
        data = {k: v for k, v in data.items() if hasattr(Hasta, k)}

        # Fix: Schema converts these to "Evet"/"Hayır", but Sharded Model needs Boolean
        if isinstance(data.get("sms_izin"), str):
            data["sms_izin"] = data["sms_izin"] == "Evet"
        if isinstance(data.get("email_izin"), str):
            data["email_izin"] = data["email_izin"] == "Evet"

        data["protokol_no"] = protocol_no

        db_patient = Hasta(**data)
        if self.context:
            db_patient.created_by = self.context.user_id
        self.session.add(db_patient)
        await self.session.flush()
        # Ensure ID is generated/populated
        if not db_patient.id:
            await self.session.refresh(db_patient)

        return db_patient

    @audited(action="PATIENT_UPDATE", resource_type="patient", id_arg_name="patient_id")
    async def update(
        self, patient_id: UUID, patient_in: PatientDemographicsUpdate
    ) -> Optional[Hasta]:
        db_patient = await self.get_by_id(patient_id)
        if not db_patient:
            return None

        update_data = patient_in.model_dump(exclude_unset=True)

        # Fix: Schema converts these to "Evet"/"Hayır", but Sharded Model needs Boolean
        if "sms_izin" in update_data and isinstance(update_data["sms_izin"], str):
            update_data["sms_izin"] = update_data["sms_izin"] == "Evet"
        if "email_izin" in update_data and isinstance(update_data["email_izin"], str):
            update_data["email_izin"] = update_data["email_izin"] == "Evet"

        for field, value in update_data.items():
            if hasattr(db_patient, field):
                setattr(db_patient, field, value)

        if self.context:
            db_patient.updated_by = self.context.user_id

        await self.session.flush()
        return db_patient

    @audited(action="PATIENT_DELETE", resource_type="patient", id_arg_name="patient_id")
    async def soft_delete(self, patient_id: UUID) -> bool:
        db_patient = await self.get_by_id(patient_id)
        if not db_patient:
            return False

        db_patient.is_deleted = True
        if self.context:
            db_patient.updated_by = self.context.user_id

        await self.session.flush()
        return True

    async def get_unique_references(self) -> List[str]:
        stmt = (
            select(Hasta.referans)
            .distinct()
            .where(
                and_(
                    Hasta.referans.isnot(None),
                    Hasta.referans != "",
                    Hasta.is_deleted == False,
                )
            )
        )
        result = await self.session.execute(stmt)
        return [row[0] for row in result.all()]
