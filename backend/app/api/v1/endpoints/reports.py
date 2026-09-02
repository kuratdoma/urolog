from datetime import date
from typing import Any, Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api import deps
from app.core.permissions import Action
from app.models.user import User
from app.schemas.report import (
    ExtendedReportStats,
    DiagnosisStats,
    CohortRow,
    HeatmapData,
    ReferenceCategory,
    ServiceDistribution,
)
from app.repositories.report_repository import report_repository

router = APIRouter(
    # SEC-09: Router seviyesinde kimlik doğrulama
    dependencies=[Depends(deps.get_current_user)]
)

# RBAC: yetkiler PERMISSION_MATRIX["reports"] üzerinden işlem bazında uygulanır.
# Router seviyesinde tek rol listesi kullanmak salt-okunur rollerin de
# yazma uçlarına erişmesine yol açardı.
_read = deps.require_permission("reports", Action.READ)


@router.get("/stats", response_model=ExtendedReportStats, dependencies=[Depends(_read)])
async def get_report_stats(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get aggregated report statistics with extended performance metrics.
    """
    kpis = await report_repository.get_kpis(db, start_date, end_date)
    performance = await report_repository.get_performance_kpis(db, start_date, end_date)
    patient_trend = await report_repository.get_patient_trends(db, start_date, end_date)
    revenue_chart = await report_repository.get_revenue_chart(db, start_date, end_date)
    operation_chart = await report_repository.get_operation_chart(
        db, start_date, end_date
    )
    reference_stats = await report_repository.get_reference_stats(
        db, start_date, end_date
    )
    reference_categories = await report_repository.get_reference_categories(
        db, start_date, end_date
    )
    weekly_new_patients = await report_repository.get_weekly_new_patients(
        db, start_date, end_date
    )
    service_distribution = await report_repository.get_service_distribution(
        db, start_date, end_date
    )
    heatmap = await report_repository.get_heatmap_data(db, start_date, end_date)
    cancellation_stats = await report_repository.get_cancellation_stats(
        db, start_date, end_date
    )

    return ExtendedReportStats(
        kpi=kpis,
        performance=performance,
        patient_trend=patient_trend,
        revenue_chart=revenue_chart,
        operation_chart=operation_chart,
        reference_stats=reference_stats,
        reference_categories=reference_categories,
        weekly_new_patients=weekly_new_patients,
        service_distribution=service_distribution,
        heatmap=heatmap,
        cancellation_stats=cancellation_stats,
    )


@router.get("/cohort", response_model=List[CohortRow], dependencies=[Depends(_read)])
async def get_cohort_analysis(
    months_back: int = Query(default=6, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get cohort analysis for patient retention.
    """
    return await report_repository.get_cohort_analysis(db, months_back)


@router.get("/diagnosis", response_model=DiagnosisStats, dependencies=[Depends(_read)])
async def get_diagnosis_stats(
    icd_code: Optional[str] = None,
    diagnosis_text: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Filter patients by diagnosis (ICD code or text) and get statistics.
    Usage: "Son 2 yılda C67 (Mesane Tümörü) tanılı hastaları listele"
    """
    return await report_repository.get_diagnosis_stats(
        db, icd_code, diagnosis_text, start_date, end_date
    )


@router.get("/heatmap", response_model=List[HeatmapData], dependencies=[Depends(_read)])
async def get_heatmap(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get appointment heatmap data (busiest hours/days).
    """
    return await report_repository.get_heatmap_data(db, start_date, end_date)


@router.get("/reference-categories", response_model=List[ReferenceCategory], dependencies=[Depends(_read)])
async def get_reference_categories(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get categorized reference statistics (Hekim, Hasta, Dijital, Diğer).
    """
    return await report_repository.get_reference_categories(db, start_date, end_date)


@router.get("/service-distribution", response_model=List[ServiceDistribution], dependencies=[Depends(_read)])
async def get_service_distribution(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get service/subspecialty distribution (Üroonkoloji, Androloji, etc.).
    """
    return await report_repository.get_service_distribution(db, start_date, end_date)


@router.get("/drilldown-patients", response_model=List[Any], dependencies=[Depends(_read)])
async def get_drilldown_patients(
    type: str,  # 'weekly', 'monthly', 'reference'
    value: str,  # label from chart
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get list of patients for chart drill-down.
    """
    if type == "weekly":
        return await report_repository.get_weekly_drilldown(db, value)
    elif type == "monthly":
        return await report_repository.get_monthly_drilldown(db, value)
    elif type == "reference":
        return await report_repository.get_reference_patients(
            db, value, start_date, end_date
        )

    return []


@router.get("/reference-patients", response_model=List[Any], dependencies=[Depends(_read)])
async def get_reference_patients(
    referans: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get list of patients for a specific reference.
    """
    return await report_repository.get_reference_patients(
        db, referans, start_date, end_date
    )
