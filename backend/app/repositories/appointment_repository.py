from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.models.appointment import Randevu
from app.schemas.appointment import RandevuCreate, RandevuUpdate


class AppointmentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self, start: Optional[datetime] = None, end: Optional[datetime] = None
    ) -> List[Randevu]:
        query = select(Randevu).options(
            selectinload(Randevu.hasta), selectinload(Randevu.doctor)
        )
        conditions = []

        if start:
            # Event ends after the start of our window
            conditions.append(Randevu.end >= start)
        if end:
            # Event starts before the end of our window
            conditions.append(Randevu.start <= end)

        # Sadece silinmemişleri getir (Aktif randevular)
        from sqlalchemy import or_

        conditions.append(or_(Randevu.is_deleted != 1, Randevu.is_deleted.is_(None)))

        if conditions:
            query = query.filter(and_(*conditions))

        query = query.order_by(Randevu.start.desc())
        result = await self.db.execute(query)
        appointments = result.scalars().all()

        # Micro-data Enrichment Phase
        return await self._enrich_appointments(appointments, start, end)

    async def get_all_with_deleted(
        self, start: Optional[datetime] = None, end: Optional[datetime] = None
    ) -> List[Randevu]:
        """Get all appointments INCLUDING soft-deleted ones (for change tracking view)."""
        query = select(Randevu).options(
            selectinload(Randevu.hasta), selectinload(Randevu.doctor)
        )
        conditions = []

        if start:
            conditions.append(Randevu.end >= start)
        if end:
            conditions.append(Randevu.start <= end)

        # No is_deleted filter — return everything
        if conditions:
            query = query.filter(and_(*conditions))

        query = query.order_by(Randevu.start.desc())
        result = await self.db.execute(query)
        appointments = list(result.scalars().all())

        # Fetch history records (RandevuTarihce) for "ghost" appointments
        from app.models.appointment import RandevuTarihce
        tarihce_cond = []
        if start:
            tarihce_cond.append(RandevuTarihce.eski_end >= start)
        if end:
            tarihce_cond.append(RandevuTarihce.eski_start <= end)

        tarihce_query = select(RandevuTarihce).options(selectinload(RandevuTarihce.hasta))
        if tarihce_cond:
            tarihce_query = tarihce_query.filter(and_(*tarihce_cond))

        t_result = await self.db.execute(tarihce_query)
        tarihceler = t_result.scalars().all()

        for t in tarihceler:
            transient = Randevu(
                id=t.randevu_id,
                hasta_id=t.hasta_id,
                hasta=t.hasta,
                title=t.eski_title or "Tarihçe",
                start=t.eski_start,
                end=t.eski_end,
                status="history",  # Custom status to indicate ghost
                is_deleted=2,     # Custom flag to indicate history event vs actual deleted (1)
            )
            appointments.append(transient)

        return await self._enrich_appointments(appointments, start, end)

    async def _enrich_appointments(self, appointments: List[Randevu], start: Optional[datetime], end: Optional[datetime]):
        if not appointments:
            return []

        from app.repositories.clinical.models import TetkikSonuc, Muayene, KlinikNot
        from app.repositories.finance.models import FinansIslem
        from app.repositories.patient.models import Hasta
        from sqlalchemy import cast, Date, func
        from app.schemas.appointment import ClinicalBriefSchema
        from uuid import UUID

        # Auto-link appointments that are missing hasta_id if title matches a patient
        unlinked = [a for a in appointments if not a.hasta_id and a.status != 'blocked' and a.title]
        if unlinked:
            for a in unlinked:
                clean_title = a.title.split(' - ')[0].strip()
                if clean_title:
                    res = await self.db.execute(
                        select(Hasta).filter(
                            func.trim(func.concat(Hasta.ad, ' ', Hasta.soyad)).ilike(clean_title)
                        ).limit(1)
                    )
                    matched_hasta = res.scalars().first()
                    if matched_hasta:
                        a.hasta_id = matched_hasta.id
                        a.hasta = matched_hasta

        # Safely convert hasta_ids to UUID list
        hasta_ids = []
        for a in appointments:
            if a.hasta_id:
                try:
                    h_uuid = a.hasta_id if isinstance(a.hasta_id, UUID) else UUID(str(a.hasta_id))
                    hasta_ids.append(h_uuid)
                except Exception:
                    pass

        if not hasta_ids:
            return appointments

        # 1. Fetch relevant Finance Transactions in bulk
        fin_query = select(FinansIslem.hasta_id, FinansIslem.tarih, FinansIslem.durum).where(
            and_(
                FinansIslem.hasta_id.in_(hasta_ids),
                FinansIslem.islem_tipi == "gelir",
                FinansIslem.is_deleted == False
            )
        )
        if start:
            fin_query = fin_query.where(FinansIslem.tarih >= (start.date() if isinstance(start, datetime) else start))
        if end:
            fin_query = fin_query.where(FinansIslem.tarih <= (end.date() if isinstance(end, datetime) else end))

        fin_res = await self.db.execute(fin_query)
        # Map: (hasta_id, date) -> status
        pay_map = {}
        for row in fin_res:
            key = (str(row[0]), row[1])
            # If any transaction for that day is 'tamamlandi', we mark as paid
            if row[2] == "tamamlandi" or pay_map.get(key) != "tamamlandi":
                pay_map[key] = row[2]

        # 2. Fetch relevant Lab Results in bulk
        lab_query = select(TetkikSonuc.hasta_id, cast(TetkikSonuc.tarih, Date)).where(
            and_(
                TetkikSonuc.hasta_id.in_(hasta_ids),
                TetkikSonuc.is_deleted == False
            )
        )
        if start:
            # Ensure start is date-compatible
            s_date = start.date() if isinstance(start, datetime) else start
            lab_query = lab_query.where(cast(TetkikSonuc.tarih, Date) >= s_date)
        if end:
            e_date = end.date() if isinstance(end, datetime) else end
            lab_query = lab_query.where(cast(TetkikSonuc.tarih, Date) <= e_date)

        lab_res = await self.db.execute(lab_query)
        lab_set = {(str(row[0]), row[1]) for row in lab_res}

        # 3. Clinical Brief — Fetch last Muayene per patient (bulk, DISTINCT ON)
        exam_map = {}  # hasta_id_str -> ClinicalBriefSchema partial
        try:
            exam_query = (
                select(
                    Muayene.hasta_id,
                    Muayene.tarih,
                    Muayene.sikayet,
                    Muayene.tani_kesin,
                    Muayene.tani1,
                    Muayene.sonuc,
                    Muayene.oneriler,
                    Muayene.tedavi,
                )
                .where(
                    and_(
                        Muayene.hasta_id.in_(hasta_ids),
                        Muayene.is_deleted == False,
                    )
                )
                .order_by(Muayene.hasta_id, Muayene.tarih.desc())
                .distinct(Muayene.hasta_id)
            )
            exam_res = await self.db.execute(exam_query)
            for row in exam_res:
                h_id, tarih, sikayet, tani_kesin, tani1, sonuc, oneriler, tedavi = row
                exam_map[str(h_id)] = {
                    "son_muayene_tarih": tarih,
                    "son_muayene_sikayet": sikayet,
                    "son_muayene_tani": tani_kesin or tani1,
                    "son_muayene_sonuc": sonuc or oneriler,
                    "son_muayene_tedavi": tedavi,
                }
        except Exception:
            # Graceful degradation — if muayeneler table is missing, skip
            import logging
            logging.getLogger(__name__).warning("[ENRICHMENT] Muayene brief query failed, skipping")

        # 4. Clinical Brief — Fetch last KlinikNot per patient (bulk, DISTINCT ON)
        note_map = {}  # hasta_id_str -> note fields
        try:
            note_query = (
                select(
                    KlinikNot.hasta_id,
                    KlinikNot.tarih,
                    KlinikNot.icerik,
                    KlinikNot.tip,
                )
                .where(
                    and_(
                        KlinikNot.hasta_id.in_(hasta_ids),
                        KlinikNot.is_deleted == False,
                    )
                )
                .order_by(KlinikNot.hasta_id, KlinikNot.tarih.desc())
                .distinct(KlinikNot.hasta_id)
            )
            note_res = await self.db.execute(note_query)
            for row in note_res:
                h_id, tarih, icerik, tip = row
                note_map[str(h_id)] = {
                    "son_not_tarih": tarih,
                    "son_not_icerik": icerik,
                    "son_not_tip": tip,
                }
        except Exception:
            import logging
            logging.getLogger(__name__).warning("[ENRICHMENT] KlinikNot brief query failed, skipping")

        # 5. Attach to models (Pydantic will pick these up)
        for apt in appointments:
            apt_date = apt.start.date() if isinstance(apt.start, datetime) else apt.start
            key = (str(apt.hasta_id), apt_date)

            # Payment status mapping
            db_status = pay_map.get(key)
            if db_status == "tamamlandi":
                apt.payment_status = "paid"
            elif db_status == "bekliyor":
                apt.payment_status = "unpaid"
            else:
                apt.payment_status = None

            # Lab status
            apt.has_lab_results = key in lab_set

            # Clinical Brief
            h_str = str(apt.hasta_id) if apt.hasta_id else None
            if h_str:
                exam_data = exam_map.get(h_str, {})
                note_data = note_map.get(h_str, {})

                # Check if patient is a new patient (no prior exams/notes)
                is_new = not bool(exam_data or note_data)

                hasta_obj = getattr(apt, 'hasta', None)
                h_notu = None
                if hasta_obj:
                    h_notu = getattr(hasta_obj, 'kimlik_notlar', None) or getattr(hasta_obj, 'kayit_notu', None)

                apt.clinical_brief = ClinicalBriefSchema(
                    **{
                        **exam_data,
                        **note_data,
                        "is_new_patient": is_new,
                        "hasta_notu": h_notu
                    }
                )

        return appointments

    async def get_by_id(self, randevu_id: int) -> Optional[Randevu]:
        result = await self.db.execute(
            select(Randevu)
            .options(selectinload(Randevu.hasta), selectinload(Randevu.doctor))
            .filter(Randevu.id == randevu_id)
        )
        appointment = result.scalars().first()
        if appointment:
            enriched = await self._enrich_appointments([appointment], appointment.start, appointment.end)
            return enriched[0] if enriched else appointment
        return None

    async def get_by_patient(self, hasta_id: str) -> List[Randevu]:
        result = await self.db.execute(
            select(Randevu)
            .options(selectinload(Randevu.hasta))
            .filter(Randevu.hasta_id == (UUID(hasta_id) if isinstance(hasta_id, str) else hasta_id))
            .order_by(Randevu.start.desc())
        )
        appointments = result.scalars().all()

        if not appointments:
            return []

        start_date = min(a.start for a in appointments)
        end_date = max(a.start for a in appointments)

        return await self._enrich_appointments(appointments, start_date, end_date)

    async def create(self, obj_in: RandevuCreate, user_id: int = None, user_name: str = None) -> Randevu:
        db_obj = Randevu(**obj_in.model_dump())
        if user_id:
            db_obj.created_by_id = user_id
            db_obj.created_by_name = user_name
            db_obj.updated_by_id = user_id
            db_obj.updated_by_name = user_name
        self.db.add(db_obj)
        await self.db.flush()
        await self.db.refresh(db_obj)

        # Reload with relationship
        result = await self.db.execute(
            select(Randevu)
            .options(selectinload(Randevu.hasta), selectinload(Randevu.doctor))
            .filter(Randevu.id == db_obj.id)
        )
        created_apt = result.scalars().first()
        if created_apt:
            enriched = await self._enrich_appointments([created_apt], created_apt.start, created_apt.end)
            return enriched[0] if enriched else created_apt
        return db_obj

    async def update(self, randevu_id: int, obj_in: RandevuUpdate, user_id: int = None, user_name: str = None) -> Optional[Randevu]:
        db_obj = await self.get_by_id(randevu_id)
        if not db_obj:
            return None

        update_data = obj_in.model_dump(exclude_unset=True)

        # Eğer tarih değişiyorsa tarihçeye ekle
        if "start" in update_data or "end" in update_data:
            from app.models.appointment import RandevuTarihce
            tarihce = RandevuTarihce(
                randevu_id=db_obj.id,
                hasta_id=db_obj.hasta_id,
                eski_start=db_obj.start,
                eski_end=db_obj.end,
                islem_tipi="update",
                eski_title=db_obj.title,
                eski_status=db_obj.status,
                degistiren_id=user_id,
                degistiren_name=user_name
            )
            self.db.add(tarihce)

        for field, value in update_data.items():
            setattr(db_obj, field, value)

        # Updated by bilgisini güncelle
        if user_id:
            db_obj.updated_by_id = user_id
            db_obj.updated_by_name = user_name

        await self.db.flush()
        await self.db.refresh(db_obj)

        # Reload with relationship
        result = await self.db.execute(
            select(Randevu)
            .options(selectinload(Randevu.hasta), selectinload(Randevu.doctor))
            .filter(Randevu.id == randevu_id)
        )
        updated_apt = result.scalars().first()
        if updated_apt:
            enriched = await self._enrich_appointments([updated_apt], updated_apt.start, updated_apt.end)
            return enriched[0] if enriched else updated_apt
        return db_obj

    async def delete(self, randevu_id: int, reason: Optional[str] = None, user_id: int = None, user_name: str = None) -> bool:
        db_obj = await self.get_by_id(randevu_id)
        if not db_obj:
            return False

        db_obj.is_deleted = 1
        db_obj.delete_reason = reason

        # Updated by bilgisini güncelle
        if user_id:
            db_obj.updated_by_id = user_id
            db_obj.updated_by_name = user_name

        from app.models.appointment import RandevuTarihce
        tarihce = RandevuTarihce(
            randevu_id=db_obj.id,
            hasta_id=db_obj.hasta_id,
            eski_start=db_obj.start,
            eski_end=db_obj.end,
            islem_tipi="delete",
            eski_title=db_obj.title,
            eski_status=db_obj.status,
            degistiren_id=user_id,
            degistiren_name=user_name
        )
        self.db.add(tarihce)

        await self.db.flush()
        return True
