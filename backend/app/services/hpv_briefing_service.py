"""
HPV Briefing Service — Kondilom/HPV Hasta Klinik Özet Servisi

Hastanın tüm klinik geçmişini (muayeneler, operasyonlar, takip notları, fotoğraflar)
tarayarak Gemini AI ile yapılandırılmış bir klinik özet oluşturur.
"""

import asyncio
import json
import logging
import re
from datetime import datetime, date
from typing import Dict, Any, List, Optional
from uuid import UUID

from sqlalchemy import select, or_, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.patient.models import Hasta
from app.repositories.clinical.models import (
    Muayene,
    Operasyon,
    KlinikNot,
    FotografArsivi,
    TibbiMudahaleRaporu,
    HPVBriefingKaydi,
)
from app.repositories.setting_repository import SettingRepository
from app.core.config import settings
from app.core.pii_scrubber import mask_identifiers
from app.schemas.hpv_briefing import (
    HPVBriefingResponse,
    TedaviKaydi,
    AsiDurumu,
    NuksAnalizi,
    MedikalTedavi,
)

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Keyword & ICD Constants
# ──────────────────────────────────────────────

CONDYLOMA_KEYWORDS = [
    "kondilom", "kondiloma", "condyloma", "condylomata",
    "hpv", "siğil", "sigil", "genital siğil", "genital sigil",
    "verruca", "verruka", "papillom",
]

CONDYLOMA_ICD_PREFIXES = [
    "B07", "A63",
]

CONDYLOMA_OPERATION_KEYWORDS = [
    "kondilom", "kondiloma", "lazer", "kriyoterapi", "ablasyon",
    "siğil", "sigil", "koterizasyon", "eksizyon", "hpv",
]

HPV_FOLLOWUP_EXACT_TYPES = [
    "HPV TAKİP", "KRİYOTERAPİ", "LAZER UYGULAMA",
]

HPV_FOLLOWUP_BROAD_TYPES = [
    "KONTROL", "TAKİP", "GARDASİL",
    "GARDASİL (1/2/3. DOZ)", "GARDASİL (1. DOZ)", "GARDASİL (2. DOZ)", "GARDASİL (3. DOZ)",
]


def _matches_condyloma(text: Optional[str]) -> bool:
    """Check if free text contains condyloma-related keywords."""
    if not text:
        return False
    lower = text.lower()
    return any(kw in lower for kw in CONDYLOMA_KEYWORDS)


def _matches_condyloma_icd(code: Optional[str]) -> bool:
    """Check if an ICD code matches condyloma-related prefixes."""
    if not code:
        return False
    upper = code.upper().strip()
    return any(upper.startswith(prefix) for prefix in CONDYLOMA_ICD_PREFIXES)


def _format_date(d: Any) -> Optional[str]:
    """Format a datetime/date to DD.MM.YYYY string."""
    if d is None:
        return None
    if isinstance(d, datetime):
        return d.strftime("%d.%m.%Y")
    if isinstance(d, date):
        return d.strftime("%d.%m.%Y")
    return str(d)


def _parse_date(d: Any) -> Optional[datetime]:
    """Parse date/datetime or DD.MM.YYYY string to datetime."""
    if d is None:
        return None
    if isinstance(d, datetime):
        return d
    if isinstance(d, date):
        return datetime.combine(d, datetime.min.time())
    if isinstance(d, str):
        for fmt in ("%d.%m.%Y", "%Y-%m-%d", "%d/%m/%Y"):
            try:
                return datetime.strptime(d, fmt)
            except ValueError:
                pass
    return None


def _truncate(text: Optional[str], max_len: int = 500) -> Optional[str]:
    """Truncate long text fields to save tokens."""
    if not text:
        return text
    text = str(text).strip()
    if len(text) > max_len:
        return text[:max_len] + "... (kısaltıldı)"
    return text


class HPVBriefingService:
    """Kondilom/HPV hastası için AI-destekli klinik briefing oluşturur ve DB'de hafıza tutar."""

    def __init__(self):
        try:
            from google import genai
            from google.genai import types as genai_types
            self._genai = genai
            self._genai_types = genai_types
        except ImportError:
            self._genai = None
            self._genai_types = None
            logger.warning("google-genai library not available for HPV Briefing.")

    async def generate_briefing(
        self, db: AsyncSession, patient_id: str, force_refresh: bool = False
    ) -> HPVBriefingResponse:
        """
        Ana giriş noktası:
        1. Mevcut kondilom/HPV verilerini topla.
        2. Veritabanından hastanın son briefing kaydını (hafızasını) çek.
        3. Eğer kayıt varsa ve yeni klinik veri yoksa (ve force_refresh değilse), son kaydı dön (0 token).
        4. Eğer kayıt varsa ve yeni klinik veriler eklenmişse, sadece yeni verileri + önceki özeti AI'a göndererek artımlı güncelle.
        5. Eğer hiç kayıt yoksa, tüm verileri AI'a gönderip ilk özeti oluştur.
        6. Güncellenen veya yeni oluşturulan briefing'i veritabanına kaydet.
        """

        # 1. Tüm ilgili verileri topla
        context = await self._collect_patient_context(db, patient_id)

        if not context:
            raise ValueError("Hasta bulunamadı veya kondilom/HPV verisi yok.")

        # En son klinik işlem/kayıt tarihini bul
        latest_clinical_date = self._find_latest_record_date(context)

        # 2. Veritabanında kayıtlı son briefing'i çek
        stmt = (
            select(HPVBriefingKaydi)
            .where(
                HPVBriefingKaydi.hasta_id == patient_id,
                HPVBriefingKaydi.is_deleted == False,
            )
            .order_by(HPVBriefingKaydi.created_at.desc())
            .limit(1)
        )
        result = await db.execute(stmt)
        last_briefing_record = result.scalars().first()

        # 3. İnceleme: Daha önce briefing var mı?
        if last_briefing_record and not force_refresh:
            last_cutoff_date = last_briefing_record.son_islem_tarihi
            if last_cutoff_date is None and last_briefing_record.created_at:
                last_cutoff_date = last_briefing_record.created_at.replace(tzinfo=None)

            # Yeni eklenen verileri filtrele (cutoff'tan sonraki kayıtlar)
            new_records_context = self._filter_new_records(context, last_cutoff_date)

            total_new_items = (
                len(new_records_context["examinations"])
                + len(new_records_context["operations"])
                + len(new_records_context["followups"])
                + len(new_records_context["medical_reports"])
            )

            if total_new_items == 0:
                logger.info(f"HPV Briefing cache hit for patient {patient_id}. No new records.")
                try:
                    cached_data = last_briefing_record.briefing_data
                    return HPVBriefingResponse(**cached_data)
                except Exception as e:
                    logger.warning(f"Failed to load cached briefing, regenerating: {e}")

            # Yeni kayıtlar var -> Artımlı (Incremental) güncelleme yap!
            logger.info(
                f"HPV Briefing incremental update for patient {patient_id} with {total_new_items} new records."
            )
            briefing = await self._analyze_incremental_with_ai(
                previous_briefing=last_briefing_record.briefing_data,
                new_context=new_records_context,
                full_context=context,
                db=db,
            )
        else:
            # İlk briefing veya zorunlu tam yenileme
            logger.info(f"HPV Briefing full initial generation for patient {patient_id}.")
            briefing = await self._analyze_with_ai(context, db)

        # 4. Briefing'i veritabanına kaydet
        await self._save_briefing_record(db, patient_id, briefing, latest_clinical_date)

        return briefing

    def _find_latest_record_date(self, context: Dict[str, Any]) -> Optional[datetime]:
        """Tüm kayıtlar arasındaki en yeni tarihi döner."""
        dates = []
        for e in context.get("examinations", []):
            if e.get("raw_date"):
                dates.append(e["raw_date"])
        for o in context.get("operations", []):
            if o.get("raw_date"):
                dates.append(o["raw_date"])
        for f in context.get("followups", []):
            if f.get("raw_date"):
                dates.append(f["raw_date"])
        for r in context.get("medical_reports", []):
            if r.get("raw_date"):
                dates.append(r["raw_date"])

        return max(dates) if dates else datetime.now()

    def _filter_new_records(
        self, context: Dict[str, Any], cutoff_date: Optional[datetime]
    ) -> Dict[str, Any]:
        """cutoff_date'ten sonraki (yeni eklenen) kayıtları filtreler."""
        if not cutoff_date:
            return context

        def is_after(record_raw_date: Optional[datetime]) -> bool:
            if not record_raw_date:
                return False
            rec_dt = record_raw_date.replace(tzinfo=None) if hasattr(record_raw_date, 'tzinfo') and record_raw_date.tzinfo else record_raw_date
            cut_dt = cutoff_date.replace(tzinfo=None) if hasattr(cutoff_date, 'tzinfo') and cutoff_date.tzinfo else cutoff_date
            return rec_dt > cut_dt

        return {
            "patient": context["patient"],
            "examinations": [e for e in context.get("examinations", []) if is_after(e.get("raw_date"))],
            "operations": [o for o in context.get("operations", []) if is_after(o.get("raw_date"))],
            "followups": [f for f in context.get("followups", []) if is_after(f.get("raw_date"))],
            "medical_reports": [r for r in context.get("medical_reports", []) if is_after(r.get("raw_date"))],
        }

    async def _save_briefing_record(
        self,
        db: AsyncSession,
        patient_id: str,
        briefing: HPVBriefingResponse,
        latest_record_date: Optional[datetime],
    ) -> None:
        """Yeni briefing kaydını DB'ye yazar."""
        try:
            briefing_dict = briefing.model_dump()
            record = HPVBriefingKaydi(
                hasta_id=patient_id,
                briefing_data=briefing_dict,
                son_islem_tarihi=latest_record_date,
            )
            db.add(record)
            await db.commit()
            logger.info(f"HPV Briefing saved to DB for patient {patient_id}")
        except Exception as e:
            logger.error(f"Failed to save HPV briefing to DB: {e}", exc_info=True)
            await db.rollback()

    # ──────────────────────────────────────────────
    # PHASE 1: Data Collection
    # ──────────────────────────────────────────────

    async def _collect_patient_context(
        self, db: AsyncSession, patient_id: str
    ) -> Optional[Dict[str, Any]]:
        """Hastanın tüm kondilom-ilişkili verilerini toplar."""

        patient = await self._get_patient(db, patient_id)
        if not patient:
            return None

        exams, ops, followups, med_reports = await asyncio.gather(
            self._get_condyloma_examinations(db, patient_id),
            self._get_condyloma_operations(db, patient_id),
            self._get_hpv_followups(db, patient_id),
            self._get_condyloma_reports(db, patient_id),
        )

        if not exams and not ops and not followups and not med_reports:
            return None

        return {
            "patient": patient,
            "examinations": exams,
            "operations": ops,
            "followups": followups,
            "medical_reports": med_reports,
        }

    async def _get_patient(self, db: AsyncSession, patient_id: str) -> Optional[Dict]:
        """Hasta demografik bilgilerini çek."""
        stmt = select(Hasta).where(
            Hasta.id == patient_id, Hasta.is_deleted == False
        )
        result = await db.execute(stmt)
        patient = result.scalar_one_or_none()
        if not patient:
            return None

        age = None
        if patient.dogum_tarihi:
            today = date.today()
            age = today.year - patient.dogum_tarihi.year
            if (today.month, today.day) < (patient.dogum_tarihi.month, patient.dogum_tarihi.day):
                age -= 1

        return {
            "ad": patient.ad,
            "soyad": patient.soyad,
            "yas": age,
            "cinsiyet": patient.cinsiyet,
            "protokol_no": patient.protokol_no,
        }

    async def _get_condyloma_examinations(
        self, db: AsyncSession, patient_id: str
    ) -> List[Dict]:
        """Kondilom-ilişkili muayeneleri çek (tanı + metin filtreleme)."""
        stmt = (
            select(Muayene)
            .where(
                Muayene.hasta_id == patient_id,
                Muayene.is_deleted == False,
            )
            .order_by(Muayene.tarih.asc())
        )
        result = await db.execute(stmt)
        all_exams = result.scalars().all()

        condyloma_exams = []
        for exam in all_exams:
            diag_fields = [exam.tani1, exam.tani2, exam.tani3, exam.tani4, exam.tani5]
            icd_fields = [exam.tani1_kodu, exam.tani2_kodu, exam.tani3_kodu, exam.tani4_kodu, exam.tani5_kodu]
            text_fields = [exam.sikayet, exam.oyku, exam.tedavi, exam.fizik_muayene, exam.prosedur, exam.oneriler]

            is_condyloma = (
                any(_matches_condyloma(f) for f in diag_fields)
                or any(_matches_condyloma_icd(f) for f in icd_fields)
                or any(_matches_condyloma(f) for f in text_fields)
            )

            if is_condyloma:
                raw_dt = exam.tarih if isinstance(exam.tarih, datetime) else datetime.combine(exam.tarih, datetime.min.time()) if exam.tarih else exam.created_at
                condyloma_exams.append({
                    "raw_date": raw_dt,
                    "tarih": _format_date(exam.tarih),
                    "sikayet": exam.sikayet,
                    "oyku": exam.oyku,
                    "tedavi": exam.tedavi,
                    "fizik_muayene": exam.fizik_muayene,
                    "prosedur": exam.prosedur,
                    "tani": " | ".join(filter(None, diag_fields)),
                    "oneriler": exam.oneriler,
                    "aliskanliklar": exam.aliskanliklar,
                    "ozgecmis": exam.ozgecmis,
                })

        return condyloma_exams

    async def _get_condyloma_operations(
        self, db: AsyncSession, patient_id: str
    ) -> List[Dict]:
        """Kondilom-ilişkili operasyonları çek."""
        stmt = (
            select(Operasyon)
            .where(
                Operasyon.hasta_id == patient_id,
                Operasyon.is_deleted == False,
            )
            .order_by(Operasyon.tarih.asc())
        )
        result = await db.execute(stmt)
        all_ops = result.scalars().all()

        condyloma_ops = []
        for op in all_ops:
            search_fields = [op.ameliyat, op.notlar, op.pre_op_tani, op.post_op_tani, op.patoloji]
            is_condyloma = any(
                _matches_condyloma(f) or
                (f and any(kw in f.lower() for kw in CONDYLOMA_OPERATION_KEYWORDS))
                for f in search_fields
            )

            if is_condyloma:
                raw_dt = op.tarih if isinstance(op.tarih, datetime) else datetime.combine(op.tarih, datetime.min.time()) if op.tarih else op.created_at
                condyloma_ops.append({
                    "raw_date": raw_dt,
                    "tarih": _format_date(op.tarih),
                    "ameliyat": op.ameliyat,
                    "notlar": op.notlar,
                    "patoloji": op.patoloji,
                    "pre_op_tani": op.pre_op_tani,
                    "post_op_tani": op.post_op_tani,
                })

        return condyloma_ops

    async def _get_hpv_followups(
        self, db: AsyncSession, patient_id: str
    ) -> List[Dict]:
        """HPV-ilişkili takip notlarını çek."""
        stmt = (
            select(KlinikNot)
            .where(
                KlinikNot.hasta_id == patient_id,
                KlinikNot.is_deleted == False,
            )
            .order_by(KlinikNot.tarih.asc())
        )
        result = await db.execute(stmt)
        all_notes = result.scalars().all()

        hpv_notes = []
        for note in all_notes:
            tip = (note.tip or "").strip().upper()

            is_exact = tip in [t.upper() for t in HPV_FOLLOWUP_EXACT_TYPES]
            is_broad = (
                any(tip.startswith(t.upper()) for t in HPV_FOLLOWUP_BROAD_TYPES)
                and _matches_condyloma(note.icerik)
            )
            is_gardasil = "GARDASİL" in tip or "GARDASIL" in tip

            if is_exact or is_broad or is_gardasil:
                raw_dt = note.tarih if isinstance(note.tarih, datetime) else datetime.combine(note.tarih, datetime.min.time()) if note.tarih else note.created_at
                hpv_notes.append({
                    "raw_date": raw_dt,
                    "tarih": _format_date(note.tarih),
                    "tip": note.tip,
                    "icerik": note.icerik,
                    "etiketler": note.etiketler,
                })

        return hpv_notes

    async def _get_condyloma_reports(
        self, db: AsyncSession, patient_id: str
    ) -> List[Dict]:
        """Kondilom-ilişkili tıbbi müdahale raporlarını çek."""
        stmt = (
            select(TibbiMudahaleRaporu)
            .where(
                TibbiMudahaleRaporu.hasta_id == patient_id,
                TibbiMudahaleRaporu.is_deleted == False,
            )
            .order_by(TibbiMudahaleRaporu.tarih.asc())
        )
        result = await db.execute(stmt)
        all_reports = result.scalars().all()

        condyloma_reports = []
        for report in all_reports:
            search_fields = [report.islem_basligi, report.islem_detayi, report.sonuc_oneriler]
            if any(_matches_condyloma(f) for f in search_fields):
                raw_dt = report.tarih if isinstance(report.tarih, datetime) else datetime.combine(report.tarih, datetime.min.time()) if report.tarih else report.created_at
                condyloma_reports.append({
                    "raw_date": raw_dt,
                    "tarih": _format_date(report.tarih),
                    "islem_basligi": report.islem_basligi,
                    "islem_detayi": report.islem_detayi,
                    "sonuc_oneriler": report.sonuc_oneriler,
                })

        return condyloma_reports

    # ──────────────────────────────────────────────
    # PHASE 2: AI Analysis (Gemini)
    # ──────────────────────────────────────────────

    async def _get_api_client(self, db: AsyncSession):
        api_key = settings.GOOGLE_API_KEY
        if db:
            repo = SettingRepository(db)
            setting = await repo.get("google_api_key")
            if setting and setting.value:
                from app.core.security import decrypt_value
                api_key = decrypt_value(setting.value)

        if not api_key or not self._genai:
            raise ValueError("Gemini API yapılandırılmamış. Lütfen Ayarlar > Entegrasyonlar'dan API anahtarı kaydedin.")

        return self._genai.Client(api_key=api_key)

    async def _analyze_with_ai(
        self, context: Dict[str, Any], db: AsyncSession
    ) -> HPVBriefingResponse:
        """İlk tam analiz: Tüm verileri Gemini'ye gönderip yapılandırılmış özet al."""
        client = await self._get_api_client(db)
        prompt = self._build_prompt(context)

        config = self._genai_types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.1,
        )

        try:
            response = await asyncio.to_thread(
                client.models.generate_content,
                model="gemini-2.5-flash",
                contents=prompt,
                config=config,
            )

            if not response or not response.candidates:
                raise ValueError("Gemini yanıt üretmedi.")

            raw = self._parse_json_response(response.text)
            return self._build_response(raw, context)

        except Exception as e:
            logger.error(f"HPV Briefing AI analysis error: {e}", exc_info=True)
            raise ValueError(f"AI analizi sırasında hata oluştu: {str(e)}")

    async def _analyze_incremental_with_ai(
        self,
        previous_briefing: Dict[str, Any],
        new_context: Dict[str, Any],
        full_context: Dict[str, Any],
        db: AsyncSession,
    ) -> HPVBriefingResponse:
        """Artımlı Analiz (Memory): Önceki briefing özeti + sadece yeni eklenen kayıtları gönderir."""
        client = await self._get_api_client(db)
        prompt = self._build_incremental_prompt(previous_briefing, new_context)

        config = self._genai_types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.1,
        )

        try:
            response = await asyncio.to_thread(
                client.models.generate_content,
                model="gemini-2.5-flash",
                contents=prompt,
                config=config,
            )

            if not response or not response.candidates:
                raise ValueError("Gemini yanıt üretmedi.")

            raw = self._parse_json_response(response.text)
            return self._build_response(raw, full_context)

        except Exception as e:
            logger.error(f"HPV Briefing incremental AI analysis error: {e}", exc_info=True)
            raise ValueError(f"AI artımlı analizi sırasında hata oluştu: {str(e)}")

    def _format_records_section(self, context: Dict[str, Any]) -> str:
        """Kayıtları prompt için string bloklarına dönüştürür."""
        exams = context.get("examinations", [])
        ops = context.get("operations", [])
        followups = context.get("followups", [])
        med_reports = context.get("medical_reports", [])

        sections = []
        if exams:
            exam_texts = []
            for i, e in enumerate(exams, 1):
                parts = [f"### Muayene {i} — {e.get('tarih', '?')}"]
                if e.get('sikayet'): parts.append(f"Şikayet: {_truncate(e['sikayet'], 250)}")
                if e.get('oyku'): parts.append(f"Öykü: {_truncate(e['oyku'], 400)}")
                if e.get('fizik_muayene'): parts.append(f"Fizik Muayene: {_truncate(e['fizik_muayene'], 500)}")
                if e.get('tani'): parts.append(f"Tanı: {e['tani']}")
                if e.get('tedavi'): parts.append(f"Tedavi: {_truncate(e['tedavi'], 400)}")
                if e.get('prosedur'): parts.append(f"Prosedür: {_truncate(e['prosedur'], 400)}")
                if e.get('oneriler'): parts.append(f"Öneriler: {_truncate(e['oneriler'], 250)}")
                exam_texts.append("\n".join(parts))
            sections.append(f"## MUAYENELER ({len(exams)} adet)\n" + "\n\n".join(exam_texts))

        if ops:
            op_texts = []
            for i, o in enumerate(ops, 1):
                parts = [f"### Operasyon {i} — {o.get('tarih', '?')}"]
                if o.get('ameliyat'): parts.append(f"Ameliyat: {_truncate(o['ameliyat'], 200)}")
                if o.get('notlar'): parts.append(f"Notlar: {_truncate(o['notlar'], 600)}")
                if o.get('patoloji'): parts.append(f"Patoloji: {_truncate(o['patoloji'], 600)}")
                if o.get('pre_op_tani'): parts.append(f"Pre-op tanı: {o['pre_op_tani']}")
                if o.get('post_op_tani'): parts.append(f"Post-op tanı: {o['post_op_tani']}")
                op_texts.append("\n".join(parts))
            sections.append(f"## OPERASYONLAR ({len(ops)} adet)\n" + "\n\n".join(op_texts))

        if followups:
            fu_texts = []
            for i, f in enumerate(followups, 1):
                parts = [f"### Takip {i} — {f.get('tarih', '?')} [{f.get('tip', '')}]"]
                if f.get('icerik'): parts.append(f"İçerik: {_truncate(f['icerik'], 500)}")
                fu_texts.append("\n".join(parts))
            sections.append(f"## TAKİP NOTLARI ({len(followups)} adet)\n" + "\n\n".join(fu_texts))

        if med_reports:
            mr_texts = []
            for i, r in enumerate(med_reports, 1):
                parts = [f"### Tıbbi Müdahale {i} — {r.get('tarih', '?')}"]
                if r.get('islem_basligi'): parts.append(f"İşlem: {r['islem_basligi']}")
                if r.get('islem_detayi'): parts.append(f"Detay: {_truncate(r['islem_detayi'], 500)}")
                mr_texts.append("\n".join(parts))
            sections.append(f"## TIBBİ MÜDAHALE RAPORLARI ({len(med_reports)} adet)\n" + "\n\n".join(mr_texts))

        # SEC: KVKK - serbest metin alanlarında (personel tarafından yazılmış
        # olabilecek) TC kimlik/telefon varsa Gemini'ye gitmeden maskele.
        return mask_identifiers("\n\n".join(sections))

    def _build_prompt(self, context: Dict[str, Any]) -> str:
        """Gemini için tam analiz promptu oluştur."""
        patient = context["patient"]
        exams = context["examinations"]

        latest_ozgecmis = next((e.get('ozgecmis') for e in reversed(exams) if e.get('ozgecmis')), None)
        latest_aliskanliklar = next((e.get('aliskanliklar') for e in reversed(exams) if e.get('aliskanliklar')), None)

        sections = []
        # SEC: KVKK - hasta ad/soyad Gemini'ye (üçüncü taraf bulut API) gitmez.
        # Klinik analiz görevi (partner/sigara durumu, nüks, tedavi haritası
        # vb.) isim bilgisine ihtiyaç duymuyor.
        demo_parts = [
            "## HASTA DEMOGRAFİK BİLGİLERİ",
            f"- Yaş: {patient.get('yas', 'Bilinmiyor')}",
            f"- Cinsiyet: {patient.get('cinsiyet', 'Bilinmiyor')}"
        ]
        if latest_ozgecmis:
            demo_parts.append(f"- Özgeçmiş: {mask_identifiers(latest_ozgecmis)}")
        if latest_aliskanliklar:
            demo_parts.append(f"- Alışkanlıklar: {mask_identifiers(latest_aliskanliklar)}")
        sections.append("\n".join(demo_parts))

        records_text = self._format_records_section(context)
        if records_text:
            sections.append(records_text)

        context_text = "\n\n".join(sections)

        return f"""Sen bir üroloji kliniğinde çalışan deneyimli bir klinisyen asistanısın.
Aşağıda bir HPV/Kondilom hastasının TÜM klinik kayıtları verilmiştir.
Bu verileri analiz ederek YAPILANDIRILMIŞ bir JSON briefing oluştur.

## TALİMATLAR

1. **Partner Durumu**: SADECE muayene ve takip notlarından hastanın partner durumunu çıkar (Evli, Bekâr, Partneri var, Bilgi yok). Medeni hal verisini dikkate alma.
2. **Sigara Durumu**: Sadece alışkanlıklar alanına bakma; öykü ve takip notlarındaki sigara bilgisini de kullan (örn: "bıraktı", "azalttı", "devam ediyor").
3. **Nüks Analizi**: İlk tanıdan/tedaviden sonraki her yeni tedavi/lezyon bir nükstür. Nüksleri takip ve muayene notlarındaki tedavilere (lazer, kriyoterapi) göre bul. Aralıkları hesapla. Trendi belirle (azalıyor/artıyor/stabil).
4. **Tedavi Haritası**: Muayenelerin TEDAVİ/PLAN alanlarını ve TAKİP NOTLARINI analiz et (işlemler genellikle operasyonlar yerine burada "lazer", "kriyoterapi" şeklinde geçer):
   - Fizik muayene ve notlardan lezyon boyutunu (küçük <5mm, orta 5-10mm, büyük >10mm) bul.
   - Lezyon tipi (tekil, multipl, çoklu, çok sayıda vb.)
   - Lokasyon
   - Uygulanan yöntem (kriyoterapi, lazer vb.)
5. **Aşı Durumu**: GARDASİL doz tarihlerini (1., 2., 3. doz) ve genel aşı durumunu notlardan çıkar.
6. **Medikal Tedavi / İlaç & Takviyeler**: Hastanın muayene (tedavi/reçete/öneriler) ve takip notlarında hastaya başlanan/verilen/önerilen takviye edici veya bağışıklık güçlendirici ilaçları analiz et:
   - Örnekler: VELP, AHCC, Silvershell, Time Health, DeflaGyn, Papilocare, Çinko, İmmuneks, Beta Glukan, Propolis vb.
   - İlaç/takviye verildiyse `ilac_verildi: true` yap, verilen ilaçların isimlerini `ilaclar` dizisine ekle.
   - Kullanım şekli (günlük doz, süre vb.) varsa `kullanim_sekli` alanına yaz.
   - Ek notları `notlar` alanına yaz.
7. **Önemli Notlar**: Klinik açıdan dikkat çekici noktaları yaz.
8. **Risk Faktörleri**: Sigara, çoklu partner, vb.

## ÇIKTI FORMATI (JSON)

Aşağıdaki yapıda **sadece JSON** döndür, markdown veya açıklama ekleme:

{{
  "partner_durumu": "...",
  "sigara_durumu": "...",
  "ilk_basvuru_tarihi": "DD.MM.YYYY",
  "ilk_tani_tarihi": "DD.MM.YYYY",
  "ilk_operasyon_tarihi": "DD.MM.YYYY veya null",
  "nuks": {{
    "toplam_nuks": 0,
    "nuks_tarihleri": ["DD.MM.YYYY", ...],
    "ortalama_aralik_gun": 0.0,
    "trend": "azalıyor|artıyor|stabil|yetersiz_veri"
  }},
  "tedavi_haritasi": [
    {{
      "tarih": "DD.MM.YYYY",
      "boyut_tahmini": "küçük (<5mm) | orta (5-10mm) | büyük (>10mm) | bilinmiyor",
      "lezyon_tipi": "tekil | multipl | bilinmiyor",
      "lokasyon": "...",
      "tedavi_yontemi": "...",
      "notlar": "..."
    }}
  ],
  "asi_durumu": {{
    "gardasil_doz1": "DD.MM.YYYY veya null",
    "gardasil_doz2": "DD.MM.YYYY veya null",
    "gardasil_doz3": "DD.MM.YYYY veya null",
    "tamamlandi": false,
    "notlar": "..."
  }},
  "medikal_tedavi": {{
    "ilac_verildi": false,
    "ilaclar": ["VELP", "AHCC", ...],
    "kullanim_sekli": "...",
    "notlar": "..."
  }},
  "onemli_notlar": ["...", "..."],
  "risk_faktorleri": ["...", "..."]
}}

## HASTA KLİNİK KAYITLARI

{context_text}"""

    def _build_incremental_prompt(
        self, previous_briefing: Dict[str, Any], new_context: Dict[str, Any]
    ) -> str:
        """Artımlı güncelleme için optimize edilmiş prompt oluşturur."""
        patient = new_context["patient"]
        prev_briefing_clean = {
            "partner_durumu": previous_briefing.get("partner_durumu"),
            "sigara_durumu": previous_briefing.get("sigara_durumu"),
            "ilk_basvuru_tarihi": previous_briefing.get("ilk_basvuru_tarihi"),
            "ilk_tani_tarihi": previous_briefing.get("ilk_tani_tarihi"),
            "ilk_operasyon_tarihi": previous_briefing.get("ilk_operasyon_tarihi"),
            "nuks": previous_briefing.get("nuks"),
            "tedavi_haritasi": previous_briefing.get("tedavi_haritasi"),
            "asi_durumu": previous_briefing.get("asi_durumu"),
            "medikal_tedavi": previous_briefing.get("medikal_tedavi"),
            "onemli_notlar": previous_briefing.get("onemli_notlar"),
            "risk_faktorleri": previous_briefing.get("risk_faktorleri"),
        }

        prev_json_str = json.dumps(prev_briefing_clean, ensure_ascii=False, indent=2)
        new_records_text = self._format_records_section(new_context)

        return f"""Sen bir üroloji kliniğinde çalışan deneyimli bir klinisyen asistanısın.
Bu hasta için daha önce oluşturulmuş bir HPV/Kondilom klinik briefing özeti mevcuttur (HAFIZA / MEMORY).
Aşağıda hastanın ÖNCEKİ BRİEFİNG ÖZETİ ve bu özetten sonra kliniğimize yansıyan YENİ KLİNİK KAYITLAR verilmiştir.

GÖREVİN:
Önceki briefing özetini temel alarak, sadece yeni klinik kayıtlardaki bilgileri mevcut özete EKLE / GÜNCELLE.
- Eğer yeni bir tedavi/lezyon varsa tedavi_haritasi listesine ekle ve nüks analizini (nuks_tarihleri, toplam_nuks, ortalama aralık, trend) güncelle.
- Eğer aşı yapılmışsa veya aşı dozu bilgisi varsa asi_durumu alanını güncelle.
- Eğer hastaya yeni ilaç, takviye veya bağışıklık güçlendirici (VELP, AHCC, Silvershell, Time Health vb.) başlandıysa veya değiştirildiyse medikal_tedavi alanını güncelle.
- Sigara veya partner durumunda bir değişim varsa güncelle.
- Önemli notları ve risk faktörlerini yeni bilgiler ışığında zenginleştir.
- Tüm geçmiş kayıtları koru ve üzerine yeni kayıtları entegre et.

## HASTA BİLGİSİ
- Yaş: {patient.get('yas', 'Bilinmiyor')}
- Cinsiyet: {patient.get('cinsiyet', 'Bilinmiyor')}

## ÖNCEKİ BRİEFİNG ÖZETİ (HAFIZA)
```json
{prev_json_str}
```

## YENİ EKLENEN KLİNİK KAYITLAR
{new_records_text}

## ÇIKTI FORMATI (JSON)
Sadece güncellenmiş eksiksiz JSON nesnesini döndür:
{{
  "partner_durumu": "...",
  "sigara_durumu": "...",
  "ilk_basvuru_tarihi": "DD.MM.YYYY",
  "ilk_tani_tarihi": "DD.MM.YYYY",
  "ilk_operasyon_tarihi": "DD.MM.YYYY veya null",
  "nuks": {{
    "toplam_nuks": 0,
    "nuks_tarihleri": ["DD.MM.YYYY", ...],
    "ortalama_aralik_gun": 0.0,
    "trend": "azalıyor|artıyor|stabil|yetersiz_veri"
  }},
  "tedavi_haritasi": [
    {{
      "tarih": "DD.MM.YYYY",
      "boyut_tahmini": "küçük (<5mm) | orta (5-10mm) | büyük (>10mm) | bilinmiyor",
      "lezyon_tipi": "tekil | multipl | bilinmiyor",
      "lokasyon": "...",
      "tedavi_yontemi": "...",
      "notlar": "..."
    }}
  ],
  "asi_durumu": {{
    "gardasil_doz1": "DD.MM.YYYY veya null",
    "gardasil_doz2": "DD.MM.YYYY veya null",
    "gardasil_doz3": "DD.MM.YYYY veya null",
    "tamamlandi": false,
    "notlar": "..."
  }},
  "medikal_tedavi": {{
    "ilac_verildi": false,
    "ilaclar": ["VELP", "AHCC", ...],
    "kullanim_sekli": "...",
    "notlar": "..."
  }},
  "onemli_notlar": ["...", "..."],
  "risk_faktorleri": ["...", "..."]
}}"""

    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Parse JSON from Gemini response."""
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group())
                except Exception:
                    pass
            logger.error(f"Failed to parse AI response: {text[:500]}")
            # SEC/DATA-INTEGRITY: sessizce {} dönmek, aşağıda tüm alanları
            # varsayılan/boş değerlerle "geçerliymiş gibi görünen" bir
            # briefing üretip cache'e yazılmasına yol açardı. Bunun yerine
            # açıkça hata fırlat — çağıran zaten ValueError'a sarıp 400
            # döndürüyor (bkz. _analyze_with_ai / _analyze_incremental_with_ai).
            raise ValueError("AI yanıtı geçerli JSON olarak ayrıştırılamadı.")

    def _build_response(
        self, ai_data: Dict[str, Any], context: Dict[str, Any]
    ) -> HPVBriefingResponse:
        """AI yanıtını ve context'i birleştirerek son response'u oluştur."""
        patient = context["patient"]

        # Parse nüks data
        nuks_data = ai_data.get("nuks", {})
        nuks = NuksAnalizi(
            toplam_nuks=nuks_data.get("toplam_nuks", 0),
            nuks_tarihleri=nuks_data.get("nuks_tarihleri", []),
            ortalama_aralik_gun=nuks_data.get("ortalama_aralik_gun"),
            trend=nuks_data.get("trend", "yetersiz_veri"),
        )

        # Parse tedavi haritası
        tedavi_list = []
        for t in ai_data.get("tedavi_haritasi", []):
            tedavi_list.append(TedaviKaydi(
                tarih=t.get("tarih", "?"),
                boyut_tahmini=t.get("boyut_tahmini"),
                lezyon_tipi=t.get("lezyon_tipi"),
                lokasyon=t.get("lokasyon"),
                tedavi_yontemi=t.get("tedavi_yontemi", "Bilinmiyor"),
                notlar=t.get("notlar"),
            ))

        # Parse aşı durumu
        asi_raw = ai_data.get("asi_durumu", {})
        asi = AsiDurumu(
            gardasil_doz1=asi_raw.get("gardasil_doz1"),
            gardasil_doz2=asi_raw.get("gardasil_doz2"),
            gardasil_doz3=asi_raw.get("gardasil_doz3"),
            tamamlandi=asi_raw.get("tamamlandi", False),
            notlar=asi_raw.get("notlar"),
        )

        # Calculate takip süresi
        takip_suresi = None
        all_dates = []
        for e in context.get("examinations", []):
            if e.get("tarih"):
                try:
                    all_dates.append(datetime.strptime(e["tarih"], "%d.%m.%Y"))
                except ValueError:
                    pass
        for o in context.get("operations", []):
            if o.get("tarih"):
                try:
                    all_dates.append(datetime.strptime(o["tarih"], "%d.%m.%Y"))
                except ValueError:
                    pass
        if all_dates:
            span = max(all_dates) - min(all_dates)
            takip_suresi = max(1, span.days // 30)

        # Parse medikal tedavi / takviye ilaçları
        med_raw = ai_data.get("medikal_tedavi", {})
        medikal_tedavi = MedikalTedavi(
            ilac_verildi=med_raw.get("ilac_verildi", False),
            ilaclar=med_raw.get("ilaclar", []),
            kullanim_sekli=med_raw.get("kullanim_sekli"),
            notlar=med_raw.get("notlar"),
        )

        return HPVBriefingResponse(
            yas=patient.get("yas"),
            cinsiyet=patient.get("cinsiyet"),
            partner_durumu=ai_data.get("partner_durumu", "Bilgi yok"),
            sigara_durumu=ai_data.get("sigara_durumu", "Bilgi yok"),
            ilk_basvuru_tarihi=ai_data.get("ilk_basvuru_tarihi"),
            ilk_tani_tarihi=ai_data.get("ilk_tani_tarihi"),
            ilk_operasyon_tarihi=ai_data.get("ilk_operasyon_tarihi"),
            toplam_operasyon_sayisi=len(context.get("operations", [])),
            takip_suresi_ay=takip_suresi,
            nuks=nuks,
            tedavi_haritasi=tedavi_list,
            asi_durumu=asi,
            medikal_tedavi=medikal_tedavi,
            onemli_notlar=ai_data.get("onemli_notlar", []),
            risk_faktorleri=ai_data.get("risk_faktorleri", []),
            created_at=datetime.now().strftime("%d.%m.%Y %H:%M"),
            data_sources_count={
                "muayene": len(context.get("examinations", [])),
                "operasyon": len(context.get("operations", [])),
                "takip": len(context.get("followups", [])),
                "tibbi_mudahale": len(context.get("medical_reports", [])),
            },
        )
