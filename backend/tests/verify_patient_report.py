
import unittest
import os
import sys
import uuid
from datetime import datetime, date
from unittest.mock import MagicMock

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.pdf_report_service import PDFReportService
from app.schemas.patient_report import PatientReportDTO, PatientDemographics, ExaminationSummary, LabResultSummary, FinanceSummary

class TestPatientReport(unittest.TestCase):
    def test_report_generation(self):
        # Create dummy data with Turkish characters
        report = PatientReportDTO(
            generated_at=datetime.now(),
            demographics=PatientDemographics(
                id=uuid.uuid4(),
                ad="Çağrı", soyad="Öztürk", tc_kimlik="12345678901", 
                protokol_no="PROTO-1", dogum_tarihi=date(1980, 1, 1)
            ),
            examinations=[
                ExaminationSummary(id=uuid.uuid4(), tarih=date(2025, 1, 1), on_tani="Şüpheli Tanı", sikayet="Çok şiddetli ağrı ve yanma şikayeti var.")
            ],
            lab_results=[],
            finance_summary=FinanceSummary(total_income=200, total_expense=100, balance=100.50, last_payment_date=date(2025, 1, 15)),
            warnings=[]
        )
        
        service = PDFReportService(report)
        
        # Benchmark
        start_time = datetime.now()
        stream = service.generate()
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        print(f"PDF Generation Time: {duration:.4f}s")
        self.assertLess(duration, 2.0, "PDF generation took too long (>2s)")
        
        # Verify stream content
        import fitz
        doc = fitz.open(stream=stream, filetype="pdf")
        self.assertGreater(len(doc), 0)
        page = doc[0]
        text = page.get_text()
        
        # Verify Content
        self.assertIn("Çağrı Öztürk", text, "Turkish characters in name failed")
        self.assertIn("Şüpheli Tanı", text, "Turkish characters in diagnosis failed")
        self.assertIn("Çok şiddetli ağrı", text, "Turkish characters in complaint failed")
        self.assertIn("100.50 TL", text)
        self.assertIn("UroLog Secure PDF", text)

if __name__ == '__main__':
    unittest.main()
