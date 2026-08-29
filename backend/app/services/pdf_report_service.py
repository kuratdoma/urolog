import io
import logging
from app.schemas.patient_report import PatientReportDTO
from app.services.pdf.base import BasePDFService
from app.services.pdf.utils import wrap_text

logger = logging.getLogger(__name__)


class PDFReportService(BasePDFService):
    """
    Refactored service for patient reports using standardized BasePDFService.
    Supports Turkish characters and multi-page layouts natively.
    """

    def __init__(self, report: PatientReportDTO):
        super().__init__(title="UroLog Klinik Hasta Raporu")
        self.report = report

    def generate(self) -> io.BytesIO:
        """Main entry point to generate the report."""
        # 1. Report Metadata
        self.draw_key_value(
            "Rapor Tarihi",
            self.report.generated_at.strftime("%d.%m.%Y %H:%M"),
            x_offset=0,
        )
        self.y += 10

        # 2. Warnings
        if self.report.warnings:
            self.check_page_break(20)
            self._insert_text(
                (self.margin, self.y),
                "⚠️ UYARI: Veri Erişim Sorunları",
                bold=True,
                fontsize=10,
                color=(1, 0, 0),
            )
            self.y += 15
            for warning in self.report.warnings:
                self.draw_key_value("-", warning, x_offset=15)
            self.y += 10

        # 3. Demographics
        if self.report.demographics:
            self.draw_section_title("Hasta Bilgileri")
            d = self.report.demographics
            self.draw_key_value("Ad Soyad", f"{d.ad} {d.soyad}")
            self.draw_key_value("T.C. Kimlik", d.tc_kimlik)
            self.draw_key_value("Protokol No", d.protokol_no)
            self.draw_key_value(
                "Doğum Tarihi",
                d.dogum_tarihi.strftime("%d.%m.%Y") if d.dogum_tarihi else "N/A",
            )
            self.y += 10

        # 4. Clinical History
        self.draw_section_title("Klinik Geçmiş (Son Muayeneler)")
        if self.report.examinations:
            for exam in self.report.examinations:
                self.check_page_break(50)
                # Header for exam
                date_str = exam.tarih.strftime("%d.%m.%Y")
                self._insert_text(
                    (self.margin + 5, self.y), f"• {date_str}", bold=True, fontsize=10
                )
                self.y += 12

                # Diagnosis
                tani = exam.on_tani or "Tanı belirtilmedi"
                self.draw_key_value("Tanı", tani, x_offset=20)

                # Complaints (with word wrap)
                if exam.sikayet:
                    lines = wrap_text(
                        f"Şikayet: {exam.sikayet}",
                        self.primary_font,
                        9,
                        self.width - 30,
                        font_path=self.font_path,
                    )
                    for line in lines:
                        self.check_page_break(12)
                        self._insert_text((self.margin + 20, self.y), line, fontsize=9)
                        self.y += 11
                self.y += 5
        else:
            self.draw_key_value("-", "Kayıtlı muayene bulunamadı.", x_offset=10)

        # 5. Laboratory
        self.draw_section_title("Laboratuvar Sonuçları")
        if self.report.lab_results:
            for lab in self.report.lab_results:
                self.check_page_break(15)
                lab_str = f"{lab.tarih.strftime('%d.%m.%Y')} | {lab.test_adi}: {lab.sonuc} {lab.birim or ''}"
                self.draw_key_value("-", lab_str, x_offset=10)
        else:
            self.draw_key_value("-", "Kayıtlı sonuç bulunamadı.", x_offset=10)

        # 6. Finance
        self.draw_section_title("Finansal Özet")
        if self.report.finance_summary:
            f = self.report.finance_summary
            self.draw_key_value("Toplam Bakiye", f"{f.balance:,.2f} TL")
            if f.last_payment_date:
                self.draw_key_value(
                    "Son Ödeme", f.last_payment_date.strftime("%d.%m.%Y")
                )
        else:
            self.draw_key_value(
                "Not", "Finansal veriler bu raporda kısıtlıdır.", x_offset=10
            )

        return self.save()

    @staticmethod
    def generate_patient_report_pdf(report: PatientReportDTO) -> io.BytesIO:
        """Legacy static entry point for compatibility."""
        service = PDFReportService(report)
        return service.generate()
