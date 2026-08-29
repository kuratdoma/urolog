import json
from typing import Optional
from google import genai
from google.genai import types
from app.core.config import settings
from app.schemas.lab_analysis import (
    LabAnalysisResponse,
    LabTrendRequest,
    LabTrendResponse,
    LabDataPoint,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from datetime import datetime, date, time
from app.repositories.clinical.models import TetkikSonuc
from app.core.text_utils import normalize_turkish


class LabAnalysisService:
    def __init__(self):
        self.api_key = settings.GOOGLE_API_KEY
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
            self.model = "gemini-1.5-flash"
        else:
            self.client = None
            self.model = None

    async def analyze_lab_file(
        self, file_content: bytes, mime_type: str
    ) -> LabAnalysisResponse:
        """
        Analyzes a lab report file (PDF or Image) and extracts structured data.
        """
        if not self.model:
            raise ValueError("Gemini API key not configured")

        prompt = """
        You are an expert medical data extractor.
        Analyze this laboratory report and extract the test results into a structured JSON format.

        CRITICAL INSTRUCTION:
        For each test category (e.g., BİYOKİMYA, HORMON-ELİSA, HEMOGRAM, TAM İDRAR TAHLİLİ, SEDİMANTASYON vb.), there is often a specific "Uzman Onay Zamanı" listed on the PDF.
        You MUST extract this "Uzman Onay Zamanı" and include it for EVERY test belonging to that category in the `report_date` field.
        Format it as "DD-MM-YYYY HH:MM:SS" (or whatever precision is available, e.g., "DD-MM-YYYY HH:MM").

        Extract the following fields for each test:
        - test_name: Name of the test (e.g., Glucose, WBC, PSA). Normalize into standard Turkish medical terms if possible.
        - result_value: The numeric or text result.
        - unit: The unit of measurement (e.g., mg/dL, %).
        - reference_range: The reference range provided.
        - is_abnormal: Boolean (true/false) if the report indicates it's out of range (H/L flags, bold text, etc.).
        - category: Guess the category (Biyokimya, Hematoloji, Hormon, İdrar, vb.).
        - report_date: The "Uzman Onay Zamanı" specific to the group this test belongs to. Format DD-MM-YYYY HH:MM:SS or DD-MM-YYYY HH:MM if available. Fallback to report generation date.

        Also extract:
        - patient_name: Name of the patient if visible.
        - report_date: The overall report date in DD-MM-YYYY format.

        Return ONLY raw JSON. No markdown formatting.
        Structure:
        {
          "patient_name": "...",
          "report_date": "...",
          "results": [
            { "test_name": "...", "result_value": "...", "unit": "...", "reference_range": "...", "is_abnormal": true/false, "category": "...", "report_date": "..." },
            ...
          ]
        }
        """

        try:
            file_part = types.Part.from_bytes(data=file_content, mime_type=mime_type)

            response = self.client.models.generate_content(
                model=self.model, contents=[prompt, file_part]
            )

            cleaned_text = response.text.strip()
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]

            data = json.loads(cleaned_text.strip())

            return LabAnalysisResponse(
                patient_name=data.get("patient_name"),
                report_date=data.get("report_date"),
                results=data.get("results", []),
                confidence_score=0.95,  # Mock confidence for now
            )

        except Exception as e:
            print(f"Lab Analysis Error: {str(e)}")
            raise ValueError(f"Failed to analyze lab file: {str(e)}")

    async def get_lab_trends(
        self, db: AsyncSession, request: LabTrendRequest
    ) -> List[LabTrendResponse]:
        """
        Fetch historical lab data from TetkikSonuc (Clinical Shard) and calculate trends.
        """
        # Expand test names to include known synonyms for better query coverage
        expanded_names = []
        for name in request.test_names:
            expanded_names.extend(self._get_test_synonyms(name))

        # Fetch from TetkikSonuc (New Unified Storage)
        stmt = (
            select(TetkikSonuc)
            .where(
                TetkikSonuc.hasta_id == request.patient_id,
                TetkikSonuc.tetkik_adi.in_(expanded_names),
                TetkikSonuc.is_deleted == False,
            )
            .order_by(TetkikSonuc.tarih.asc())
        )

        res = await db.execute(stmt)
        rows = res.scalars().all()

        # Combine and group by canonical test name
        grouped_data: Dict[str, List[LabDataPoint]] = {
            self._normalize_test_name(name): [] for name in request.test_names
        }

        for row in rows:
            val = self._parse_numeric(row.sonuc)
            canonical_name = self._normalize_test_name(row.tetkik_adi)
            if val is not None and canonical_name in grouped_data:
                # Handle potential timezone naive/aware conversion
                d = row.tarih if row.tarih else datetime.min
                if isinstance(d, date) and not isinstance(d, datetime):
                    d = datetime.combine(d, time.min)

                grouped_data[canonical_name].append(
                    LabDataPoint(
                        value=val,
                        date=d,
                        unit=self._normalize_unit(row.birim or ""),
                        flag=row.sembol,
                    )
                )

        responses = []
        for test_name, history in grouped_data.items():
            if not history:
                continue

            # Sort by date
            history.sort(key=lambda x: x.date)

            # Normalize all points to the same unit (of the latest result)
            target_unit = history[-1].unit
            for point in history:
                point.value = self._convert_unit(
                    test_name, point.value, point.unit, target_unit
                )
                point.unit = target_unit

            # Calculate metrics
            current = history[-1]
            slope = self._calculate_slope([h.model_dump() for h in history])

            # PSA Critical flag removed per user request
            is_critical = False

            responses.append(
                LabTrendResponse(
                    test_name=test_name,
                    current_value=current.value,
                    unit=current.unit,
                    trend_slope=slope,
                    is_critical=is_critical,
                    history=history,
                )
            )

        return responses

    def _get_test_synonyms(self, test_name: str) -> List[str]:
        """Get all known variations for a test name to broaden search"""
        normalized = self._normalize_test_name(test_name)

        # Map canonical to variants
        synonyms = {
            "PSA (Total)": [
                "PSA (Total)",
                "PSA TOTAL",
                "Total PSA",
                "T.PSA",
                "tPSA",
                "PSA",
                "PSA TOTAL (TPSA)",
                "PROSTAT SPESIFIK ANTIJEN",
                "PROSTAT SPESIFIK ANTIJEN TOTAL",
                "TOTAL PROSTAT SPESIFIK ANTIJEN",
            ],
            "PSA (Serbest)": [
                "PSA (Serbest)",
                "PSA SERBEST",
                "Serbest PSA",
                "Free PSA",
                "fPSA",
                "sPSA",
                "S.PSA",
                "SERBEST PROSTAT SPESIFIK ANTIJEN",
                "FREE PROSTAT SPESIFIK ANTIJEN",
                "PROSTAT SPESIFIK ANTIJEN SERBEST",
                "PROSTAT SPESIFIK ANTIJEN FREE",
            ],
            "Testosteron (Total)": [
                "Testosteron (Total)",
                "TOTAL TESTOSTERON",
                "TESTOSTERONE",
                "Total Testosterone",
                "tTesto",
            ],
            "Testosteron (Serbest)": [
                "Testosteron (Serbest)",
                "SERBEST TESTOSTERON",
                "Free Testosterone",
                "fTesto",
                "sTesto",
            ],
            "Kreatinin": ["Kreatinin", "Creatinine", "CREA"],
            "Üre": ["Üre", "Urea", "BUN"],
        }

        return synonyms.get(normalized, [test_name, normalized])

    def _normalize_test_name(self, test_name: str) -> str:
        """Map raw test name to canonical version"""
        if not test_name:
            return ""

        n = test_name.upper().strip()

        # Normalize Turkish characters
        n = normalize_turkish(n)

        # Convert "PROSTAT SPESİFİK ANTİJEN" variations to "PSA"
        if "PROSTAT" in n and ("ANT" in n or "SPEC" in n or "SPES" in n):
            if "SERBEST" in n or "FREE" in n or "FPSA" in n:
                return "PSA (Serbest)"
            return "PSA (Total)"

        # PSA Mapping
        if "SERBEST" in n and "PSA" in n:
            return "PSA (Serbest)"
        if "FREE" in n and "PSA" in n:
            return "PSA (Serbest)"
        if "FPSA" in n or "SPSA" in n:
            return "PSA (Serbest)"

        if "TOTAL" in n and "PSA" in n:
            return "PSA (Total)"
        if "TPSA" in n:
            return "PSA (Total)"
        if n == "PSA":
            return "PSA (Total)"  # Assume Total if just PSA

        # Testosterone Mapping
        if "SERBEST" in n and ("TESTO" in n or "TESTOSTERON" in n):
            return "Testosteron (Serbest)"
        if "FREE" in n and ("TESTO" in n or "TESTOSTERON" in n):
            return "Testosteron (Serbest)"

        if "TOTAL" in n and ("TESTO" in n or "TESTOSTERON" in n):
            return "Testosteron (Total)"
        if n in ["TESTOSTERON", "TESTOSTERONE"]:
            return "Testosteron (Total)"

        # Urological Staples
        if n in ["CREA", "CREATININE", "KREATININ"]:
            return "Kreatinin"
        if n in ["UREA", "BUN", "URE", "ÜRE"]:
            return "Üre"

        return test_name.strip()

    def _parse_numeric(self, s: Any) -> Optional[float]:
        """Exctract numeric value from string safely"""
        if s is None:
            return None
        try:
            # Clean: space, comma to dot, remove < > prefixes
            clean_s = str(s).replace(",", ".").replace("<", "").replace(">", "").strip()
            # Handle cases like "4.5 ng/ml" - take first part
            parts = clean_s.split()
            if parts:
                return float(parts[0])
            return None
        except (ValueError, TypeError):
            return None

    def _normalize_unit(self, unit: str) -> str:
        """Standardize unit expression"""
        if not unit:
            return ""
        u = unit.lower().strip()
        mapping = {
            "ng/ml": "ng/mL",
            "ng/dl": "ng/dL",
            "mg/dl": "mg/dL",
            "ug/l": "µg/L",
            "u/l": "U/L",
        }
        return mapping.get(u, unit)

    def _convert_unit(
        self, test_name: str, value: float, from_unit: str, to_unit: str
    ) -> float:
        """Convert values between units if needed"""
        if not from_unit or not to_unit or from_unit == to_unit:
            return value

        # Example: PSA ng/mL to ng/dL (unlikely but for robustness)
        # 1 ng/mL = 100 ng/dL
        f = from_unit.lower()
        t = to_unit.lower()

        if f == "ng/ml" and t == "ng/dl":
            return value * 100
        if f == "ng/dl" and t == "ng/ml":
            return value / 100

        return value

    def _calculate_slope(self, data: List[Dict[str, Any]]) -> float:
        """Calculate slope (unit change per month)"""
        if len(data) < 2:
            return 0.0

        start = data[0]
        end = data[-1]

        if not isinstance(start["date"], datetime) or not isinstance(
            end["date"], datetime
        ):
            return 0.0

        days = (end["date"] - start["date"]).days
        if days <= 0:
            return 0.0

        change = end["value"] - start["value"]
        # Normalize to monthly change (30 days)
        return (change / days) * 30.0


# Singleton instance
_lab_service = LabAnalysisService()


def get_lab_analysis_service():
    return _lab_service
