"""
Patient Report API Endpoint

Provides aggregated patient reports for PDF generation with graceful degradation.
"""

from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api import deps
from app.models.user import User
from app.core.user_context import UserContext
from app.schemas.patient_report import PatientReportDTO
from app.services.orchestrators.report_orchestrator import get_report_orchestrator
from app.services.pdf_report_service import PDFReportService
from fastapi.responses import StreamingResponse

router = APIRouter(
    # SEC-09: Router seviyesinde kimlik doğrulama
    dependencies=[Depends(deps.get_current_user)]
)


@router.get("/{patient_id}", response_model=PatientReportDTO)
async def get_patient_report(
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> PatientReportDTO:
    """
    Get aggregated patient report for PDF generation.

    Combines data from Patient, Clinical, and Finance shards.
    If any shard is unavailable, partial data is returned with warnings.

    Returns:
        PatientReportDTO with optional sections and warnings list
    """
    context = UserContext(
        user_id=current_user.id, username=current_user.username, role=current_user.role
    )

    orchestrator = get_report_orchestrator(db, context)
    return await orchestrator.get_patient_report(patient_id)


@router.get("/{patient_id}/pdf")
async def get_patient_report_pdf(
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> StreamingResponse:
    """
    Generate and stream a resilient PDF report for the patient.
    """
    context = UserContext(
        user_id=current_user.id, username=current_user.username, role=current_user.role
    )

    orchestrator = get_report_orchestrator(db, context)
    report_data = await orchestrator.get_patient_report(patient_id)

    # Generate PDF via service
    pdf_stream = PDFReportService.generate_patient_report_pdf(report_data)

    filename = f"Patient_Report_{patient_id}_{datetime.now().strftime('%Y%m%d')}.pdf"

    return StreamingResponse(
        pdf_stream,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/{patient_id}/status")
async def get_report_status(
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> dict:
    """
    Quick health check for report data availability.

    Returns which shards are available for this patient.
    """
    context = UserContext(
        user_id=current_user.id, username=current_user.username, role=current_user.role
    )

    orchestrator = get_report_orchestrator(db, context)
    report = await orchestrator.get_patient_report(patient_id)

    return {
        "patient_id": str(patient_id),
        "demographics_available": report.demographics is not None,
        "examinations_count": len(report.examinations),
        "lab_results_count": len(report.lab_results),
        "finance_available": report.finance_summary is not None,
        "warnings": report.warnings,
        "is_complete": report.is_complete,
    }
