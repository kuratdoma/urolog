"""
AI Scribe Service - UroLog EMR Entegrasyonu
Ses kaydından klinik not oluşturan yapay zeka servisi.
Refactored to use Adapter Pattern (VoiceProvider, LLMProvider).
"""

import re
import time
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import RetryError
from app.repositories.setting_repository import SettingRepository
from app.core.pii_scrubber import mask_identifiers

from app.core.config import settings
from app.schemas.ai_scribe import AIScribeRequest, AIScribeResponse, AIScribeMode
from app.core.ai.providers.gemini_provider import GeminiProvider
from app.core.ai.providers.local_provider import LocalVoiceProvider, LocalLLMProvider
from app.core.ai.providers.google_speech_provider import GoogleSTTProvider

logger = logging.getLogger(__name__)

# Templates directory
TEMPLATES_DIR = Path(__file__).parent.parent.parent / "static" / "ai_scribe_templates"


class AIScribeService:
    """AI Scribe servis sınıfı - Gemini, Local ve Hybrid mod desteği"""

    def __init__(self):
        # Initialize Providers
        self.gemini_provider = GeminiProvider(
            api_key=settings.GOOGLE_API_KEY, model_name=settings.AI_SCRIBE_MODEL
        )

        self.local_voice_provider = LocalVoiceProvider(
            endpoint=settings.LOCAL_WHISPER_ENDPOINT
        )

        self.local_llm_provider = LocalLLMProvider(
            endpoint=settings.LOCAL_LLM_ENDPOINT, model=settings.LOCAL_LLM_MODEL
        )

        self.google_stt_provider = GoogleSTTProvider(api_key=settings.GOOGLE_API_KEY)

        # Templates cache
        self._templates_cache: Dict[str, str] = {}
        self._load_templates()

    def _load_templates(self) -> None:
        """Load templates from the templates directory"""
        if not TEMPLATES_DIR.exists():
            logger.warning(f"Templates directory not found: {TEMPLATES_DIR}")
            return

        count = 0
        for template_file in TEMPLATES_DIR.iterdir():
            if template_file.is_dir() or template_file.name.startswith("."):
                continue

            template_name = (
                template_file.stem if template_file.suffix else template_file.name
            )
            try:
                content = template_file.read_text(encoding="utf-8")
                self._templates_cache[template_name] = content
                count += 1
            except Exception as e:
                logger.error(f"Template load failed for {template_name}: {e}")

        logger.info(f"AI Scribe: {count} templates loaded")

    def get_available_templates(self) -> List[Dict[str, str]]:
        """Return list of available templates"""
        return [
            {"id": name, "name": name, "description": f"Template: {name}"}
            for name in sorted(self._templates_cache.keys())
        ]

    def is_gemini_available(self) -> bool:
        return self.gemini_provider.is_available()

    async def check_local_services(self) -> Dict[str, bool]:
        """Health check for local AI services"""
        whisper_ok = await self.local_voice_provider.health_check()
        ollama_ok = await self.local_llm_provider.health_check()
        return {"whisper": whisper_ok, "ollama": ollama_ok}

    async def _ensure_api_key(self, db: AsyncSession):
        """Fetch the latest Google API key from the database and update providers"""
        if not db:
            return
        repo = SettingRepository(db)
        setting = await repo.get("google_api_key")
        if setting and setting.value:
            from app.core.security import decrypt_value
            decrypted_key = decrypt_value(setting.value)
            self.gemini_provider.update_api_key(decrypted_key)
            self.google_stt_provider.update_api_key(decrypted_key)

    async def analyze_consultation(
        self,
        audio_bytes: bytes,
        mime_type: str,
        request: AIScribeRequest,
        protocol_no: Optional[str] = None,
        db: Optional[AsyncSession] = None,
    ) -> AIScribeResponse:
        """Main analysis method for AUDIO"""

        if db:
            await self._ensure_api_key(db)

        start_time = time.time()
        logger.info(
            f"Starting AI Scribe analysis - mode: {request.mode}, size: {len(audio_bytes)} bytes"
        )

        transcript = None
        raw_data = {}
        mode_used = request.mode

        try:
            # 1. Voice Processing Phase
            if request.mode == AIScribeMode.GEMINI:
                # Multimodal - Direct Audio to JSON
                if not self.gemini_provider.is_available():
                    raise ValueError("Google Gemini API is not configured.")

                template_prompt = self._build_template_prompt(request.template, getattr(request, "persona", "default"))
                raw_data = await self.gemini_provider.analyze_audio(
                    audio_bytes, mime_type, template_prompt
                )

            else:
                # Step 1: Transcribe
                if request.mode == AIScribeMode.LOCAL:
                    transcript = await self.local_voice_provider.transcribe(
                        audio_bytes, mime_type
                    )
                elif request.mode in [
                    AIScribeMode.HYBRID_GOOGLE_LOCAL,
                    AIScribeMode.HYBRID_GOOGLE_GEMINI,
                ]:
                    transcript = await self.google_stt_provider.transcribe(
                        audio_bytes, mime_type
                    )
                else:
                    raise ValueError(f"Unknown mode: {request.mode}")

                # Step 2: Intelligence Phase
                template_prompt = self._build_template_prompt(request.template, getattr(request, "persona", "default"))

                if (
                    request.mode == AIScribeMode.LOCAL
                    or request.mode == AIScribeMode.HYBRID_GOOGLE_LOCAL
                ):
                    raw_data = await self.local_llm_provider.analyze_text(
                        transcript, template_prompt
                    )
                elif request.mode == AIScribeMode.HYBRID_GOOGLE_GEMINI:
                    if not self.gemini_provider.is_available():
                        raise ValueError(
                            "Google Gemini API is not available/configured for Hybrid mode."
                        )
                    raw_data = await self.gemini_provider.analyze_text(
                        transcript, template_prompt
                    )

            # Post-Processing
            if request.include_transcript and transcript:
                raw_data["transcript"] = transcript

            result = self._build_response(raw_data, mode_used, start_time)
            logger.info(
                f"AI Scribe analysis completed in {result.processing_time_seconds}s"
            )
            self._log_call_metric("audio", mode_used, request.mode, start_time, True)
            return result

        except Exception as e:
            self._log_call_metric("audio", mode_used, request.mode, start_time, False)
            self._handle_analysis_error(e)
            raise

    async def analyze_text(
        self, text: str, request: AIScribeRequest, db: Optional[AsyncSession] = None
    ) -> AIScribeResponse:
        """Main analysis method for TEXT"""

        if db:
            await self._ensure_api_key(db)

        start_time = time.time()
        logger.info(
            f"Starting AI Scribe TEXT analysis - mode: {request.mode}, length: {len(text)} chars"
        )

        # Pre-process: Scrub PII from input text
        scrubbed_text = self._sanitize_data(text)
        mode_used = request.mode

        try:
            template_prompt = self._build_template_prompt(request.template, getattr(request, "persona", "default"))

            # Intelligence Selection
            if (
                request.mode == AIScribeMode.GEMINI
                or request.mode == AIScribeMode.HYBRID_GOOGLE_GEMINI
            ):
                if not self.gemini_provider.is_available():
                    raise ValueError("Google Gemini API is not configured.")
                try:
                    raw_data = await self.gemini_provider.analyze_text(
                        scrubbed_text, template_prompt
                    )
                except Exception as gemini_err:
                    if self._is_quota_exceeded(gemini_err):
                        # Graceful degradation: quota dolduğunda kullanıcıyı
                        # hatayla durdurmak yerine yerel modele düş.
                        logger.warning(
                            "Gemini quota exceeded, falling back to LOCAL mode for text analysis"
                        )
                        mode_used = AIScribeMode.LOCAL
                        raw_data = await self.local_llm_provider.analyze_text(
                            scrubbed_text, template_prompt
                        )
                    else:
                        raise
            elif (
                request.mode == AIScribeMode.LOCAL
                or request.mode == AIScribeMode.HYBRID_GOOGLE_LOCAL
            ):
                raw_data = await self.local_llm_provider.analyze_text(
                    scrubbed_text, template_prompt
                )
            else:
                # Default fallback or error?
                # Assume user meant Local if they sent Local mode, or Error.
                raise ValueError(f"Unsupported mode for text analysis: {request.mode}")

            result = self._build_response(raw_data, mode_used, start_time)
            self._log_call_metric("text", mode_used, request.mode, start_time, True)
            return result

        except Exception as e:
            self._log_call_metric("text", mode_used, request.mode, start_time, False)
            self._handle_analysis_error(e)
            raise

    async def polish_letter(
        self,
        draft_text: str,
        mode: AIScribeMode = AIScribeMode.GEMINI,
        db: Optional[AsyncSession] = None,
    ) -> Dict[str, Any]:
        """Fix grammar/flow/redundancy in an already-composed consultation
        letter draft (free-text fields stitched into template sentences).
        Does NOT generate or alter clinical content — same quota-fallback
        pattern as analyze_text."""
        if db:
            await self._ensure_api_key(db)

        start_time = time.time()
        scrubbed_text = self._sanitize_data(draft_text)
        prompt = self._build_polish_prompt()
        mode_used = mode

        try:
            if mode in (AIScribeMode.GEMINI, AIScribeMode.HYBRID_GOOGLE_GEMINI):
                if not self.gemini_provider.is_available():
                    raise ValueError("Google Gemini API is not configured.")
                try:
                    raw_data = await self.gemini_provider.analyze_text(scrubbed_text, prompt)
                except Exception as gemini_err:
                    if self._is_quota_exceeded(gemini_err):
                        logger.warning(
                            "Gemini quota exceeded, falling back to LOCAL mode for letter polish"
                        )
                        mode_used = AIScribeMode.LOCAL
                        raw_data = await self.local_llm_provider.analyze_text(
                            scrubbed_text, prompt
                        )
                    else:
                        raise
            else:
                raw_data = await self.local_llm_provider.analyze_text(scrubbed_text, prompt)

            polished_text = raw_data.get("polished_text") if isinstance(raw_data, dict) else None
            if not polished_text:
                raise ValueError("AI düzenlenmiş metin üretemedi.")

            fact_drift = self._detect_fact_drift(draft_text, polished_text)
            if fact_drift:
                logger.warning(
                    "Letter polish: possible fact drift detected (a numeric token from the "
                    "draft — dose/date/result — is missing from the polished text)"
                )

            self._log_call_metric("letter_polish", mode_used, mode, start_time, True)
            return {
                "polished_text": polished_text,
                "mode_used": mode_used,
                "fact_drift_warning": fact_drift,
            }
        except Exception as e:
            self._log_call_metric("letter_polish", mode_used, mode, start_time, False)
            self._handle_analysis_error(e)
            raise

    _DIGIT_TOKEN_RE = re.compile(r"\d+(?:[.,]\d+)?")

    def _detect_fact_drift(self, original: str, polished: str) -> bool:
        """Heuristic safety net for the polish task: the prompt forbids the
        LLM from touching clinical facts, but that's a prompt-level promise,
        not a guarantee. A missing numeric token (dose, lab value, date,
        ICD-code digits) between draft and polished text is a cheap,
        reliable signal that something more than grammar changed — worth
        surfacing to the doctor even though it can't catch a non-numeric
        drift (e.g. a swapped drug name)."""
        original_numbers = set(self._DIGIT_TOKEN_RE.findall(original))
        polished_numbers = set(self._DIGIT_TOKEN_RE.findall(polished))
        return not original_numbers.issubset(polished_numbers)

    def _build_polish_prompt(self) -> str:
        """Prompt for the letter-polish task: grammar/flow only, no
        clinical-content generation, so a JSON-editor's rewrite can't drift
        the letter's medical facts."""
        return """Sen tıbbi metinleri düzenleyen kıdemli bir tıbbi editörsün. Sana bir konsültasyon mektubu taslağı verilecek. Görevin SADECE dil bilgisi, cümle akışı ve tekrarları düzeltmektir.

## KESİN KURALLAR:
1. Hiçbir tıbbi bilgi, tanı, ilaç adı, sayı, tarih, isim veya unvan EKLEME, ÇIKARMA ya da DEĞİŞTİRME.
2. Sadece cümle yapısını, bağlaçları ve tekrar eden ifadeleri düzelt (örn: kelime tekrarları, çakışan fiil ekleri, bozuk cümle kurulumu).
3. Mektubun paragraf sırasını, etiketlerini (örn: "Şikayet:", "Öykü:") ve genel yapısını (selamlama ile başlama, "Saygılarımla," ile bitme) KORU.
4. Resmi, profesyonel hekim diliyle yaz. Emoji, madde işareti veya yorum ekleme.
5. SADECE aşağıdaki JSON formatında yanıt ver, başka hiçbir açıklama ekleme:
{"polished_text": "<düzenlenmiş tam mektup metni>"}
"""

    def _normalize_symptoms_in_place(self, data: Dict[str, Any]):
        """Helper to normalize symptom fields in a dictionary"""
        symptom_fields = [
            "disuri",
            "pollakiuri",
            "nokturi",
            "hematuri",
            "genital_akinti",
            "kabizlik",
            "catallanma",
            "projeksiyon_azalma",
            "kalibre_incelme",
            "idrar_bas_zorluk",
            "kesik_idrar_yapma",
            "terminal_damlama",
            "residiv_hissi",
            "inkontinans",
        ]
        for field, value in data.items():
            if isinstance(value, list) and field != "extracted_keywords":
                data[field] = ", ".join(map(str, value))

            if field in symptom_fields:
                data[field] = self._normalize_symptom(data[field])

    def _normalize_symptom(self, value: Any) -> Optional[str]:
        """Normalize symptom values to VAR/YOK/BAZEN"""
        if not value:
            return None
        v = str(value).upper().strip()

        if any(
            x in v
            for x in ["VAR", "MEVCUT", "EVET", "POZİTİF", "TRUE", "1", "YES", "PRESENT"]
        ):
            return "VAR"
        if any(
            x in v
            for x in ["BAZEN", "ARA SIRA", "NADİREN", "OCCASIONALLY", "SOMETIMES"]
        ):
            return "BAZEN"
        if any(
            x in v
            for x in ["YOK", "DEĞİL", "HAYIR", "NEGATİF", "FALSE", "0", "NO", "ABSENT"]
        ):
            return "YOK"

        return None

    # SEC: KVKK - üçüncü taraf (Gemini) API'sine gitmeden önce doğrudan
    # kimliklendirici verileri maskele. Regex tabanlı, best-effort bir
    # koruma; genel bir NER çözümü değildir. TC kimlik/telefon regex'leri
    # app/core/pii_scrubber.py'de paylaşılıyor (hpv_briefing_service.py da
    # kullanıyor).
    _NAME_AFTER_HASTA_RE = re.compile(
        r"(?<=\bHasta\s)[A-ZÇĞİÖŞÜ][a-zçğıöşüA-ZÇĞİÖŞÜ]*(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşüA-ZÇĞİÖŞÜ]*)+"
    )

    def _build_response(
        self, raw_data: Dict[str, Any], mode_used: AIScribeMode, start_time: float
    ) -> AIScribeResponse:
        """Shared post-process pipeline for both audio and text analysis:
        sanitize -> normalize symptoms -> filter to known fields -> build
        the Pydantic response, with a safe fallback if validation fails."""
        sanitized_data = self._sanitize_data(raw_data)
        self._normalize_symptoms_in_place(sanitized_data)

        valid_fields = AIScribeResponse.model_fields.keys()
        filtered_data = {
            k: v for k, v in sanitized_data.items() if k in valid_fields
        }

        try:
            result = AIScribeResponse(mode_used=mode_used, **filtered_data)
            result.processing_time_seconds = round(time.time() - start_time, 2)
            return result
        except Exception as validation_error:
            logger.error(f"Pydantic validation failed: {validation_error}")
            return AIScribeResponse(
                mode_used=mode_used,
                processing_time_seconds=round(time.time() - start_time, 2),
                clinical_note=f"Veri doğrulama hatası oluştu. Ham veri: {str(sanitized_data)[:500]}",
            )

    def _sanitize_text(self, text: str) -> str:
        text = mask_identifiers(text)
        text = self._NAME_AFTER_HASTA_RE.sub("[NAME_MASKED]", text)
        return text

    def _sanitize_data(self, data: Any) -> Any:
        """Clean sensitive data (PII) before it leaves the process / hits a
        third-party LLM provider. Recurses through dicts/lists; masks
        strings in place."""
        if isinstance(data, str):
            return self._sanitize_text(data)
        if isinstance(data, dict):
            return {k: self._sanitize_data(v) for k, v in data.items()}
        if isinstance(data, list):
            return [self._sanitize_data(v) for v in data]
        return data

    def _log_call_metric(
        self,
        analysis_type: str,
        mode_used: AIScribeMode,
        requested_mode: AIScribeMode,
        start_time: float,
        success: bool,
    ) -> None:
        """Structured log line for AI Scribe call observability (call
        volume, cost driver, latency, fallback rate) — consumable by any
        log-based metrics/alerting pipeline without a new dependency."""
        logger.info(
            "ai_scribe_call",
            extra={
                "event": "ai_scribe_call",
                "analysis_type": analysis_type,
                "requested_mode": requested_mode.value if hasattr(requested_mode, "value") else str(requested_mode),
                "mode_used": mode_used.value if hasattr(mode_used, "value") else str(mode_used),
                "fell_back": requested_mode != mode_used,
                "duration_ms": round((time.time() - start_time) * 1000),
                "success": success,
            },
        )

    def _is_quota_exceeded(self, e: Exception) -> bool:
        """Detects a Gemini quota/rate-limit error, unwrapping tenacity's
        RetryError (analyze_text/analyze_audio are @retry-decorated, so a
        persistent quota error surfaces wrapped after retries exhaust)."""
        if isinstance(e, RetryError):
            underlying = e.last_attempt.exception() if e.last_attempt else None
            if underlying is None:
                return False
            e = underlying
        error_str = str(e).lower()
        return "resourceexhausted" in error_str or "quota" in error_str or "rate" in error_str

    def _handle_analysis_error(self, e: Exception):
        """Standardized error handling"""
        error_str = str(e).lower()
        if (
            "resourceexhausted" in error_str
            or "quota" in error_str
            or "rate" in error_str
        ):
            logger.error(f"AI Scribe quota exceeded: {e}")
            raise ValueError("Google Gemini API kota sınırına ulaşıldı.")
        elif "403" in error_str or "forbidden" in error_str:
            logger.error(f"AI Scribe API permission error: {e}")
            raise ValueError("Google Gemini API erişim hatası.")
        elif "invalid" in error_str and "key" in error_str:
            logger.error(f"AI Scribe invalid API key: {e}")
            raise ValueError("Geçersiz API key.")
        else:
            logger.error(f"AI Scribe analysis failed: {e}", exc_info=True)

    def _build_template_prompt(self, template_name: Optional[str] = None, persona: str = "default") -> str:
        """Build prompt with template and intelligent extraction hints"""
        template_content = ""
        template_hint = ""

        if template_name and template_name in self._templates_cache:
            template_content = self._templates_cache[template_name]

            # Dynamic Hints based on Template Name
            t_name_lower = template_name.lower()
            if "prostat" in t_name_lower:
                template_hint = "- Prostat spesifik verileri (PSA, Gleason, Prostat Hacmi) 'clinical_note' içinde detaylandır ve 'extracted_keywords' listesine ekle.\n- Günlük ped sayısını (inkontinans durumu) mutlaka belirt."
            elif "taş" in t_name_lower or "kidney" in t_name_lower:
                template_hint = "- Taş boyutlarını (mm), yerleşim yerini ve Hounsfield (HU) değerlerini 'extracted_keywords'e ekle.\n- Düşürme öyküsü varsa belirt."
            elif "mesane" in t_name_lower:
                template_hint = (
                    "- Hematüri durumunu ve sistoskopi bulgularını öne çıkar."
                )
            elif "cinsel" in t_name_lower or "erektil" in t_name_lower:
                template_hint = "- IIEF skorlarını veya ereksiyon kalitesini (EHS) mutlaka değerlendir."

        default_template = """
ANA ŞİKAYET:
[Hastanın başvuru nedenlerini akıcı ve açıklayıcı bir formatta belgeleyin.] (Bahsedilmemişse atlayın.)

HİKAYE (HPI):
[Mevcut durumu ve bahsedilen semptomları tanımlayın.] (Bahsedilmemişse atlayın.)

ÖZGEÇMİŞ / SOYGEÇMİŞ / İLAÇLAR:
[İlgili öyküyü ve ilaçları özetleyin.] (Bahsedilmemişse atlayın.)

DEĞERLENDİRME VE PLAN:
[Klinik durumun özeti ve gelecek yönetim adımları.]
"""
        used_template = template_content if template_content else default_template

        return f"""Sen 25 yıllık deneyime sahip kıdemli bir Üroloji Uzmanısın (Profesör düzeyinde).
Türkiye'nin önde gelen üniversite hastanelerinde binlerce hasta değerlendirdin.

## GÖREV:
Ses kaydını dinle ve klinik verileri JSON formatında çıkar.
Bir üroloji uzmanı gözüyle değerlendir ve ICD-10 tanı kodları öner.

## DİL KURALI (KRİTİK):
- TÜM çıktı TÜRKÇE olmalıdır.
- "25 yıllık deneyime sahip Üroloji Uzmanı olarak...", "Bir doktor olarak..." gibi kendini tanıtan ifadelerle ASLA başlama.
- Resmi tıbbi Türkçe terminoloji kullan (Örn: "Ağrısı var" yerine "Ağrı tariflemekte", "Gelmiş" yerine "Başvurdu", "Oldu" yerine "Gözlendi/Saptandı").
- "Mış/Miş", "Gelmiş", "Gidilmiş" gibi rivayet kiplerini ASLA KULLANMA. Bu not bir hekimin kendi gözlemidir.
- Kesin geçmiş zaman (-dı, -di) veya şimdiki zaman (-makta, -mekte) kullan.
- Profesyonel bir hekimin (Profesör düzeyinde) resmi epikriz veya vizit notu dilini kullan.
- Halk dilindeki ifadeleri tıbbi terimlere çevir (Örn: "İdrarımda yanma var" -> "Dizüri şikayeti ile başvuran hasta...").

## UZMAN YAKLAŞIMI:
1. Şikayetleri öncelik sırasına göre değerlendir.
2. Semptomların süresini ve şiddetini not et.
3. Alarm semptomlarına dikkat et (hematüri, ani başlangıç, ateş).
4. Yaşa uygun ayırıcı tanı yap. Özellikle klinik not (clinical_note) kısmında hekim diliyle profesyonel bir sentez yap.
5. Olası tanılar için ICD-10 kodlarını belirt.
6. Tedavi planını kanıta dayalı olarak oluştur.

## ÖZEL ŞABLON TALİMATLARI ({template_name or 'Standart'}):
{template_hint}

## KURALLAR:
1. Klinik notu yazarken farklı tıbbi durumları/şikayetleri (örn: Prostat, ED, İnkontinans vb.) ayrı paragraflarda aktar. Her paragraftan sonra MUTLAKA 1 satır boşluk bırak. Şikayetler için numaralama yapma.
2. Yer tutuculara çıkarılan bilgileri doldur.
3. Transkriptte BAHSEDILMEYEN bölümleri ATLA.
4. İlaçlar, dozajlar ve cerrahi öykü konusunda hassas ol.
5. Cinsel sağlık (ereksiyon, boşalma, libido vb.) üroloji için temel klinik veridir. Bu konuları "erektil_islev" ve "ejakulasyon" alanlarına tıbbi bir dille, detaylıca işle. Çekingen davranma, bu veriler tanı için kritiktir.
6. Eğer hastanın cinsel fonksiyonları normal ise "Normal" yaz, sorun varsa detaylandır.
7. Özgeçmiş (ozgecmis): Hastalıkları ve ameliyatları ALT ALTA yaz. Her satırda tek bir hastalık veya ameliyat olsun. Ameliyat yılı biliniyorsa yanına ekle.
8. Soygeçmiş (soygecmis): Aile hikayesini her aile üyesi için ayrı satırda, kısa ve öz yaz. Kısaltmalar kullan (PCa=Prostat Kanseri, DM=Diyabet, HT=Hipertansiyon, Ca=Kanser).
9. İlaçlar (kullandigi_ilaclar): Her ilacı ALT ALTA, ayrı satırda yaz. Doz ve frekans biliniyorsa ekle.
10. Alerjiler (allerjiler): Bilinen alerjileri alt alta listele. Yoksa "Yok" yaz.
11. Sigara ve alkol bilgilerini MUTLAKA sor ve ayrı alanlara yaz. Bahsedilmemişse "Sorulmadı" yaz.
12. Öneriler (oneriler): SADECE doktorun sözlü olarak belirttiği önerileri yaz. Yapay zeka kendi önerisini EKLEME. Doktor öneri söylemediyse boş bırak.
13. ICD-10 kodlarını en uygun şekilde eşleştir ve tani1_icd, tani2_icd, tani3_icd alanlarına doğru formatla yaz (örn: N40.1, C61, R31).
14. Hastalığın hikayesi (oyku) alanını son derece detaylı tutun. Ses kaydında veya girdi metninde geçen şikayetin başlangıcı, karakteri, derecesi, yapılan tetkiklerin sonuçları ve geçirilmiş tedaviler dahil tüm öykü detaylarını eksiksiz ve geniş bir şekilde aktarın. Kısa özetler yerine kapsamlı ve detaylı bir tıbbi epikriz anlatımı oluşturun.

## ŞABLON:
{used_template}

## PERSONA KURALLARI:
{self._get_persona_rules(persona)}

## ÜROLOJİDE SIK KULLANILAN ICD-10 KODLARI REHBERİ:
- N40: Prostat hiperplazisi (BPH)
- N41.0: Akut prostatit
- N41.1: Kronik prostatit
- N42.1: Prostat konjesyonu
- N20.0: Böbrek taşı
- N20.1: Üreter taşı
- N21.0: Mesane taşı
- N30.0: Akut sistit
- N30.1: Kronik sistit
- N34.1: Üretrit
- N39.0: İdrar yolu enfeksiyonu
- N32.0: Mesane boyun obstrüksiyonu
- N40.1: BPH ile alt üriner sistem semptomları
- R31: Hematüri
- R33: İdrar retansiyonu
- R35.0: Sık idrara çıkma
- R35.1: Noktüri
- R39.1: Diğer miksiyon güçlükleri
- N52.9: Erektil disfonksiyon
- F52.4: Prematür ejakülasyon
- C61: Prostat malign neoplazmı
- C67: Mesane malign neoplazmı
- C64: Böbrek malign neoplazmı
- D29.1: Prostat benign neoplazmı
- N43.3: Hidrosel
- N44.0: Testis torsiyonu
- N45: Orşit ve epididimit
- N50.1: Varikosel

## JSON YANIT FORMATI:
{{
  "sikayet": "Ana şikayetler (öncelik sırasına göre)",
  "oyku": "Hastalığın son derece detaylı ve kapsamlı klinik öyküsü (şikayetin başlangıcı, seyri, şiddeti, karakteri, tetkik sonuçları, yapılan tedaviler ve hikayenin tüm detayları ile birlikte hekim diliyle çok detaylı olarak yazılmalıdır. Kısa özet geçmeyin, tüm klinik detayları buraya aktarın.)",
  "disuri": "VAR/YOK/BAZEN",
  "pollakiuri": "VAR/YOK/BAZEN",
  "nokturi": "VAR/YOK/BAZEN (sayı belirtilmişse not et)",
  "hematuri": "VAR/YOK/BAZEN",
  "genital_akinti": "VAR/YOK/BAZEN",
  "kabizlik": "VAR/YOK/BAZEN",
  "tas_oyku": "Taş öyküsü detayları",
  "erektil_islev": "Erektil fonksiyon detayları",
  "ejakulasyon": "Ejakülasyon detayları",
  "ozgecmis": "Hastalıklar ve ameliyatlar - HER BİRİ AYRI SATIRDA. Örnek format:\nHipertansiyon\nDiyabet mellitus tip 2\nTiroidektomi 2023\nApendektomi 2010",
  "soygecmis": "Aile hikayesi - kısa ve öz, HER AİLE ÜYESİ AYRI SATIRDA. Örnek format:\nBaba PCa\nAnne DM, HT\nAbi Akciğer Ca",
  "kullandigi_ilaclar": "İlaç listesi - HER İLAÇ AYRI SATIRDA, doz varsa yanına ekle. Örnek format:\nCoraspin 100mg\nLipitor 20mg\nCardura 4mg\nMetformin 1000mg 2x1",
  "kan_sulandirici": 0,
  "sigara": "Sigara kullanımı detayı (örn: '1 paket/gün, 20 yıl' veya 'Yok' veya 'Bırakmış 2020')",
  "alkol": "Alkol kullanımı detayı (örn: 'Sosyal' veya 'Yok' veya 'Günlük 2 bira')",
  "allerjiler": "Bilinen alerjiler - HER ALERJİ AYRI SATIRDA. Alerji yoksa 'Yok' yaz. Örnek:\nPenisilin\nLateks\nİyot",
  "tani1": "Birincil tanı",
  "tani1_icd": "ICD-10 kodu (ör: N40.1)",
  "tani2": "İkincil tanı (varsa)",
  "tani2_icd": "ICD-10 kodu",
  "tani3": "Üçüncül tanı (varsa)",
  "tani3_icd": "ICD-10 kodu",
  "ayirici_tanilar": "Ayırıcı tanılar listesi",
  "tedavi": "Tedavi planı (ilaç, doz, süre)",
  "oneriler": "SADECE doktorun söylediği önerileri yaz. Doktor bir öneri belirtmediyse bu alanı boş bırak. Kendi başına öneri üretme.",
  "tetkikler": "Önerilen tetkikler (lab, görüntüleme)",
  "clinical_note": "Tam formatlı klinik not (Türkçe, profesyonel format ve Şablon yapısına BİREBİR uygun)",
  "confidence_score": 0.85,
  "extracted_keywords": ["Anahtar Kelime 1", "Anahtar Kelime 2"]
}}

## ÖNEMLİ:
- ICD kodlarını doğru formatla yaz (N40.1 gibi)
- Birden fazla tanı olabilir, hepsini belirt
- Tedavi planını güncel kılavuzlara göre oluştur (EAU, AUA)
- Takip süresini ve kontrol randevusunu öner
"""

    def _get_persona_rules(self, persona: str) -> str:
        if persona == "c3po":
            # Load C-3PO specific rules dynamically from files if needed, or inline them
            persona_dir = TEMPLATES_DIR / "personas" / "c3po"
            rules = "DİKKAT: C-3PO MODU AKTİF.\n- TÜM KLİNİK NOT BÜYÜK HARFLE YAZILACAKTIR.\n- KISALTMALAR BOLCA KULLANILACAKTIR (Örn: Hipertansiyon -> HT, Prostat Kanseri -> PCa).\n- JSON DIŞINDA ASLA AÇIKLAMA YAZMAYIN."
            if persona_dir.exists():
                try:
                    style_file = persona_dir / "writing-style-guide.md"
                    if style_file.exists():
                        rules += "\n\n" + style_file.read_text(encoding="utf-8")
                except Exception as e:
                    logger.error(f"Failed to read persona rules: {e}")
            return rules
        return "Standart resmi klinik üslup."


# Singleton instance
_ai_scribe_service: Optional[AIScribeService] = None


def get_ai_scribe_service() -> AIScribeService:
    """Get or create AI Scribe service instance"""
    global _ai_scribe_service
    if _ai_scribe_service is None:
        _ai_scribe_service = AIScribeService()
    return _ai_scribe_service
