from typing import Any, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.core.config import settings
from app.core.limiter import limiter
from app.repositories.clinical.repository import ClinicalRepository
from app.schemas.ai_scribe import LetterPolishRequest, LetterPolishResponse
from app.services.ai_scribe_service import get_ai_scribe_service
from app.services.audit_service import AuditService
from app.models.user import User
from app.schemas.clinical import (
    IstirahatRaporuCreate,
    IstirahatRaporuResponse,
    IstirahatRaporuUpdate,
    KonsultasyonRaporuCreate,
    KonsultasyonRaporuResponse,
    KonsultasyonRaporuUpdate,
    DurumBildirirRaporuCreate,
    DurumBildirirRaporuResponse,
    DurumBildirirRaporuUpdate,
    TibbiMudahaleRaporuCreate,
    TibbiMudahaleRaporuResponse,
    TibbiMudahaleRaporuUpdate,
    TrusBiyopsiCreate,
    TrusBiyopsiResponse,
    TrusBiyopsiUpdate,
)

router = APIRouter(dependencies=[Depends(deps.get_current_user)])

# --- İSTİRAHAT RAPORLARI ---
@router.get(
    "/patients/{hasta_id}/rest-reports", response_model=List[IstirahatRaporuResponse]
)
async def read_rest_reports(
    hasta_id: str, db: AsyncSession = Depends(deps.get_db)
) -> Any:
    repo = ClinicalRepository(db)
    return await repo.get_rest_reports_by_patient(hasta_id)

@router.post("/rest-reports", response_model=IstirahatRaporuResponse)
async def create_rest_report(
    *, db: AsyncSession = Depends(deps.get_db), report_in: IstirahatRaporuCreate
) -> Any:
    repo = ClinicalRepository(db)
    return await repo.create_rest_report(report_in)

@router.put("/rest-reports/{id}", response_model=IstirahatRaporuResponse)
async def update_rest_report(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    report_in: IstirahatRaporuUpdate
) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.update_rest_report(id, report_in)
    if not result:
        raise HTTPException(status_code=404, detail="Rest report not found")
    return result

@router.delete("/rest-reports/{id}")
async def delete_rest_report(
    *, db: AsyncSession = Depends(deps.get_db), id: UUID
) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.delete_rest_report(id)
    if not result:
        raise HTTPException(status_code=404, detail="Rest report not found")
    return {"status": "success", "id": id}

@router.get("/rest-reports/{id}", response_model=IstirahatRaporuResponse)
async def read_rest_report(*, db: AsyncSession = Depends(deps.get_db), id: UUID) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.get_rest_report(id)
    if not result:
        raise HTTPException(status_code=404, detail="Rest report not found")
    return result


# --- KONSÜLTASYON RAPORLARI ---
@router.get(
    "/patients/{hasta_id}/consultation-reports",
    response_model=List[KonsultasyonRaporuResponse],
)
async def read_consultation_reports(
    hasta_id: str, db: AsyncSession = Depends(deps.get_db)
) -> Any:
    repo = ClinicalRepository(db)
    return await repo.get_consultation_reports_by_patient(hasta_id)

@router.post("/consultation-reports", response_model=KonsultasyonRaporuResponse)
async def create_consultation_report(
    *, db: AsyncSession = Depends(deps.get_db), report_in: KonsultasyonRaporuCreate
) -> Any:
    repo = ClinicalRepository(db)
    return await repo.create_consultation_report(report_in)

@router.put("/consultation-reports/{id}", response_model=KonsultasyonRaporuResponse)
async def update_consultation_report(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    report_in: KonsultasyonRaporuUpdate
) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.update_consultation_report(id, report_in)
    if not result:
        raise HTTPException(status_code=404, detail="Consultation report not found")
    return result

@router.delete("/consultation-reports/{id}")
async def delete_consultation_report(
    *, db: AsyncSession = Depends(deps.get_db), id: UUID
) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.delete_consultation_report(id)
    if not result:
        raise HTTPException(status_code=404, detail="Consultation report not found")
    return {"status": "success", "id": id}

@router.get("/consultation-reports/{id}", response_model=KonsultasyonRaporuResponse)
async def read_consultation_report(
    *, db: AsyncSession = Depends(deps.get_db), id: UUID
) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.get_consultation_report(id)
    if not result:
        raise HTTPException(status_code=404, detail="Consultation report not found")
    return result


@router.post("/consultation-reports/polish-letter", response_model=LetterPolishResponse)
@limiter.limit("20/minute")
async def polish_consultation_letter(
    request: Request,
    payload: LetterPolishRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Taslak konsültasyon mektubunun dil bilgisi/cümle akışını AI ile
    düzeltir. İçerik üretmez/değiştirmez, sadece verilen metni düzenler."""
    if not settings.AI_SCRIBE_ENABLED:
        raise HTTPException(status_code=403, detail="AI Scribe özelliği devre dışı.")

    service = get_ai_scribe_service()
    try:
        result = await service.polish_letter(
            draft_text=payload.text, mode=payload.mode, db=db
        )
        # SEC: hasta verisine dokunan AI çağrısı — audit izi (mektup metni
        # DEĞİL, sadece meta veriler loglanır; PHI audit tablosuna yazılmaz).
        await AuditService.log(
            db=db,
            action="KONSULTASYON_MEKTUP_AI_DUZENLE",
            user_id=current_user.id,
            resource_type="consultation_report_letter",
            resource_id=None,
            details={
                "mode_used": result.get("mode_used"),
                "fact_drift_warning": result.get("fact_drift_warning", False),
                "text_length": len(payload.text),
            },
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=500, detail="Mektup düzenleme sırasında bir hata oluştu."
        )


# --- DURUM BİLDİRİR RAPORLARI ---
@router.get(
    "/patients/{hasta_id}/status-reports",
    response_model=List[DurumBildirirRaporuResponse],
)
async def read_status_reports(
    hasta_id: str, db: AsyncSession = Depends(deps.get_db)
) -> Any:
    repo = ClinicalRepository(db)
    return await repo.get_status_reports_by_patient(hasta_id)

@router.post("/status-reports", response_model=DurumBildirirRaporuResponse)
async def create_status_report(
    *, db: AsyncSession = Depends(deps.get_db), report_in: DurumBildirirRaporuCreate
) -> Any:
    repo = ClinicalRepository(db)
    return await repo.create_status_report(report_in)

@router.put("/status-reports/{id}", response_model=DurumBildirirRaporuResponse)
async def update_status_report(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    report_in: DurumBildirirRaporuUpdate
) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.update_status_report(id, report_in)
    if not result:
        raise HTTPException(status_code=404, detail="Status report not found")
    return result

@router.delete("/status-reports/{id}")
async def delete_status_report(
    *, db: AsyncSession = Depends(deps.get_db), id: UUID
) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.delete_status_report(id)
    if not result:
        raise HTTPException(status_code=404, detail="Status report not found")
    return {"status": "success", "id": id}

@router.get("/status-reports/{id}", response_model=DurumBildirirRaporuResponse)
async def read_status_report(
    *, db: AsyncSession = Depends(deps.get_db), id: UUID
) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.get_status_report(id)
    if not result:
        raise HTTPException(status_code=404, detail="Status report not found")
    return result


# --- TIBBİ MÜDAHALE RAPORLARI ---
@router.get(
    "/patients/{hasta_id}/medical-reports",
    response_model=List[TibbiMudahaleRaporuResponse],
)
async def read_medical_reports(
    hasta_id: str, db: AsyncSession = Depends(deps.get_db)
) -> Any:
    repo = ClinicalRepository(db)
    return await repo.get_medical_reports_by_patient(hasta_id)

@router.post("/medical-reports", response_model=TibbiMudahaleRaporuResponse)
async def create_medical_report(
    *, db: AsyncSession = Depends(deps.get_db), report_in: TibbiMudahaleRaporuCreate
) -> Any:
    repo = ClinicalRepository(db)
    return await repo.create_medical_report(report_in)

@router.put("/medical-reports/{id}", response_model=TibbiMudahaleRaporuResponse)
async def update_medical_report(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    report_in: TibbiMudahaleRaporuUpdate
) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.update_medical_report(id, report_in)
    if not result:
        raise HTTPException(status_code=404, detail="Medical report not found")
    return result

@router.delete("/medical-reports/{id}")
async def delete_medical_report(
    *, db: AsyncSession = Depends(deps.get_db), id: UUID
) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.delete_medical_report(id)
    if not result:
        raise HTTPException(status_code=404, detail="Medical report not found")
    return {"status": "success", "id": id}

@router.get("/medical-reports/{id}", response_model=TibbiMudahaleRaporuResponse)
async def read_medical_report(
    *, db: AsyncSession = Depends(deps.get_db), id: UUID
) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.get_medical_report(id)
    if not result:
        raise HTTPException(status_code=404, detail="Medical report not found")
    return result


# --- TRUS BİYOPSİ ---
@router.get(
    "/patients/{hasta_id}/trus-biopsies", response_model=List[TrusBiyopsiResponse]
)
async def read_trus_biopsies(
    hasta_id: str, db: AsyncSession = Depends(deps.get_db)
) -> Any:
    repo = ClinicalRepository(db)
    return await repo.get_trus_biopsies_by_patient(hasta_id)

@router.post("/trus-biopsies", response_model=TrusBiyopsiResponse)
async def create_trus_biopsy(
    *, db: AsyncSession = Depends(deps.get_db), report_in: TrusBiyopsiCreate
) -> Any:
    repo = ClinicalRepository(db)
    return await repo.create_trus_biopsy(report_in)

@router.put("/trus-biopsies/{id}", response_model=TrusBiyopsiResponse)
async def update_trus_biopsy(
    *, db: AsyncSession = Depends(deps.get_db), id: UUID, report_in: TrusBiyopsiUpdate
) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.update_trus_biopsy(id, report_in)
    if not result:
        raise HTTPException(status_code=404, detail="Trus biopsy not found")
    return result

@router.delete("/trus-biopsies/{id}")
async def delete_trus_biopsy(
    *, db: AsyncSession = Depends(deps.get_db), id: UUID
) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.delete_trus_biopsy(id)
    if not result:
        raise HTTPException(status_code=404, detail="Trus biopsy not found")
    return {"status": "success", "id": id}

@router.get("/trus-biopsies/{id}", response_model=TrusBiyopsiResponse)
async def read_trus_biopsy(*, db: AsyncSession = Depends(deps.get_db), id: UUID) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.get_trus_biopsy(id)
    if not result:
        raise HTTPException(status_code=404, detail="Trus biopsy not found")
    return result
