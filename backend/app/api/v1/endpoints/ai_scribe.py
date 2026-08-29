"""
AI Scribe API Endpoints
"""

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
import logging

from app.api import deps
from app.core.config import settings
from app.core.limiter import limiter
from app.schemas.ai_scribe import (
    AIScribeRequest,
    AIScribeResponse,
    AIScribeStatusResponse,
    AIScribeTemplateInfo,
    AIScribeTextRequest,
)
from app.repositories.patient.models import Hasta
from app.services.ai_scribe_service import get_ai_scribe_service

router = APIRouter(
    # SEC-09: Router seviyesinde kimlik doğrulama
    dependencies=[Depends(deps.get_current_user)]
)
logger = logging.getLogger(__name__)


@router.get("/status", response_model=AIScribeStatusResponse)
async def get_ai_scribe_status():
    """
    AI Scribe servis durumunu döndür.
    """
    service = get_ai_scribe_service()
    local_status = await service.check_local_services()

    return AIScribeStatusResponse(
        enabled=settings.AI_SCRIBE_ENABLED,
        gemini_available=service.is_gemini_available(),
        local_whisper=local_status.get("whisper", False),
        local_ollama=local_status.get("ollama", False),
        templates_count=len(service.get_available_templates()),
    )


@router.get("/templates", response_model=List[AIScribeTemplateInfo])
async def get_templates():
    """
    Kullanılabilir şablon listesini döndür.
    """
    service = get_ai_scribe_service()
    return service.get_available_templates()


@router.post("/analyze", response_model=AIScribeResponse)
@limiter.limit("10/minute")
async def analyze_audio(
    request: Request,
    audio: UploadFile = File(..., description="Audio file (webm, mp3, wav, m4a)"),
    mode: str = Form("gemini", description="Analysis mode: gemini or local"),
    template: Optional[str] = Form(None, description="Template name"),
    include_transcript: bool = Form(
        False, description="Include transcript in response"
    ),
    patient_id: Optional[str] = Form(None, description="Patient ID for file naming"),
    db: AsyncSession = Depends(deps.get_db),
    current_user=Depends(deps.get_current_user),
):
    """
    Ses dosyasını analiz et ve klinik verileri çıkar.

    - **audio**: Ses dosyası (webm, mp3, wav, m4a formatları desteklenir)
    - **mode**: Analiz modu - 'gemini', 'local', 'hybrid_google_local', 'hybrid_google_gemini'
    - **template**: Kullanılacak şablon adı (opsiyonel)
    - **include_transcript**: Transkripti yanıta dahil et
    - **patient_id**: Hasta ID (Kayıtların protokol no ile isimlendirilmesi için)
    """
    protocol_no = None
    if patient_id:
        try:
            # Query the database for the patient's protocol number
            from sqlalchemy import select

            stmt = select(Hasta).where(
                Hasta.id == patient_id
            )
            result_db = await db.execute(stmt)
            patient_obj = result_db.scalar_one_or_none()
            if patient_obj:
                protocol_no = patient_obj.protokol_no
        except Exception as e:
            logger.warning(
                f"Could not fetch protocol number for patient {patient_id}: {e}"
            )
    if not settings.AI_SCRIBE_ENABLED:
        raise HTTPException(
            status_code=403,
            detail="AI Scribe özelliği devre dışı. Lütfen ayarlardan aktifleştirin.",
        )

    # Normalize and validate file type
    content_type = audio.content_type or "audio/webm"
    if content_type.startswith("video/"):
        content_type = content_type.replace("video/", "audio/", 1)

    allowed_types = [
        "audio/webm",
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/mp4",
        "audio/ogg",
    ]

    if not any(t in content_type for t in allowed_types):
        raise HTTPException(
            status_code=400,
            detail=f"Desteklenmeyen dosya formatı: {content_type}. Desteklenen formatlar: webm, mp3, wav, m4a, ogg",
        )

    # Read audio bytes
    audio_bytes = await audio.read()

    if len(audio_bytes) < 1000:
        raise HTTPException(status_code=400, detail="Ses dosyası çok kısa veya boş.")

    if len(audio_bytes) > 150 * 1024 * 1024:  # 150MB limit
        raise HTTPException(
            status_code=400, detail="Ses dosyası çok büyük. Maksimum 150MB."
        )

    request = AIScribeRequest(
        mode=mode, template=template, include_transcript=include_transcript
    )

    # Analyze
    service = get_ai_scribe_service()

    try:
        result = await service.analyze_consultation(
            audio_bytes=audio_bytes,
            mime_type=content_type,
            request=request,
            protocol_no=protocol_no,
            db=db,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Audio analysis error: {e}", exc_info=True)
        err_msg = str(e)
        underlying = None
        
        # Extract underlying exception from Tenacity RetryError if possible
        if hasattr(e, "last_attempt") and e.last_attempt and e.last_attempt.failed:
            underlying = e.last_attempt.exception()
            err_msg = f"{err_msg} (Sebep: {underlying})"

        # Check for specific error types to guide the user
        is_unicode_err = "unicodeencodeerror" in err_msg.lower() or "ascii" in err_msg.lower()
        if underlying and ("unicodeencodeerror" in str(underlying).lower() or "ascii" in str(underlying).lower()):
            is_unicode_err = True

        if is_unicode_err:
            detail_msg = "API Anahtarı kodlama hatası: Veritabanında geçersiz karakterler veya maskelenmiş anahtar (••••••••) kalmış olabilir. Lütfen Ayarlar > Entegrasyonlar sekmesinden gerçek ve geçerli bir API anahtarı kaydedip tekrar deneyin."
        elif "api_key" in err_msg.lower() or "api key" in err_msg.lower() or "unauthorized" in err_msg.lower():
            # SEC: ham hata mesajı client'a döndürülmüyor (API key/token içerebilir);
            # zaten yukarıda logger.error ile server log'una yazıldı.
            detail_msg = "API Anahtarı yetkilendirme hatası. Lütfen API anahtarınızı kontrol edin."
        else:
            detail_msg = "Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin."

        raise HTTPException(status_code=500, detail=detail_msg)


@router.post("/analyze-text", response_model=AIScribeResponse)
@limiter.limit("20/minute")
async def analyze_text(
    request: Request,
    payload: AIScribeTextRequest,
    current_user=Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    """
    Metin girdisini analiz et ve klinik verileri çıkar.
    """
    if not settings.AI_SCRIBE_ENABLED:
        raise HTTPException(status_code=403, detail="AI Scribe özelliği devre dışı.")

    service = get_ai_scribe_service()

    try:
        result = await service.analyze_text(text=payload.text, request=payload, db=db)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Text analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Analiz sırasında bir hata oluştu")
