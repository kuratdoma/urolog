from typing import List, Optional
from pydantic import BaseModel


# Total Patients KPI
class TotalPatientsKPI(BaseModel):
    value: int
    growth: float
    trend: str


# Occupancy KPI
class OccupancyBreakdown(BaseModel):
    examination: int
    control: int


class OccupancyKPI(BaseModel):
    rate: float
    filled: int
    total: int
    breakdown: OccupancyBreakdown


# Pending Labs KPI
class PendingLabsKPI(BaseModel):
    count: int
    urgent: int


# Future Appointments KPI
# Future Appointments KPI (Renamed/Expanded to Statistics)
class Statistics(BaseModel):
    # Today
    today_new_patients: int
    today_appointments: int

    # This Week
    week_new_patients: int
    week_appointments: int

    # This Month
    month_new_patients: int
    month_appointments: int

    # Last Month
    last_month_new_patients: int
    last_month_appointments: int

    # --- Muayene sayımları (muayeneler tablosu) ---
    # Varsayılanlı: sahadaki eski istemciler bu alanları bilmez, yeni istemci de
    # backend güncellenmeden önce çalışmak zorunda.
    month_examinations: int = 0                # Bu ay: ayın 1'inden bugüne
    last_month_examinations: int = 0           # Geçen ayın TAMAMI
    last_year_month_examinations: int = 0      # Geçen yılın aynı ayı, TAM AY
    month_examination_daily_avg: float = 0.0   # Bu ay / muayene YAPILAN gün sayısı

    # --- Bu ayın randevu tipi kırılımı ---
    month_exam_appointments: int = 0           # type ILIKE '%Muayene%'
    month_control_appointments: int = 0        # type ILIKE '%Kontrol%'

    # --- Yılbaşından bugüne (YTD) ---
    ytd_new_patients: int = 0
    ytd_examinations: int = 0
    ytd_operations: int = 0


# En sık tanı (bu ay)
class TopDiagnosis(BaseModel):
    name: str
    count: int


class DashboardSummary(BaseModel):
    # Keeping old fields for compatibility but can deprecate meaningful ones later
    totalPatients: Optional[TotalPatientsKPI] = None
    occupancy: Optional[OccupancyKPI] = None
    pendingLabs: Optional[PendingLabsKPI] = None

    # New Stats
    statistics: Statistics

    # Bu ayın en sık 5 tanısı, azalan sırada
    topDiagnoses: List[TopDiagnosis] = []


# Heatmap
class HeatmapCell(BaseModel):
    day: str
    hour: str
    value: int
    intensity: str


# Recent Activity
class RecentActivity(BaseModel):
    id: str  # keeping as string for frontend compatibility, though DB might be int
    patientName: str
    protocolNo: str
    procedure: str
    doctor: str
    time: str
    status: str
    patientId: Optional[str] = None


class DashboardData(BaseModel):
    summary: DashboardSummary
    heatmap: List[HeatmapCell]
    recentActivity: List[RecentActivity]
