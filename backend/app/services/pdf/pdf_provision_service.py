import fitz
import io
import os
import logging
from typing import Optional, Tuple
from app.schemas.insurance_provision import InsuranceProvisionDTO

logger = logging.getLogger(__name__)


class PDFProvisionFormService:
    """
    Generates 'Özel Sağlık Sigortası Hasta Bilgi Formu' PDF matching exact template.
    Uses PyMuPDF (fitz) with Turkish character font support.
    """

    def __init__(self, data: InsuranceProvisionDTO):
        self.data = data
        self.doc = fitz.open()
        self.page = self.doc.new_page(width=595.32, height=841.89)  # A4

        # Assets & Font Discovery
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.assets_dir = os.path.abspath(
            os.path.join(current_dir, "../../assets/branding")
        )
        self.font_path, self.bold_font_path = self._discover_fonts()

        # Register Fonts
        if self.font_path:
            self.page.insert_font(fontname="tr", fontfile=self.font_path)
            self.primary_font = "tr"
        else:
            self.primary_font = "Helvetica"

        if self.bold_font_path:
            self.page.insert_font(fontname="tr-bold", fontfile=self.bold_font_path)
            self.bold_font = "tr-bold"
        else:
            self.bold_font = self.primary_font if self.font_path else "Helvetica-Bold"

    def _discover_fonts(self) -> Tuple[Optional[str], Optional[str]]:
        reg_path = os.path.join(self.assets_dir, "Roboto-Regular.ttf")
        bold_path = os.path.join(self.assets_dir, "Roboto-Bold.ttf")
        return (reg_path if os.path.exists(reg_path) else None,
                bold_path if os.path.exists(bold_path) else None)

    def _draw_rect(self, rect: fitz.Rect, fill=None, color=(0, 0, 0), width=0.75):
        shape = self.page.new_shape()
        shape.draw_rect(rect)
        shape.finish(color=color, fill=fill, width=width)
        shape.commit()

    def _draw_line(self, p1: Tuple[float, float], p2: Tuple[float, float], color=(0, 0, 0), width=0.75):
        shape = self.page.new_shape()
        shape.draw_line(p1, p2)
        shape.finish(color=color, width=width)
        shape.commit()

    def _insert_text(self, point: Tuple[float, float], text: str, fontsize=9, bold=False, color=(0, 0, 0)):
        if not text:
            return
        font = self.bold_font if bold else self.primary_font
        self.page.insert_text(point, text, fontname=font, fontsize=fontsize, color=color)

    def _insert_textbox(self, rect: fitz.Rect, text: str, fontsize=8.5, bold=False, color=(0, 0, 0), align=fitz.TEXT_ALIGN_LEFT):
        if not text or not str(text).strip():
            return
        font = self.bold_font if bold else self.primary_font
        # Clean whitespace per line but preserve line breaks
        lines = [" ".join(line.strip().split()) for line in str(text).splitlines() if line.strip()]
        clean_text = "\n".join(lines)
        if not clean_text:
            return

        # Adaptive fontsize calculation: test from fontsize down to 5.5 to guarantee no overflow
        chosen_size = fontsize
        temp_doc = fitz.open()
        temp_page = temp_doc.new_page()
        current_fs = fontsize
        while current_fs >= 5.5:
            rc = temp_page.insert_textbox(rect, clean_text, fontname="Helvetica", fontsize=current_fs)
            if rc >= 0:
                chosen_size = current_fs
                break
            current_fs -= 0.5
        else:
            chosen_size = 5.5
        temp_doc.close()

        self.page.insert_textbox(rect, clean_text, fontname=font, fontsize=chosen_size, color=color, align=align)

    def generate(self) -> io.BytesIO:
        """Draws the provision form and returns PDF BytesIO stream."""
        margin_l = 25.0
        margin_r = 570.0

        # 1. Main Title Header Box
        # Y: 25 -> 50
        title_rect = fitz.Rect(margin_l, 25, margin_r, 50)
        self._draw_rect(title_rect, fill=(0.92, 0.94, 0.96), color=(0.2, 0.2, 0.2), width=1.0)
        self._insert_text(
            (margin_l + 120, 42),
            "ÖZEL SAĞLIK SİGORTASI HASTA BİLGİ FORMU",
            fontsize=12,
            bold=True,
            color=(0.1, 0.1, 0.1)
        )

        # 2. Header Row (Sigorta Şirketi / Provizyon No)
        # Y: 54 -> 78
        header1_rect = fitz.Rect(margin_l, 54, margin_r, 78)
        self._draw_rect(header1_rect)
        self._insert_text((margin_l + 8, 70), "Sigorta Şirketi", bold=True, fontsize=8.5)
        self._insert_text((margin_l + 95, 70), f": {self.data.sigorta_sirketi or ''}", fontsize=8.5)

        self._insert_text((350, 70), "Provizyon No", bold=True, fontsize=8.5)
        self._insert_text((425, 70), f": {self.data.provizyon_no or ''}", fontsize=8.5)

        # 3. Sağlık Kurumu Tarafından Doldurulacak Bölüm
        # Y: 82 -> 260
        sec1_rect = fitz.Rect(margin_l, 82, margin_r, 260)
        self._draw_rect(sec1_rect)

        # Vertical sidebar on left (width: 15)
        sidebar1_rect = fitz.Rect(margin_l, 82, margin_l + 15, 260)
        self._draw_rect(sidebar1_rect, fill=(0.95, 0.95, 0.95))
        self.page.insert_text(
            (margin_l + 3, 135), "S\na\nğ\nl\nı\nk\n \nK\nu\nr\nu\nm\nu", fontname=self.bold_font, fontsize=7.5
        )

        content1_l = margin_l + 15  # 40.0
        # Horizontal lines inside Section 1
        rows1_y = [82, 112, 140, 168, 196, 224, 260]
        for y_pos in rows1_y[1:-1]:
            self._draw_line((content1_l, y_pos), (margin_r, y_pos))

        # Row 1: Sağlık Kuruluşu Adı | Kurum Kodu | Telefon No | Faks No
        self._insert_text((content1_l + 5, 96), "Sağlık Kuruluşu Adı", bold=True, fontsize=8)
        self._insert_textbox(fitz.Rect(content1_l + 5, 98, content1_l + 200, 110), self.data.saglik_kurulusu_adi or "PROF. DR. TAYYAR ALP ÖZKAN", fontsize=8.5, bold=True)

        self._draw_line((250, 82), (250, 112))
        self._insert_text((255, 100), "Kurum Kodu", bold=True, fontsize=8)
        self._insert_text((315, 100), f": {self.data.kurum_kodu or ''}", fontsize=8.5)

        self._draw_line((370, 82), (370, 112))
        self._insert_text((375, 96), "Telefon No", bold=True, fontsize=8)
        self._insert_text((375, 107), self.data.telefon_no or "262 321 0141", fontsize=8.5)

        self._draw_line((470, 82), (470, 112))
        self._insert_text((475, 96), "Faks No", bold=True, fontsize=8)
        self._insert_text((475, 107), self.data.faks_no or "", fontsize=8.5)

        # Row 2: Sigortalının Adı-Soyadı
        self._insert_text((content1_l + 5, 128), "Sigortalının Adı-Soyadı", bold=True, color=(0.8, 0, 0))
        self._insert_text((content1_l + 130, 128), f": {self.data.sigortali_adi_soyadi or ''}", bold=True)

        # Row 3: Doğum Tarihi | Cinsiyet (Erkek/Kadın Checkbox)
        self._insert_text((content1_l + 5, 156), "Doğum Tarihi", bold=True)
        self._insert_text((content1_l + 130, 156), f": {self.data.dogum_tarihi or ''}")
        self._insert_text((430, 156), "Cinsiyet :", bold=True)
        cinsiyet = (self.data.cinsiyet or "").lower()
        erkek_cb = "[X]" if any(k in cinsiyet for k in ["erkek", "bay", "e", "male"]) and "kad" not in cinsiyet and "bayan" not in cinsiyet else "[  ]"
        kadin_cb = "[X]" if any(k in cinsiyet for k in ["kadin", "kadın", "bayan", "k", "female"]) else "[  ]"
        self._insert_text((475, 151), f"{erkek_cb} Erkek", fontsize=8.5)
        self._insert_text((475, 163), f"{kadin_cb} Kadın", fontsize=8.5)

        # Row 4: Poliçe No | Kart / Müşteri No
        self._insert_text((content1_l + 5, 184), "Poliçe No", bold=True)
        self._insert_text((content1_l + 130, 184), f": {self.data.police_no or ''}")

        self._insert_text((400, 184), "Kart / Müşteri No :", bold=True)
        self._insert_text((485, 184), f"{self.data.kart_musteri_no or ''}")

        # Row 5: TC Kimlik No | E-Posta Adresi
        self._insert_text((content1_l + 5, 212), "TC Kimlik No", bold=True)
        self._insert_text((content1_l + 130, 212), f": {self.data.tc_kimlik_no or ''}")

        # Row 6: Başvuru Tarihi | Planlanan Yatış/Çıkış Tarihi
        self._insert_text((content1_l + 5, 244), "Başvuru Tarihi", bold=True, color=(0.8, 0, 0))
        self._insert_text((content1_l + 130, 244), f": {self.data.basvuru_tarihi or ''}")

        self._insert_text((360, 244), "Planlanan Yatış/Çıkış Tarihi :", bold=True, color=(0.8, 0, 0))
        self._insert_text((485, 244), f"{self.data.planlanan_yatis_cikis_tarihi or ''}")

        # 5. Muayene Eden Hekim Tarafından Doldurulacak Bölüm
        # Y: 268 -> 722
        sec2_rect = fitz.Rect(margin_l, 268, margin_r, 722)
        self._draw_rect(sec2_rect)

        # Sidebar 2
        sidebar2_rect = fitz.Rect(margin_l, 268, margin_l + 15, 722)
        self._draw_rect(sidebar2_rect, fill=(0.95, 0.95, 0.95))
        self.page.insert_text(
            (margin_l + 3, 360), "M\nu\na\ny\ne\nn\ne\n \nH\ne\nk\ni\nm", fontname=self.bold_font, fontsize=7.5
        )

        content2_l = margin_l + 15  # 40.0
        # Rows Y-coords inside Section 2
        r2_y = [268, 315, 362, 384, 440, 496, 556, 600, 646, 722]
        for y_pos in r2_y[1:-1]:
            self._draw_line((content2_l, y_pos), (margin_r, y_pos))

        # Determine sikayet and oyku texts (with fallback to composite sikayet_oyku)
        sikayet_text = (self.data.sikayeti or "").strip()
        oyku_text = (self.data.oykusu or "").strip()
        if not sikayet_text and not oyku_text and self.data.sikayet_oyku:
            raw_comp = self.data.sikayet_oyku.strip()
            if "Öykü:" in raw_comp:
                parts = raw_comp.split("Öykü:")
                sikayet_text = parts[0].replace("Şikayet:", "").strip()
                oyku_text = parts[1].strip()
            else:
                sikayet_text = raw_comp

        # Row 1a: Hastanın Şikâyeti (268 -> 315)
        self._insert_text((content2_l + 5, 278), "Hastanın Şikâyeti", bold=True, fontsize=8)
        self._insert_textbox(fitz.Rect(content2_l + 5, 280, margin_r - 5, 313), sikayet_text, fontsize=8.5)

        # Row 1b: Hastanın Öyküsü (315 -> 362)
        self._insert_text((content2_l + 5, 325), "Hastanın Öyküsü / Hikayesi", bold=True, fontsize=8)
        self._insert_textbox(fitz.Rect(content2_l + 5, 327, margin_r - 5, 360), oyku_text, fontsize=8.5)

        # Row 2: Şikâyetin Başlangıç Tarihi (362 -> 384)
        self._insert_text((content2_l + 5, 376), "Şikâyetin Başlangıç Tarihi :", bold=True, fontsize=8)
        self._insert_text((content2_l + 130, 376), f"{self.data.sikayet_baslangic_tarihi or ''}", fontsize=8.5)

        # Row 3: Özgeçmiş / Kullandığı İlaçlar (384 -> 440)
        self._insert_text((content2_l + 5, 394), "Özgeçmiş / Kullandığı İlaçlar", bold=True, fontsize=8)
        self._insert_textbox(fitz.Rect(content2_l + 5, 396, margin_r - 5, 438), self.data.gecmis_oyku_ilaclar or "", fontsize=8.5)

        # Row 4: Fizik Muayene Bulguları (440 -> 496)
        self._insert_text((content2_l + 5, 450), "Fizik Muayene Bulguları", bold=True, fontsize=8)
        self._insert_textbox(fitz.Rect(content2_l + 5, 452, margin_r - 5, 494), self.data.fizik_muayene_bulgulari or "", fontsize=8.5)

        # Row 5: Tetkikler / Sonuçları & Giriş Tipi Checkbox Grid (496 -> 556)
        self._insert_text((content2_l + 5, 506), "Tetkikler / Sonuçları", bold=True, fontsize=8)
        self._insert_textbox(fitz.Rect(content2_l + 5, 508, 440, 554), self.data.tetkikler_sonuclari or "", fontsize=8.5)

        # Checkbox Grid for Giriş Tipi on the right
        self._draw_line((450, 496), (450, 556))
        gt = (self.data.giris_tipi or "Poliklinik").lower()
        cb_poli = "[X]" if "poli" in gt else "[  ]"
        cb_cerrahi = "[X]" if "cerrahi" in gt else "[  ]"
        cb_acil = "[X]" if "acil" in gt else "[  ]"
        cb_dahili = "[X]" if "dahili" in gt else "[  ]"

        self._insert_text((455, 508), f"{cb_poli} Poliklinik", bold="poli" in gt, color=(0.8, 0, 0) if "poli" in gt else (0, 0, 0), fontsize=8)
        self._insert_text((455, 520), f"{cb_cerrahi} Cerrahi Yatış", bold="cerrahi" in gt, color=(0.8, 0, 0) if "cerrahi" in gt else (0, 0, 0), fontsize=8)
        self._insert_text((455, 532), f"{cb_acil} Acil", bold="acil" in gt, color=(0.8, 0, 0) if "acil" in gt else (0, 0, 0), fontsize=8)
        self._insert_text((455, 544), f"{cb_dahili} Dahili Yatış", bold="dahili" in gt, color=(0.8, 0, 0) if "dahili" in gt else (0, 0, 0), fontsize=8)

        # Row 6: Ön Tanı / Tanı | ICD 10 (556 -> 600)
        self._insert_text((content2_l + 5, 568), "Ön Tanı / Tanı", bold=True)
        self._insert_textbox(fitz.Rect(content2_l + 5, 570, 440, 598), self.data.on_tani_tani or "", fontsize=8.5)

        self._draw_line((450, 556), (450, 600))
        self._insert_text((455, 578), "ICD 10 :", bold=True)
        self._insert_text((500, 578), f"{self.data.icd10_kodu or ''}", fontsize=8.5)

        # Row 7: Planlanan Tedavi / İşlem (600 -> 646)
        self._insert_text((content2_l + 5, 612), "Planlanan Tedavi / İşlem / Plan", bold=True)
        self._insert_textbox(fitz.Rect(content2_l + 5, 614, margin_r - 5, 644), self.data.planlanan_tedavi_islem or "", fontsize=8.5)

        # Row 8: Dr Kaşe İmza (%50) | Anlaşma Durumu | Operatör / Anestezi / Asistan (646 -> 722)
        # Total width = 570 - 40 = 530. 50% = 265 -> x = 40 + 265 = 305
        stamp_split_x = 305.0
        self._draw_line((stamp_split_x, 646), (stamp_split_x, 722))
        self._insert_text((content2_l + 5, 660), "Dr. Kaşe İmza:", bold=True)

        # Anlaşma Durumu Box (305 to 385)
        anlasma_split_x = 385.0
        self._draw_line((anlasma_split_x, 645), (anlasma_split_x, 720))
        anlasma = (self.data.anlasma_durumu or "Anlaşmalı").lower()
        cb_anlas = "[X]" if "anlaşmasız" not in anlasma and ("anlasmali" in anlasma or "anlaşmalı" in anlasma) else "[  ]"
        cb_anlas_degil = "[X]" if "anlaşmasız" in anlasma or "anlasmasiz" in anlasma else "[  ]"

        self._insert_text((stamp_split_x + 5, 675), f"{cb_anlas} Anlaşmalı", fontsize=7.5)
        self._insert_text((stamp_split_x + 5, 695), f"{cb_anlas_degil} Anlaşmasız (*)", fontsize=7.5)

        # Team fields: Operatör, Anestezi, Asistan (385 to 570 -> 185pt wide space)
        self._insert_text((anlasma_split_x + 5, 663), "Operatör :", bold=True, fontsize=8)
        self._insert_textbox(fitz.Rect(anlasma_split_x + 52, 652, margin_r - 3, 670), f"{self.data.operator or ''}", fontsize=8)

        self._insert_text((anlasma_split_x + 5, 683), "Anestezi :", bold=True, fontsize=8)
        self._insert_textbox(fitz.Rect(anlasma_split_x + 52, 672, margin_r - 3, 690), f"{self.data.anestezi or ''}", fontsize=8)

        self._insert_text((anlasma_split_x + 5, 703), "Asistan   :", bold=True, fontsize=8)
        self._insert_textbox(fitz.Rect(anlasma_split_x + 52, 692, margin_r - 3, 715), f"{self.data.asistan or ''}", fontsize=8)

        # 6. Sigortalı / Kanuni Temsilcisinin Beyanı
        # Y: 725 -> 810
        sec3_rect = fitz.Rect(margin_l, 725, margin_r, 810)
        self._draw_rect(sec3_rect)

        self._insert_text((margin_l + 5, 737), "Sigortalı / Kanuni Temsilcisinin Beyanı", bold=True, fontsize=8.5)
        beyan_text = (
            "Yukarıda verilen bilgilerin eksiksiz ve doğru olduğunu, sigorta şirketinin kendim ve bağımlılarım hakkında "
            "bu / diğer rahatsızlıklara ilişkin tüm bilgi / belgeleri, tüm sağlık kuruluşlarından isteme hakkı olduğunu beyan / kabul ederim."
        )
        self._insert_textbox(fitz.Rect(margin_l + 5, 740, margin_r - 5, 770), beyan_text, fontsize=7.5)

        self._insert_text((margin_l + 5, 782), "Sigortalı / Kanuni Temsilcisinin", bold=True, fontsize=8)
        self._insert_text((margin_l + 5, 794), f"Tarih : {self.data.tarih or ''}", fontsize=8)

        self._insert_text((240, 782), f"Adı Soyadı : {self.data.sigortali_adi_soyadi or ''}", fontsize=8)
        self._insert_text((240, 794), "İmza          :", fontsize=8)

        # Save PDF to BytesIO stream
        pdf_stream = io.BytesIO()
        self.doc.save(pdf_stream)
        self.doc.close()
        pdf_stream.seek(0)
        return pdf_stream
