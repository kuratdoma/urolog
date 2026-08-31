from typing import List, Optional, Tuple, Any
from uuid import UUID
from sqlalchemy import select, and_, or_, text
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
    ) -> List[Tuple[Hasta, Optional[Any], Optional[str]]]:
        where_clauses = ["h.is_deleted = false"]
        params = {"skip": skip, "limit": limit}

        if ad:
            where_clauses.append("h.ad ILIKE :ad")
            params["ad"] = f"%{ad}%"
        if soyad:
            where_clauses.append("h.soyad ILIKE :soyad")
            params["soyad"] = f"%{soyad}%"
        if search:
            where_clauses.append(
                "(h.ad ILIKE :search OR h.soyad ILIKE :search OR h.tc_kimlik ILIKE :search OR h.protokol_no ILIKE :search)"
            )
            params["search"] = f"%{search}%"

        where_sql = " AND ".join(where_clauses)
        sql = f"""
        WITH latest_activities AS (
            SELECT h.id,
                   GREATEST(
                       h.created_at,
                       COALESCE((SELECT MAX(COALESCE(tarih, created_at)) FROM muayeneler WHERE hasta_id = h.id AND is_deleted = false AND tarih <= NOW() + interval '1 day'), '1970-01-01'::timestamptz),
                       COALESCE((SELECT MAX(COALESCE(tarih, created_at)) FROM operasyonlar WHERE hasta_id = h.id AND is_deleted = false AND tarih <= NOW() + interval '1 day'), '1970-01-01'::timestamptz),
                       COALESCE((SELECT MAX(COALESCE(tarih, created_at)) FROM notlar WHERE hasta_id = h.id AND is_deleted = false AND tarih <= NOW() + interval '1 day'), '1970-01-01'::timestamptz),
                       COALESCE((SELECT MAX(COALESCE(tarih, created_at)) FROM tetkikler WHERE hasta_id = h.id AND is_deleted = false AND tarih <= NOW() + interval '1 day'), '1970-01-01'::timestamptz)
                   ) as son_islem_tarihi
            FROM hastalar h
            WHERE {where_sql}
        ),
        ranked_patients AS (
            SELECT la.id, la.son_islem_tarihi
            FROM latest_activities la
            ORDER BY la.son_islem_tarihi DESC
            OFFSET :skip LIMIT :limit
        )
        SELECT 
            h.id,
            rp.son_islem_tarihi,
            CASE
                WHEN rp.son_islem_tarihi = (SELECT MAX(COALESCE(tarih, created_at)) FROM muayeneler WHERE hasta_id = h.id AND is_deleted = false AND tarih <= NOW() + interval '1 day') THEN 'Muayene'
                WHEN rp.son_islem_tarihi = (SELECT MAX(COALESCE(tarih, created_at)) FROM operasyonlar WHERE hasta_id = h.id AND is_deleted = false AND tarih <= NOW() + interval '1 day') THEN 'Operasyon'
                WHEN rp.son_islem_tarihi = (SELECT MAX(COALESCE(tarih, created_at)) FROM notlar WHERE hasta_id = h.id AND is_deleted = false AND tarih <= NOW() + interval '1 day') THEN 'Takip Notu'
                WHEN rp.son_islem_tarihi = (SELECT MAX(COALESCE(tarih, created_at)) FROM tetkikler WHERE hasta_id = h.id AND is_deleted = false AND tarih <= NOW() + interval '1 day') THEN 'Tetkik'
                ELSE 'Yeni Kayıt'
            END as son_islem_turu
        FROM ranked_patients rp
        JOIN hastalar h ON h.id = rp.id
        ORDER BY rp.son_islem_tarihi DESC;
        """
        result = await self.session.execute(text(sql), params)
        rows = result.fetchall()
        if not rows:
            return []

        patient_ids = [r[0] for r in rows]
        orm_stmt = select(Hasta).where(Hasta.id.in_(patient_ids))
        orm_result = await self.session.execute(orm_stmt)
        p_map = {p.id: p for p in orm_result.scalars().all()}

        final_list = []
        for pid, tarih, tur in rows:
            if pid in p_map:
                final_list.append((p_map[pid], tarih, tur))

        return final_list

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
