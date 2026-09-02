from typing import List, Optional, Any
from uuid import UUID
from datetime import datetime
from sqlalchemy import select, and_, update, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.user_context import UserContext
from app.core.audit import audited
from app.repositories.base_repository import BaseRepository
from app.repositories.clinical.models import (
    Muayene,
    Operasyon,
    KlinikNot,
    TetkikSonuc,
    FotografArsivi,
    IstirahatRaporu,
    KonsultasyonRaporu,
    DurumBildirirRaporu,
    TibbiMudahaleRaporu,
    TrusBiyopsi,
    TelefonGorusmesi,
    KisiselNot,
    LipusDetails,
)
from app.repositories.patient.models import Hasta

# All clinical entity model classes — used for bulk operations
ALL_CLINICAL_MODELS = [
    Muayene, Operasyon, KlinikNot, TetkikSonuc, FotografArsivi,
    IstirahatRaporu, KonsultasyonRaporu, DurumBildirirRaporu,
    TibbiMudahaleRaporu, TrusBiyopsi, TelefonGorusmesi,
    KisiselNot, LipusDetails,
]


class ClinicalRepository:
    """
    Facade over entity-specific BaseRepository instances.

    Public API is preserved for backward compatibility with endpoints.
    Internally, each entity delegates to BaseRepository for standard CRUD.
    Only entity-specific logic (search, combined queries) lives here.
    """

    def __init__(self, session: AsyncSession, context: Optional[UserContext] = None):
        self.session = session
        self.context = context
        # Sub-repositories for standard CRUD
        self._muayene = BaseRepository(Muayene, session, context)
        self._operasyon = BaseRepository(Operasyon, session, context)
        self._not = BaseRepository(KlinikNot, session, context)
        self._tetkik = BaseRepository(TetkikSonuc, session, context)
        self._foto = BaseRepository(FotografArsivi, session, context)
        self._istirahat = BaseRepository(IstirahatRaporu, session, context)
        self._konsultasyon = BaseRepository(KonsultasyonRaporu, session, context)
        self._durum = BaseRepository(DurumBildirirRaporu, session, context)
        self._tibbi = BaseRepository(TibbiMudahaleRaporu, session, context)
        self._trus = BaseRepository(TrusBiyopsi, session, context)
        self._telefon = BaseRepository(TelefonGorusmesi, session, context)
        self._kisisel = BaseRepository(KisiselNot, session, context)
        self._lipus = BaseRepository(LipusDetails, session, context)

    # ─── Examinations ────────────────────────────────────────────────────

    async def get_examination(self, exam_id: UUID) -> Optional[Muayene]:
        return await self._muayene.get_by_id(exam_id)

    @audited(action="CLINICAL_VIEW", resource_type="patient", id_arg_name="patient_id")
    async def get_examinations_by_patient(self, patient_id: UUID) -> List[Muayene]:
        return await self._muayene.get_by_patient(patient_id)

    @audited(action="CLINICAL_CREATE", resource_type="patient")
    async def create_examination(self, exam_in: dict) -> Muayene:
        return await self._muayene.create(exam_in)

    @audited(action="CLINICAL_UPDATE", resource_type="patient", id_arg_name="exam_id")
    async def update_examination(self, exam_id: UUID, exam_in: dict) -> Optional[Muayene]:
        return await self._muayene.update(exam_id, exam_in)

    async def delete_examination(self, exam_id: UUID) -> bool:
        return await self._muayene.soft_delete(exam_id)

    async def get_all_muayeneler(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Muayene]:
        query = select(Muayene).where(Muayene.is_deleted == False)
        if start_date:
            query = query.where(Muayene.tarih >= start_date)
        if end_date:
            query = query.where(Muayene.tarih <= end_date)
        if search:
            query = query.where(
                or_(
                    Muayene.sikayet.ilike(f"%{search}%"),
                    Muayene.oyku.ilike(f"%{search}%"),
                    Muayene.tani1.ilike(f"%{search}%"),
                )
            )
        result = await self.session.execute(query)
        return result.scalars().all()

    async def get_latest_examinations_for_patients(
        self, patient_ids: List[UUID]
    ) -> List[Muayene]:
        if not patient_ids:
            return []
        stmt = (
            select(Muayene)
            .where(and_(Muayene.hasta_id.in_(patient_ids), Muayene.is_deleted == False))
            .distinct(Muayene.hasta_id)
            .order_by(Muayene.hasta_id, Muayene.tarih.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    # ─── Operations ──────────────────────────────────────────────────────

    async def get_operation(self, op_id: UUID) -> Optional[Operasyon]:
        return await self._operasyon.get_by_id(op_id)

    async def get_operations_by_patient(self, patient_id: UUID) -> List[Operasyon]:
        return await self._operasyon.get_by_patient(patient_id)

    async def create_operation(self, op_in: dict) -> Operasyon:
        return await self._operasyon.create(op_in)

    async def update_operation(self, op_id: UUID, op_in: dict) -> Optional[Operasyon]:
        return await self._operasyon.update(op_id, op_in)

    async def delete_operation(self, op_id: UUID) -> bool:
        return await self._operasyon.soft_delete(op_id)

    async def get_all_operasyonlar(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Operasyon]:
        query = select(Operasyon).where(Operasyon.is_deleted == False)
        if start_date:
            query = query.where(Operasyon.tarih >= start_date)
        if end_date:
            query = query.where(Operasyon.tarih <= end_date)
        if search:
            query = query.where(Operasyon.ameliyat.ilike(f"%{search}%"))
        result = await self.session.execute(query)
        return result.scalars().all()

    # ─── Clinical Notes ──────────────────────────────────────────────────

    async def get_notes_by_patient(self, patient_id: UUID) -> List[KlinikNot]:
        return await self._not.get_by_patient(patient_id)

    async def get_muayene_notes_by_patient(self, patient_id: UUID) -> List[KlinikNot]:
        stmt = select(KlinikNot).where(
            and_(
                KlinikNot.hasta_id == patient_id,
                KlinikNot.is_deleted == False,
                or_(
                    KlinikNot.tip.ilike("MUAYENE%"),
                    KlinikNot.icerik.ilike("MUAYENE:%")
                )
            )
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_note(self, note_in: dict) -> KlinikNot:
        db_note = KlinikNot(**note_in)
        if self.context:
            db_note.created_by = self.context.user_id
        self.session.add(db_note)
        await self.session.flush()
        return db_note

    async def update_note(self, note_id: UUID, note_in: dict) -> Optional[KlinikNot]:
        return await self._not.update(note_id, note_in)

    async def delete_note(self, note_id: UUID) -> bool:
        return await self._not.soft_delete(note_id)

    # ─── Combined Follow-up (Takip/Notes) ────────────────────────────────

    async def get_takip_by_patient(self, patient_id: UUID) -> List[dict]:
        notes = await self.get_notes_by_patient(patient_id)
        exams = await self.get_examinations_by_patient(patient_id)

        combined = []
        for n in notes:
            combined.append({
                "id": n.id, "hasta_id": n.hasta_id, "tarih": n.tarih,
                "tur": n.tip, "notlar": n.icerik, "durum": n.sembol,
                "etiketler": n.etiketler, "created_at": n.created_at,
            })
        for m in exams:
            full_note = " | ".join(filter(None, [
                f"Şikayet: {m.sikayet}" if m.sikayet else None,
                f"Öykü: {m.oyku}" if m.oyku else None,
            ]))
            combined.append({
                "id": m.id, "hasta_id": m.hasta_id, "tarih": m.tarih,
                "tur": "Muayene", "notlar": full_note, "durum": "Normal",
                "created_at": m.created_at,
            })
        combined.sort(
            key=lambda x: x.get("tarih") or x.get("created_at") or datetime.min,
            reverse=True,
        )
        return combined

    async def get_takip_note(self, note_id: UUID) -> Optional[KlinikNot]:
        return await self._not.get_by_id(note_id)

    @audited(action="TAKIP_CREATE", resource_type="patient")
    async def create_takip(self, takip_in: Any) -> dict:
        data = takip_in.model_dump() if hasattr(takip_in, "model_dump") else takip_in
        mapped = {
            "hasta_id": data.get("hasta_id"), "tarih": data.get("tarih"),
            "tip": data.get("tur"), "icerik": data.get("notlar"),
            "sembol": data.get("durum"), "etiketler": data.get("etiketler"),
        }
        db_note = KlinikNot(**mapped)
        if self.context:
            db_note.created_by = self.context.user_id
        self.session.add(db_note)
        await self.session.flush()
        await self.session.flush()
        await self.session.refresh(db_note)
        return {
            "id": db_note.id, "hasta_id": db_note.hasta_id, "tarih": db_note.tarih,
            "tur": db_note.tip, "notlar": db_note.icerik, "durum": db_note.sembol,
            "etiketler": db_note.etiketler, "created_at": db_note.created_at,
        }

    async def update_takip(self, id: UUID, takip_in: Any) -> Optional[dict]:
        db_note = await self.get_takip_note(id)
        if not db_note:
            return None
        data = (
            takip_in.model_dump(exclude_unset=True)
            if hasattr(takip_in, "model_dump") else takip_in
        )
        mapping = {"tur": "tip", "notlar": "icerik", "durum": "sembol"}
        for k, v in data.items():
            db_field = mapping.get(k, k)
            if hasattr(db_note, db_field):
                setattr(db_note, db_field, v)
        if self.context:
            db_note.updated_by = self.context.user_id
        await self.session.flush()
        await self.session.flush()
        await self.session.refresh(db_note)
        return {
            "id": db_note.id, "hasta_id": db_note.hasta_id, "tarih": db_note.tarih,
            "tur": db_note.tip, "notlar": db_note.icerik, "durum": db_note.sembol,
            "etiketler": db_note.etiketler, "created_at": db_note.created_at,
        }

    async def delete_takip(self, id: UUID) -> bool:
        return await self._not.soft_delete(id)

    # ─── Tetkikler (Labs/Imaging) ────────────────────────────────────────

    async def get_tetkikler_by_patient(
        self, patient_id: UUID, kategori: Optional[str] = None
    ) -> List[TetkikSonuc]:
        conditions = [TetkikSonuc.hasta_id == patient_id, TetkikSonuc.is_deleted == False]
        if kategori:
            conditions.append(TetkikSonuc.kategori == kategori)
        stmt = (
            select(TetkikSonuc).where(and_(*conditions))
            .order_by(TetkikSonuc.tarih.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_tetkik_sonuclari_by_patient(
        self, patient_id: UUID, kategori: Optional[str] = None
    ) -> List[TetkikSonuc]:
        return await self.get_tetkikler_by_patient(patient_id, kategori)

    async def get_tetkik_sonuc(self, id: UUID) -> Optional[TetkikSonuc]:
        return await self._tetkik.get_by_id(id)

    async def create_tetkik_sonuc(self, obj_in: Any) -> TetkikSonuc:
        # Normalize lab test names and units before saving
        if hasattr(obj_in, 'tetkik_adi') and obj_in.tetkik_adi:
            from app.services.lab_normalizer_service import normalize_lab_record
            obj_in.tetkik_adi, obj_in.birim = normalize_lab_record(
                obj_in.tetkik_adi, getattr(obj_in, 'birim', None)
            )
        return await self._tetkik.create(obj_in)

    async def update_tetkik_sonuc(self, id: UUID, obj_in: Any) -> Optional[TetkikSonuc]:
        return await self._tetkik.update(id, obj_in)

    async def create_tetkik_sonuc_batch(self, objs_in: List[Any]) -> List[TetkikSonuc]:
        """
        Toplu tetkik sonucu kaydı — tek INSERT grubu, tek transaction.

        Tek tek `create_tetkik_sonuc` çağırmak yerine kullanılır. Tetkik adı ve
        birim normalizasyonu burada da uygulanır; aksi halde toplu içe aktarılan
        sonuçlar tekil kayıtlardan farklı isimlerle kaydedilir ve trend
        grafikleri aynı tetkiki iki ayrı seri gibi gösterir.
        """
        from app.services.lab_normalizer_service import normalize_lab_record

        for obj_in in objs_in:
            if getattr(obj_in, "tetkik_adi", None):
                obj_in.tetkik_adi, obj_in.birim = normalize_lab_record(
                    obj_in.tetkik_adi, getattr(obj_in, "birim", None)
                )
        return await self._tetkik.create_many(objs_in)

    async def delete_tetkik_sonuc(self, id: UUID) -> bool:
        return await self._tetkik.soft_delete(id)

    async def delete_tetkik_sonuc_batch(self, ids: List[UUID]) -> int:
        """Toplu tetkik silme — tek UPDATE ... WHERE id IN (...)."""
        return await self._tetkik.soft_delete_many(ids)

    # ─── Photos ──────────────────────────────────────────────────────────

    async def get_photos_by_patient(self, patient_id: UUID) -> List[FotografArsivi]:
        return await self._foto.get_by_patient(patient_id)

    async def create_photo(self, obj_in: Any) -> FotografArsivi:
        return await self._foto.create(obj_in)

    async def update_photo(self, id: int, obj_in: Any) -> Optional[FotografArsivi]:
        return await self._foto.update(id, obj_in)

    async def delete_photo(self, id: int) -> bool:
        return await self._foto.soft_delete(id)

    # ─── Phone Calls ─────────────────────────────────────────────────────

    async def get_phone_calls_by_patient(self, patient_id: UUID) -> List[TelefonGorusmesi]:
        return await self._telefon.get_by_patient(patient_id)

    async def create_phone_call(self, obj_in: Any) -> TelefonGorusmesi:
        return await self._telefon.create(obj_in)

    async def update_phone_call(self, id: int, obj_in: Any) -> Optional[TelefonGorusmesi]:
        return await self._telefon.update(id, obj_in)

    async def delete_phone_call(self, id: int) -> bool:
        return await self._telefon.soft_delete(id)

    # ─── Private Notes (Kişisel Notlar) ──────────────────────────────────

    async def get_private_notes_by_patient(self, patient_id: UUID) -> List[KisiselNot]:
        return await self._kisisel.get_by_patient(patient_id)

    async def create_private_note(self, obj_in: Any) -> KisiselNot:
        note = await self._kisisel.create(obj_in)
        if note:
            # Update patient flag
            await self.session.execute(
                update(Hasta)
                .where(Hasta.id == note.hasta_id)
                .values(has_private_notes=True)
            )
            await self.session.flush()
        return note

    async def update_private_note(self, id: UUID, obj_in: Any) -> Optional[KisiselNot]:
        return await self._kisisel.update(id, obj_in)

    async def delete_private_note(self, id: UUID) -> bool:
        note = await self._kisisel.get_by_id(id)
        if not note:
            return False

        hasta_id = note.hasta_id
        success = await self._kisisel.soft_delete(id)

        if success:
            # Re-evaluate if any private notes remain for this patient
            res = await self.session.execute(
                select(KisiselNot).where(
                    and_(KisiselNot.hasta_id == hasta_id, KisiselNot.is_deleted == False)
                )
            )
            any_remaining = res.scalars().first() is not None

            await self.session.execute(
                update(Hasta)
                .where(Hasta.id == hasta_id)
                .values(has_private_notes=any_remaining)
            )
            await self.session.flush()

        return success

    # ─── Reports (Rest, Consultation, Status, Medical, Biopsy) ───────────

    # Rest Reports
    async def get_rest_reports_by_patient(self, patient_id: UUID) -> List[IstirahatRaporu]:
        return await self._istirahat.get_by_patient(patient_id)

    async def get_rest_report(self, id: int) -> Optional[IstirahatRaporu]:
        return await self._istirahat.get_by_id(id)

    async def create_rest_report(self, obj_in: Any) -> IstirahatRaporu:
        return await self._istirahat.create(obj_in)

    async def update_rest_report(self, id: int, obj_in: Any) -> Optional[IstirahatRaporu]:
        return await self._istirahat.update(id, obj_in)

    async def delete_rest_report(self, id: int) -> bool:
        return await self._istirahat.soft_delete(id)

    # Consultation Reports
    async def get_consultation_reports_by_patient(self, patient_id: UUID) -> List[KonsultasyonRaporu]:
        return await self._konsultasyon.get_by_patient(patient_id)

    async def get_consultation_report(self, id: int) -> Optional[KonsultasyonRaporu]:
        return await self._konsultasyon.get_by_id(id)

    async def create_consultation_report(self, obj_in: Any) -> KonsultasyonRaporu:
        return await self._konsultasyon.create(obj_in)

    async def update_consultation_report(self, id: int, obj_in: Any) -> Optional[KonsultasyonRaporu]:
        return await self._konsultasyon.update(id, obj_in)

    async def delete_consultation_report(self, id: int) -> bool:
        return await self._konsultasyon.soft_delete(id)

    # Status Reports
    async def get_status_reports_by_patient(self, patient_id: UUID) -> List[DurumBildirirRaporu]:
        return await self._durum.get_by_patient(patient_id)

    async def get_status_report(self, id: int) -> Optional[DurumBildirirRaporu]:
        return await self._durum.get_by_id(id)

    async def create_status_report(self, obj_in: Any) -> DurumBildirirRaporu:
        return await self._durum.create(obj_in)

    async def update_status_report(self, id: int, obj_in: Any) -> Optional[DurumBildirirRaporu]:
        return await self._durum.update(id, obj_in)

    async def delete_status_report(self, id: int) -> bool:
        return await self._durum.soft_delete(id)

    # Medical Intervention Reports
    async def get_medical_reports_by_patient(self, patient_id: UUID) -> List[TibbiMudahaleRaporu]:
        return await self._tibbi.get_by_patient(patient_id)

    async def get_medical_report(self, id: int) -> Optional[TibbiMudahaleRaporu]:
        return await self._tibbi.get_by_id(id)

    async def create_medical_report(self, obj_in: Any) -> TibbiMudahaleRaporu:
        return await self._tibbi.create(obj_in)

    async def update_medical_report(self, id: int, obj_in: Any) -> Optional[TibbiMudahaleRaporu]:
        return await self._tibbi.update(id, obj_in)

    async def delete_medical_report(self, id: int) -> bool:
        return await self._tibbi.soft_delete(id)

    # TRUS Biopsy
    async def get_trus_biopsies_by_patient(self, patient_id: UUID) -> List[TrusBiyopsi]:
        return await self._trus.get_by_patient(patient_id)

    async def get_trus_biopsy(self, id: int) -> Optional[TrusBiyopsi]:
        return await self._trus.get_by_id(id)

    async def create_trus_biopsy(self, obj_in: Any) -> TrusBiyopsi:
        return await self._trus.create(obj_in)

    async def update_trus_biopsy(self, id: int, obj_in: Any) -> Optional[TrusBiyopsi]:
        return await self._trus.update(id, obj_in)

    async def delete_trus_biopsy(self, id: int) -> bool:
        return await self._trus.soft_delete(id)

    # ─── Lipus (WBL-ED) ──────────────────────────────────────────────────

    async def get_lipus_details(self, muayene_id: UUID) -> Optional[LipusDetails]:
        stmt = select(LipusDetails).where(
            and_(LipusDetails.muayene_id == muayene_id, LipusDetails.is_deleted == False)
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def create_lipus_details(self, obj_in: dict) -> LipusDetails:
        return await self._lipus.create(obj_in)

    async def update_lipus_details(self, id: UUID, obj_in: dict) -> Optional[LipusDetails]:
        return await self._lipus.update(id, obj_in)

    async def delete_lipus_details(self, id: UUID) -> bool:
        return await self._lipus.soft_delete(id)

    async def get_lipus_dashboard_data(self, patient_id: UUID) -> List[Any]:
        """
        Fetches all Lipus sessions for a patient for the comparison dashboard.
        """
        stmt = (
            select(LipusDetails, Muayene.tarih)
            .join(Muayene, LipusDetails.muayene_id == Muayene.id)
            .where(and_(Muayene.hasta_id == patient_id, LipusDetails.is_deleted == False))
            .order_by(Muayene.tarih.asc())
        )
        result = await self.session.execute(stmt)
        items = []
        for row in result.all():
            details, date = row
            item_dict = {
                col.name: getattr(details, col.name) for col in details.__table__.columns
            }
            item_dict["tarih"] = date
            items.append(item_dict)
        return items

    # ─── Bulk Patient Data Deletion ──────────────────────────────────────

    @audited(action="CLINICAL_DELETE_ALL", resource_type="patient", id_arg_name="patient_id")
    async def delete_patient_clinical_data(self, patient_id: UUID) -> bool:
        """Logical delete of ALL clinical data for a patient."""
        for model in ALL_CLINICAL_MODELS:
            # Check if model has hasta_id (most clinical models do)
            if hasattr(model, 'hasta_id'):
                stmt = (
                    update(model)
                    .where(model.hasta_id == patient_id)
                    .values(
                        is_deleted=True,
                        updated_by=self.context.user_id if self.context else None,
                    )
                )
                await self.session.execute(stmt)

            # Special case: LipusDetails is linked via muayene_id, not hasta_id
            elif model == LipusDetails:
                # Subquery to find all muayene IDs for this patient
                muayene_ids_stmt = select(Muayene.id).where(Muayene.hasta_id == patient_id)
                stmt = (
                    update(LipusDetails)
                    .where(LipusDetails.muayene_id.in_(muayene_ids_stmt))
                    .values(
                        is_deleted=True,
                        updated_by=self.context.user_id if self.context else None,
                    )
                )
                await self.session.execute(stmt)

        await self.session.flush()
        # Removal of internal commit to allow orchestrator to manage the transaction
        return True
