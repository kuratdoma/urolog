from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime


class LabDataPoint(BaseModel):
    value: float
    date: datetime
    unit: str
    flag: Optional[str] = None  # 'normal', 'high', 'low', 'critical_rise'


class LabTrendResponse(BaseModel):
    test_name: str
    current_value: float
    unit: str
    trend_slope: float  # positive = rising
    is_critical: bool
    history: List[LabDataPoint]


class LabTrendRequest(BaseModel):
    patient_id: str
    test_names: List[str]  # ["PSA", "Kreatinin"]


# For AI Analysis Service (Legacy/Merged)
class LabAnalysisResponse(BaseModel):
    patient_name: Optional[str] = None
    report_date: Optional[str] = None
    results: List[Any] = []
    confidence_score: Optional[float] = None
