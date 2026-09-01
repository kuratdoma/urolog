"""
AI Scribe Schemas - Pydantic modelleri
"""

from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class AIScribeMode(str, Enum):
    """AI analiz modu"""

    GEMINI = "gemini"
    LOCAL = "local"
    HYBRID_GOOGLE_LOCAL = "hybrid_google_local"
    HYBRID_GOOGLE_GEMINI = "hybrid_google_gemini"


class SemptomDurumu(str, Enum):
    """Semptom durumu enum"""

    VAR = "VAR"
    YOK = "YOK"
    BAZEN = "BAZEN"


class AIScribeRequest(BaseModel):
    """AI Scribe analiz isteği"""

    mode: AIScribeMode = Field(AIScribeMode.GEMINI, description="AI modu")
    language: str = "tr"
    include_transcript: bool = False
    template: Optional[str] = Field(
        None, description="Şablon: BPH, OAB, SOAP, H&P, vb."
    )
    persona: Optional[str] = Field(
        "default", description="AI Asistan Personası (örn: c3po)"
    )


class AIScribeTextRequest(AIScribeRequest):
    """AI Scribe metin analiz isteği"""

    text: str = Field(..., description="Analiz edilecek metin", min_length=10)


class AIScribeResponse(BaseModel):
    """AI Scribe analiz yanıtı - MuayeneBase ile uyumlu"""
    model_config = {"extra": "allow"}

    # Meta
    mode_used: AIScribeMode = Field(..., description="Kullanılan AI modu")
    processing_time_seconds: float = Field(0.0, description="İşlem süresi")
    transcript: Optional[str] = Field(None, description="Ses transkripti")
    confidence_score: Optional[float] = Field(None, ge=0, le=1)

    # Temel Bilgiler
    sikayet: Optional[str] = Field(None, description="Ana şikayet")
    oyku: Optional[str] = Field(None, description="Hastalık öyküsü")

    # Semptomlar
    disuri: Optional[str] = Field(None, description="İdrar yaparken yanma")
    pollakiuri: Optional[str] = Field(None, description="Sık idrara çıkma")
    nokturi: Optional[str] = Field(None, description="Gece idrara kalkma")
    hematuri: Optional[str] = Field(None, description="Kanlı idrar")
    genital_akinti: Optional[str] = Field(None, description="Genital akıntı")
    kabizlik: Optional[str] = Field(None, description="Kabızlık")
    tas_oyku: Optional[str] = Field(None, description="Taş öyküsü")

    # IPSS Semptomları
    catallanma: Optional[str] = None
    projeksiyon_azalma: Optional[str] = None
    kalibre_incelme: Optional[str] = None
    idrar_bas_zorluk: Optional[str] = None
    kesik_idrar_yapma: Optional[str] = None
    terminal_damlama: Optional[str] = None
    residiv_hissi: Optional[str] = None
    inkontinans: Optional[str] = None

    # Cinsel İşlev
    erektil_islev: Optional[str] = None
    ejakulasyon: Optional[str] = None
    iief_ef_answers: Optional[str] = Field(None, description="IIEF-EF JSON String")

    # Tıbbi Geçmiş
    ozgecmis: Optional[str] = Field(None, description="Özgeçmiş")
    soygecmis: Optional[str] = Field(None, description="Soygeçmiş")
    kullandigi_ilaclar: Optional[str] = Field(None, description="Kullandığı ilaçlar")
    kan_sulandirici: Optional[int] = Field(None, description="0: Yok, 1: Var")
    aliskanliklar: Optional[str] = Field(None, description="Sigara, alkol vb.")
    sigara: Optional[str] = Field(None, description="Sigara kullanımı")
    alkol: Optional[str] = Field(None, description="Alkol kullanımı")
    allerjiler: Optional[str] = Field(None, description="Bilinen alerjiler")

    # Tanı ve Tedavi
    tani1: Optional[str] = Field(None, description="Birincil tanı")
    tani1_icd: Optional[str] = Field(None, description="Birincil tanı ICD-10 kodu")
    tani2: Optional[str] = Field(None, description="İkincil tanı")
    tani2_icd: Optional[str] = Field(None, description="İkincil tanı ICD-10 kodu")
    tani3: Optional[str] = Field(None, description="Üçüncül tanı")
    tani3_icd: Optional[str] = Field(None, description="Üçüncül tanı ICD-10 kodu")
    ayirici_tanilar: Optional[str] = Field(None, description="Ayırıcı tanılar listesi")
    tedavi: Optional[str] = Field(None, description="Tedavi planı")
    oneriler: Optional[str] = Field(None, description="Hasta önerileri ve takip planı")
    tetkikler: Optional[str] = Field(
        None, description="Önerilen tetkikler (lab, görüntüleme)"
    )

    # Ek Veriler
    clinical_note: Optional[str] = Field(None, description="Tam klinik not")
    extracted_keywords: Optional[List[str]] = Field(default_factory=list)


class LetterPolishRequest(BaseModel):
    """Serbest metin alanlarından birleştirilmiş bir taslak mektubun
    dil bilgisi/akış düzeltmesi için istek. İçerik üretmez, sadece verilen
    metni düzenler."""

    text: str = Field(..., description="Düzenlenecek taslak mektup metni", min_length=10)
    mode: AIScribeMode = Field(AIScribeMode.GEMINI, description="AI modu")


class LetterPolishResponse(BaseModel):
    """Dil bilgisi/akış düzeltmesi yapılmış mektup metni."""

    polished_text: str = Field(..., description="Düzenlenmiş mektup metni")
    mode_used: AIScribeMode = Field(..., description="Kullanılan AI modu")
    fact_drift_warning: bool = Field(
        False,
        description="Taslakta geçen bir sayısal değer (doz, tarih, sonuç vb.) düzenlenmiş metinde bulunamadıysa true olur — klinik bir bilginin değişmiş olabileceğine dair uyarı.",
    )


class AIScribeStatusResponse(BaseModel):
    """AI Scribe servis durumu"""

    enabled: bool = Field(..., description="AI Scribe aktif mi?")
    gemini_available: bool = Field(..., description="Gemini API kullanılabilir mi?")
    local_whisper: bool = Field(False, description="Local Whisper aktif mi?")
    local_ollama: bool = Field(False, description="Local Ollama aktif mi?")
    templates_count: int = Field(0, description="Yüklü şablon sayısı")


class AIScribeTemplateInfo(BaseModel):
    """Şablon bilgisi"""

    id: str
    name: str
    description: str
