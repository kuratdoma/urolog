from typing import Optional, List
from pydantic import BaseModel


class DashboardKPI(BaseModel):
    total_patients: int
    new_patients_month: int
    total_operations_month: int
    monthly_revenue: float
    monthly_revenue_change: float  # Percentage change from last month


class ChartDataPoint(BaseModel):
    name: str  # Date or Category
    value: float  # Revenue, Count, etc.
    value2: Optional[float] = None  # Comparison data if needed


# ========== NEW PERFORMANCE METRICS ==========


class PerformanceKPI(BaseModel):
    # Randevu Sadakat Oranı (No-show rate)
    appointment_loyalty_rate: float  # Percentage of completed appointments
    total_appointments: int
    completed_appointments: int
    no_show_appointments: int

    # İşlem Yoğunluğu
    exam_count: int  # Muayene sayısı
    procedure_count: int  # Girişimsel işlem (operasyon) sayısı
    procedure_ratio: float  # Operasyon / (Muayene + Operasyon) oranı

    # Hasta Başına Ortalama Değer
    avg_revenue_per_patient: float

    # Geri Dönüş Oranı
    return_rate: float  # İlk muayeneden sonra geri dönenlerin oranı
    returning_patients: int
    first_time_patients: int


class HeatmapData(BaseModel):
    day: int  # 0=Pazartesi, 6=Pazar
    hour: int  # 0-23
    value: int  # Randevu sayısı


class CohortRow(BaseModel):
    cohort_month: str  # "2024-01" format
    total_patients: int
    month_0: int  # İlk ay (kayıt ayı)
    month_1: int
    month_2: int
    month_3: int
    month_4: int
    month_5: int
    month_6: int


class DiagnosisFilterResult(BaseModel):
    id: str
    ad: str
    soyad: str
    tani: str
    tani_kodu: str
    tarih: str


class DiagnosisTrendPoint(BaseModel):
    period: str
    count: int


class DiagnosisStats(BaseModel):
    total_count: int
    percentage_of_portfolio: float
    trend: List[DiagnosisTrendPoint]
    patients: List[DiagnosisFilterResult]


class ReferenceCategory(BaseModel):
    category: str  # "hekim", "hasta", "dijital", "diger"
    category_label: str
    count: int
    percentage: float
    sources: List[ChartDataPoint]  # Individual referral sources within category


class ServiceDistribution(BaseModel):
    name: str  # e.g., "Üroonkoloji", "Androloji"
    count: int
    percentage: float


# ========== EXTENDED REPORT STATS ==========


class ExtendedReportStats(BaseModel):
    kpi: DashboardKPI
    performance: PerformanceKPI
    revenue_chart: List[ChartDataPoint]
    operation_chart: List[ChartDataPoint]
    patient_trend: List[ChartDataPoint]
    reference_stats: Optional[List[ChartDataPoint]] = None
    reference_categories: Optional[List[ReferenceCategory]] = None
    weekly_new_patients: Optional[List[ChartDataPoint]] = None
    service_distribution: Optional[List[ServiceDistribution]] = None
    heatmap: Optional[List[HeatmapData]] = None
    cancellation_stats: Optional[List[ChartDataPoint]] = None


# Legacy support
class ReportStats(BaseModel):
    kpi: DashboardKPI
    revenue_chart: List[ChartDataPoint]
    operation_chart: List[ChartDataPoint]
    patient_trend: List[ChartDataPoint]
    reference_stats: Optional[List[ChartDataPoint]] = None
    weekly_new_patients: Optional[List[ChartDataPoint]] = None


class ReferencePatient(BaseModel):
    id: str
    ad: str
    soyad: str
