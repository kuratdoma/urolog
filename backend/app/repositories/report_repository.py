from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
from typing import List, Dict, Any, Optional

from app.schemas.report import (
    DashboardKPI,
    ChartDataPoint,
    PerformanceKPI,
    HeatmapData,
    CohortRow,
    DiagnosisStats,
    ReferenceCategory,
    ServiceDistribution,
)

from app.repositories.analytics.kpi_repository import KPIRepository
from app.repositories.analytics.cohort_repository import CohortRepository
from app.repositories.analytics.demographics_analytics_repository import DemographicsAnalyticsRepository

class ReportRepository:
    """
    Facade class that routes analytical queries to the domain-specific repositories.
    This preserves backwards compatibility with existing endpoints calling ReportRepository.
    """

    @staticmethod
    async def get_kpis(
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> DashboardKPI:
        return await KPIRepository.get_kpis(db, start_date, end_date)

    @staticmethod
    async def get_performance_kpis(
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> PerformanceKPI:
        return await KPIRepository.get_performance_kpis(db, start_date, end_date)

    @staticmethod
    async def get_heatmap_data(
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[HeatmapData]:
        return await CohortRepository.get_heatmap_data(db, start_date, end_date)

    @staticmethod
    async def get_cohort_analysis(
        db: AsyncSession, months_back: int = 6
    ) -> List[CohortRow]:
        return await CohortRepository.get_cohort_analysis(db, months_back)
        
    @staticmethod
    async def get_weekly_new_patients(
        db: AsyncSession,
        start_date_filter: Optional[date] = None,
        end_date_filter: Optional[date] = None,
    ) -> List[ChartDataPoint]:
        return await CohortRepository.get_weekly_new_patients(db, start_date_filter, end_date_filter)

    @staticmethod
    async def get_weekly_drilldown(
        db: AsyncSession, label: str
    ) -> List[Dict[str, Any]]:
        return await CohortRepository.get_weekly_drilldown(db, label)

    @staticmethod
    async def get_monthly_drilldown(
        db: AsyncSession, label: str
    ) -> List[Dict[str, Any]]:
        return await CohortRepository.get_monthly_drilldown(db, label)

    @staticmethod
    async def get_diagnosis_stats(
        db: AsyncSession,
        icd_code: Optional[str] = None,
        diagnosis_text: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> DiagnosisStats:
        return await DemographicsAnalyticsRepository.get_diagnosis_stats(
            db, icd_code, diagnosis_text, start_date, end_date
        )

    @staticmethod
    async def get_reference_categories(
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[ReferenceCategory]:
        return await DemographicsAnalyticsRepository.get_reference_categories(db, start_date, end_date)

    @staticmethod
    async def get_service_distribution(
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[ServiceDistribution]:
        return await DemographicsAnalyticsRepository.get_service_distribution(db, start_date, end_date)

    @staticmethod
    async def get_patient_trends(
        db: AsyncSession,
        start_date_filter: Optional[date] = None,
        end_date_filter: Optional[date] = None,
    ) -> List[ChartDataPoint]:
        return await DemographicsAnalyticsRepository.get_patient_trends(db, start_date_filter, end_date_filter)

    @staticmethod
    async def get_revenue_chart(
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[ChartDataPoint]:
        return await DemographicsAnalyticsRepository.get_revenue_chart(db, start_date, end_date)

    @staticmethod
    async def get_operation_chart(
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[ChartDataPoint]:
        return await DemographicsAnalyticsRepository.get_operation_chart(db, start_date, end_date)

    @staticmethod
    async def get_reference_stats(
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[ChartDataPoint]:
        return await DemographicsAnalyticsRepository.get_reference_stats(db, start_date, end_date)

    @staticmethod
    async def get_reference_patients(
        db: AsyncSession,
        referans: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        return await DemographicsAnalyticsRepository.get_reference_patients(db, referans, start_date, end_date)

    @staticmethod
    async def get_cancellation_stats(
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[ChartDataPoint]:
        return await DemographicsAnalyticsRepository.get_cancellation_stats(db, start_date, end_date)

report_repository = ReportRepository()
