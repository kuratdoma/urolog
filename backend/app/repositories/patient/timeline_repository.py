"""
Patient Timeline Repository — Performance Optimized.

Aggregates events from 7 tables into a unified timeline using a single
UNION ALL query instead of 7 sequential round-trips.

Complexity: O(1) DB round-trip regardless of number of event sources.
"""
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, date

from sqlalchemy import text, union_all, select, literal, cast, String, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.clinical.models import (
    Muayene,
    Operasyon,
    KlinikNot,
    TetkikSonuc,
    IstirahatRaporu,
)
from app.models.appointment import Randevu, RandevuTarihce
from app.models.documents import HastaDosya
from app.repositories.finance.models import FinansIslem
from app.core.user_context import UserContext


class PatientTimelineRepository:
    def __init__(self, session: AsyncSession, context: Optional[UserContext] = None):
        self.session = session
        self.context = context

    async def get_timeline(self, patient_id: UUID) -> List[Dict[str, Any]]:
        """
        Aggregates and sorts all patient events into a unified timeline.
        
        Uses a single UNION ALL query combining all 7 event sources,
        reducing DB round-trips from 7 to 1.
        """
        # Build individual SELECT statements with uniform columns
        pid = str(patient_id)

        # 1. Randevular (Appointments)
        q_appt = (
            select(
                (literal("appt_") + cast(Randevu.id, String)).label("event_id"),
                cast(Randevu.start, String).label("event_date"),
                literal("appointment").label("event_type"),
                literal("Randevu").label("title"),
                func.coalesce(Randevu.title, literal("Planlanmış Randevu")).label("description"),
                Randevu.doctor_name.label("personnel"),
                Randevu.status.label("raw_status"),
                Randevu.cancel_reason.label("extra1"),
                Randevu.delete_reason.label("extra2"),
                literal(None).label("extra3"),
            )
            .where(Randevu.hasta_id == patient_id)
        )

        # 1.5. Randevu Tarihçesi (Appointment changes)
        q_tarihce = (
            select(
                (literal("appt_hist_") + cast(RandevuTarihce.id, String)).label("event_id"),
                cast(RandevuTarihce.created_at, String).label("event_date"),
                literal("appointment_modified").label("event_type"),
                literal("Randevu İşlemi").label("title"),
                literal("Randevu durumu/tarihi güncellendi").label("description"),
                literal(None).label("personnel"),
                func.coalesce(RandevuTarihce.islem_tipi, literal("update")).label("raw_status"),
                cast(RandevuTarihce.eski_start, String).label("extra1"),
                cast(Randevu.start, String).label("extra2"),
                func.coalesce(Randevu.delete_reason, literal("")).label("extra3"),
            )
            .join(Randevu, RandevuTarihce.randevu_id == Randevu.id, isouter=True)
            .where(RandevuTarihce.hasta_id == patient_id)
        )

        # 2. Finans İşlemler
        q_fin = (
            select(
                (literal("fin_") + cast(FinansIslem.id, String)).label("event_id"),
                cast(FinansIslem.tarih, String).label("event_date"),
                FinansIslem.islem_tipi.label("event_type"),
                literal("Finans").label("title"),
                func.coalesce(FinansIslem.aciklama, literal("")).label("description"),
                FinansIslem.doktor.label("personnel"),
                literal("Tamamlandı").label("raw_status"),
                cast(FinansIslem.net_tutar, String).label("extra1"),
                literal(None).label("extra2"),
                literal(None).label("extra3"),
            )
            .where(FinansIslem.hasta_id == patient_id)
            .where(FinansIslem.is_deleted == False)
        )

        # 3. Muayeneler (Examinations)
        q_exam = (
            select(
                (literal("clin_") + cast(Muayene.id, String)).label("event_id"),
                cast(Muayene.tarih, String).label("event_date"),
                literal("examination").label("event_type"),
                literal("Muayene").label("title"),
                func.coalesce(Muayene.sikayet, literal("Genel Muayene")).label("description"),
                Muayene.doktor.label("personnel"),
                literal("Tamamlandı").label("raw_status"),
                literal(None).label("extra1"),
                literal(None).label("extra2"),
                literal(None).label("extra3"),
            )
            .where(Muayene.hasta_id == patient_id)
            .where(Muayene.is_deleted == False)
        )

        # 4. Operasyonlar
        q_op = (
            select(
                (literal("op_") + cast(Operasyon.id, String)).label("event_id"),
                cast(Operasyon.tarih, String).label("event_date"),
                literal("operation").label("event_type"),
                literal("Operasyon").label("title"),
                func.coalesce(Operasyon.ameliyat, literal("Operasyon Kaydı")).label("description"),
                func.coalesce(Operasyon.ekip, Operasyon.hemsire).label("personnel"),
                literal("Tamamlandı").label("raw_status"),
                literal(None).label("extra1"),
                literal(None).label("extra2"),
                literal(None).label("extra3"),
            )
            .where(Operasyon.hasta_id == patient_id)
            .where(Operasyon.is_deleted == False)
        )

        # 5. Tetkikler (Lab/Imaging)
        q_lab = (
            select(
                (literal("lab_") + cast(TetkikSonuc.id, String)).label("event_id"),
                cast(TetkikSonuc.tarih, String).label("event_date"),
                TetkikSonuc.kategori.label("event_type"),
                literal("Tetkik").label("title"),
                func.coalesce(TetkikSonuc.tetkik_adi, literal("Tetkik Sonucu")).label("description"),
                literal(None).label("personnel"),
                literal("Tamamlandı").label("raw_status"),
                literal(None).label("extra1"),
                literal(None).label("extra2"),
                literal(None).label("extra3"),
            )
            .where(TetkikSonuc.hasta_id == patient_id)
            .where(TetkikSonuc.is_deleted == False)
        )

        # 6. Belgeler (Documents)
        q_doc = (
            select(
                (literal("doc_") + cast(HastaDosya.id, String)).label("event_id"),
                cast(HastaDosya.created_at, String).label("event_date"),
                literal("document").label("event_type"),
                literal("Belge Arşivi").label("title"),
                func.coalesce(HastaDosya.dosya_adi, literal("Belge")).label("description"),
                literal(None).label("personnel"),
                literal("Yüklendi").label("raw_status"),
                literal(None).label("extra1"),
                literal(None).label("extra2"),
                literal(None).label("extra3"),
            )
            .where(HastaDosya.hasta_id == patient_id)
            .where(HastaDosya.is_deleted == False)
        )

        # 7. Klinik Notlar
        q_note = (
            select(
                (literal("note_") + cast(KlinikNot.id, String)).label("event_id"),
                cast(KlinikNot.tarih, String).label("event_date"),
                literal("followup").label("event_type"),
                literal("Takip Notu").label("title"),
                func.coalesce(KlinikNot.icerik, literal("Not Kaydı")).label("description"),
                literal(None).label("personnel"),
                func.coalesce(KlinikNot.tip, literal("Bilgi")).label("raw_status"),
                literal(None).label("extra1"),
                literal(None).label("extra2"),
                literal(None).label("extra3"),
            )
            .where(KlinikNot.hasta_id == patient_id)
            .where(KlinikNot.is_deleted == False)
        )

        # 8. İstirahat Raporları
        q_report = (
            select(
                (literal("rep_ist_") + cast(IstirahatRaporu.id, String)).label("event_id"),
                cast(IstirahatRaporu.tarih, String).label("event_date"),
                literal("report").label("event_type"),
                literal("İstirahat Raporu").label("title"),
                func.coalesce(IstirahatRaporu.tani, literal("Rapor Kaydı")).label("description"),
                literal(None).label("personnel"),
                literal("Düzenlendi").label("raw_status"),
                literal(None).label("extra1"),
                literal(None).label("extra2"),
                literal(None).label("extra3"),
            )
            .where(IstirahatRaporu.hasta_id == patient_id)
            .where(IstirahatRaporu.is_deleted == False)
        )

        # Execute UNION ALL as a single query
        combined = union_all(q_appt, q_tarihce, q_fin, q_exam, q_op, q_lab, q_doc, q_note, q_report)
        try:
            result = await self.session.execute(combined)
            rows = result.all()
        except Exception as e:
            err_str = str(e).lower()
            if "undefinedtable" in err_str or "does not exist" in err_str:
                import logging
                logging.getLogger(__name__).warning(f"[TIMELINE] Table missing, falling back to sequential: {e}")
                await self.session.rollback()
                rows = []
                for q in [q_appt, q_tarihce, q_fin, q_exam, q_op, q_lab, q_doc, q_note, q_report]:
                    try:
                        res = await self.session.execute(q)
                        rows.extend(res.all())
                    except Exception:
                        await self.session.rollback()
            else:
                raise

        # Transform rows to timeline dicts
        timeline = []
        for row in rows:
            event_id, event_date_str, event_type, title, description, personnel, raw_status, extra1, extra2, extra3 = row

            # Parse date
            raw_date = self._parse_date(event_date_str)

            # Post-process event-type specific logic
            evt = self._build_event(
                event_id, raw_date, event_type, title, description,
                personnel, raw_status, extra1, extra2, extra3
            )
            timeline.append(evt)

        # Sort by date descending
        timeline.sort(key=self._get_sort_key, reverse=True)
        return timeline

    def _parse_date(self, date_str: Any) -> Any:
        """Parse date string back to datetime for sorting."""
        if date_str is None:
            return None
        if isinstance(date_str, (datetime, date)):
            return date_str
        try:
            # Try ISO datetime format first
            return datetime.fromisoformat(str(date_str).replace("+00:00", "").replace("Z", ""))
        except (ValueError, TypeError):
            try:
                return datetime.strptime(str(date_str)[:10], "%Y-%m-%d")
            except (ValueError, TypeError):
                return None

    def _safe_time(self, dt: Any) -> Optional[str]:
        if not dt or not isinstance(dt, datetime):
            return None
        return dt.strftime("%H:%M")

    def _get_sort_key(self, x: Dict) -> datetime:
        rd = x.get("raw_date")
        if rd is None:
            return datetime.min
        if isinstance(rd, datetime):
            return rd.replace(tzinfo=None)
        if isinstance(rd, date):
            return datetime.combine(rd, datetime.min.time())
        return datetime.min

    def _build_event(
        self, event_id, raw_date, event_type, title, description,
        personnel, raw_status, extra1, extra2, extra3
    ) -> Dict[str, Any]:
        """Build timeline event dict with type-specific post-processing."""
        time_str = self._safe_time(raw_date) if isinstance(raw_date, datetime) else None

        # Appointment-specific logic
        if event_type == "appointment":
            status_label = "Planlandı"
            final_type = "appointment"
            if raw_status == "completed":
                status_label = "Tamamlandı"
            elif raw_status == "cancelled":
                status_label = "İptal Edildi"
                final_type = "appointment_cancelled"
                reason = extra1 or extra2 or "Belirtilmedi"
                description = f"İPTAL: {description} (Gerekçe: {reason})"

            return {
                "id": event_id, "date": raw_date, "type": final_type,
                "title": title, "description": description,
                "personnel": personnel, "status": status_label,
                "time": time_str, "raw_date": raw_date,
            }

        if event_type == "appointment_modified":
            action_desc = "Silindi" if raw_status == "delete" else "Güncellendi"
            return {
                "id": event_id, "date": raw_date, "type": "appointment_modified",
                "title": title, "description": f"Randevu {action_desc} (Eski Tarih: {extra1})",
                "personnel": None, "status": "Değişiklik",
                "time": time_str, "raw_date": raw_date,
                "extra1": extra1,
                "extra2": extra2,
                "extra3": extra3,
                "raw_status": raw_status
            }

        # Finance-specific logic
        if event_type in ("gelir", "gider"):
            is_payment = event_type == "gelir"
            fin_title = "Ödeme" if is_payment else "Hizmet"
            amount = float(extra1 or 0)
            return {
                "id": event_id, "date": raw_date,
                "type": "payment" if is_payment else "service",
                "title": fin_title, "description": description or fin_title,
                "personnel": personnel, "status": "Tamamlandı",
                "amount": amount, "time": None, "raw_date": raw_date,
            }

        # Lab/Imaging-specific logic
        if event_type == "Goruntuleme":
            return {
                "id": event_id, "date": raw_date, "type": "imaging",
                "title": "Görüntüleme", "description": description,
                "personnel": personnel, "status": raw_status,
                "time": None, "raw_date": raw_date,
            }
        if event_id.startswith("lab_"):
            return {
                "id": event_id, "date": raw_date, "type": "lab",
                "title": "Laboratuvar", "description": description,
                "personnel": personnel, "status": raw_status,
                "time": None, "raw_date": raw_date,
            }

        # Generic event
        return {
            "id": event_id, "date": raw_date, "type": event_type,
            "title": title, "description": description,
            "personnel": personnel, "status": raw_status,
            "time": time_str, "raw_date": raw_date,
        }
