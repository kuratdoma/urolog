"""
Consent Form Service — Onam Formu Kişiselleştirme Servisi

Önceden hazırlanmış PDF onam formlarını hastaya özel kişiselleştirir.
- İlk sayfada: HASTA ADI SOYADI ve PROTOKOL NO alanlarını doldurur
- Son/sondan önceki sayfada: Tarih, Saat ve Doktorun Adı Soyadı alanlarını doldurur

PyMuPDF (fitz) ile orijinal PDF'yi manipüle eder, düzeni bozmaz.
"""

import fitz
import io
import json
import logging
import os
from dataclasses import dataclass
from typing import List, Optional

logger = logging.getLogger(__name__)

# Resolve paths
_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
_CONSENT_FORMS_DIR = os.path.abspath(
    os.path.join(_CURRENT_DIR, "../../static/consent_forms")
)
_ASSETS_DIR = os.path.abspath(os.path.join(_CURRENT_DIR, "../assets/branding"))


@dataclass
class ConsentFormInfo:
    """Onam formu manifest bilgisi."""

    id: str
    filename: str
    display_name: str
    category: str
    usage_count: int = 0
    order_index: int = 0


@dataclass
class PatientConsentData:
    """PDF'e yazılacak hasta bilgileri."""

    hasta_adi_soyadi: str
    protokol_no: str
    doktor_adi_soyadi: str
    tarih: str  # "05/07/2026" formatında
    saat: str  # "14:30" formatında
    tc_kimlik: Optional[str] = None
    dogum_tarihi: Optional[str] = None
    sikayet: Optional[str] = None
    ozgecmis: Optional[str] = None
    ilaclar: Optional[str] = None
    allerjiler: Optional[str] = None
    sigara_durumu: Optional[str] = None
    karar: Optional[str] = None


class ConsentFormService:
    """Onam formu PDF kişiselleştirme servisi."""

    # Aranacak metin etiketleri
    LABEL_HASTA_ADI = "HASTA ADI SOYADI:"
    LABEL_PROTOKOL = "PROTOKOL NO:"
    LABEL_TARIH = "Tarih:"
    LABEL_DOKTOR = "Doktorun Adı Soyadı:"

    # Alternatif etiketler (bazı formlarda farklı yazılmış olabilir)
    ALT_LABEL_HASTA_ADI = "HASTA ADI SOYADI :"
    ALT_LABEL_PROTOKOL = "PROTOKOL NO :"

    def __init__(self):
        self._manifest: Optional[List[ConsentFormInfo]] = None
        self._font_path = self._discover_font()

    def _discover_font(self) -> Optional[str]:
        """Roboto Regular fontunu bulur."""
        font_path = os.path.join(_ASSETS_DIR, "Roboto-Regular.ttf")
        if os.path.exists(font_path):
            return font_path
        logger.warning("Roboto-Regular.ttf bulunamadı, varsayılan font kullanılacak.")
        return None

    def _discover_bold_font(self) -> Optional[str]:
        """Roboto Bold fontunu bulur."""
        font_path = os.path.join(_ASSETS_DIR, "Roboto-Bold.ttf")
        if os.path.exists(font_path):
            return font_path
        return None

    def _register_bold_font(self, page: fitz.Page) -> str:
        """Sayfaya Türkçe destekli bold font kaydeder, font adını döndürür."""
        bold_path = self._discover_bold_font()
        if bold_path:
            page.insert_font(fontname="tr-consent-bold", fontfile=bold_path)
            return "tr-consent-bold"
        return "Helvetica-Bold"

    def _load_manifest(self) -> List[ConsentFormInfo]:
        """manifest.json dosyasını yükler (önbellekleme yapılmaz, her seferinde diskten okunur)."""
        manifest_path = os.path.join(_CONSENT_FORMS_DIR, "manifest.json")
        if not os.path.exists(manifest_path):
            logger.error(f"Manifest dosyası bulunamadı: {manifest_path}")
            return []

        with open(manifest_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self._manifest = [
            ConsentFormInfo(
                id=item["id"],
                filename=item["filename"],
                display_name=item["display_name"],
                category=item.get("category", ""),
                usage_count=item.get("usage_count", 0),
                order_index=item.get("order_index", 0),
            )
            for item in data
        ]
        return self._manifest

    def _save_manifest(self, manifest: List[ConsentFormInfo]):
        """manifest.json dosyasını günceller ve kaydeder."""
        manifest_path = os.path.join(_CONSENT_FORMS_DIR, "manifest.json")
        data = [
            {
                "id": f.id,
                "filename": f.filename,
                "display_name": f.display_name,
                "category": f.category,
                "usage_count": f.usage_count,
                "order_index": f.order_index
            }
            for f in manifest
        ]
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        self._manifest = manifest

    def add_form(self, file_content: bytes, filename: str, display_name: str, category: str) -> dict:
        import uuid
        form_id = str(uuid.uuid4())

        # Save file
        file_path = os.path.join(_CONSENT_FORMS_DIR, filename)
        with open(file_path, "wb") as f:
            f.write(file_content)

        manifest = self._load_manifest()
        new_form = ConsentFormInfo(
            id=form_id,
            filename=filename,
            display_name=display_name,
            category=category,
            usage_count=0,
            order_index=0
        )
        manifest.append(new_form)
        self._save_manifest(manifest)

        return {
            "id": new_form.id,
            "display_name": new_form.display_name,
            "category": new_form.category,
            "usage_count": new_form.usage_count,
            "order_index": new_form.order_index
        }

    def delete_form(self, form_id: str) -> bool:
        manifest = self._load_manifest()
        for i, form in enumerate(manifest):
            if form.id == form_id:
                # Sil dosyayı (opsiyonel ama iyi olur)
                file_path = os.path.join(_CONSENT_FORMS_DIR, form.filename)
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except Exception as e:
                        logger.error(f"PDF silinirken hata: {e}")

                manifest.pop(i)
                self._save_manifest(manifest)
                return True
        return False

    def update_form(self, form_id: str, display_name: str, category: str) -> Optional[dict]:
        manifest = self._load_manifest()
        for form in manifest:
            if form.id == form_id:
                form.display_name = display_name
                form.category = category
                self._save_manifest(manifest)
                return {
                    "id": form.id,
                    "display_name": form.display_name,
                    "category": form.category,
                    "usage_count": form.usage_count,
                    "order_index": form.order_index
                }
        return None

    def list_forms(self) -> List[dict]:
        """Mevcut onam formlarını listeler."""
        manifest = self._load_manifest()

        def get_sort_key(f: ConsentFormInfo):
            priority = 0 if f.order_index > 0 else 1
            return (priority, f.order_index, -f.usage_count, f.display_name)

        manifest.sort(key=get_sort_key)

        return [
            {
                "id": form.id,
                "display_name": form.display_name,
                "category": form.category,
                "usage_count": form.usage_count,
                "order_index": form.order_index
            }
            for form in manifest
        ]

    def increment_usage(self, form_id: str):
        """Form kullanım sayısını 1 artırır."""
        manifest = self._load_manifest()
        for form in manifest:
            if form.id == form_id:
                form.usage_count += 1
                self._save_manifest(manifest)
                break

    def update_order(self, orders: List[dict]) -> bool:
        """Formların order_index değerlerini topluca günceller."""
        manifest = self._load_manifest()
        # orders: [{"id": "...", "order_index": 1}, ...]
        order_map = {item["id"]: item.get("order_index", 0) for item in orders}

        for form in manifest:
            if form.id in order_map:
                form.order_index = order_map[form.id]

        self._save_manifest(manifest)
        return True

    def _get_form_path(self, form_id: str) -> Optional[str]:
        """Form ID'sine göre PDF dosya yolunu döndürür."""
        manifest = self._load_manifest()
        for form in manifest:
            if form.id == form_id:
                path = os.path.join(_CONSENT_FORMS_DIR, form.filename)
                if os.path.exists(path):
                    return path
                logger.error(f"PDF dosyası bulunamadı: {path}")
                return None
        return None

    def _register_font(self, page: fitz.Page) -> str:
        """Sayfaya Türkçe destekli font kaydeder, font adını döndürür."""
        if self._font_path:
            page.insert_font(fontname="tr-consent", fontfile=self._font_path)
            return "tr-consent"
        return "Helvetica"

    def _find_and_fill_field(
        self,
        page: fitz.Page,
        label: str,
        value: str,
        fontname: str,
        fontsize: float = 11,
        alt_labels: Optional[List[str]] = None,
        offset_x: float = 5,
    ) -> bool:
        """
        Sayfada label metnini bulur ve sağına değeri yazar.
        """
        matched_label = label
        rects = page.search_for(label)

        if not rects and alt_labels:
            for alt in alt_labels:
                rects = page.search_for(alt)
                if rects:
                    matched_label = alt
                    break

        if not rects:
            return False

        rect = rects[0]

        # Eğer etiket "Ad-Soyad" ise, muhtemelen altında veya yanında ":" vardır, biraz daha sağa yazalım
        current_offset_x = offset_x
        if matched_label == "Ad-Soyad":
            current_offset_x = 35

        insert_point = fitz.Point(rect.x1 + current_offset_x, rect.y1)
        page.insert_text(
            insert_point,
            value,
            fontname=fontname,
            fontsize=fontsize,
            color=(0, 0, 0),
        )
        return True

    def _find_and_fill_tarih_saat(
        self,
        page: fitz.Page,
        tarih: str,
        saat: str,
        fontname: str,
        fontsize: float = 11,
    ) -> bool:
        """
        Tarih ve Saat alanlarını bulup doldurur.
        Format: "Tarih:............/.........../.............. Saat:......................."

        Tarih ve Saat aynı satırda, noktalı çizgiler üzerinde olabilir.
        """
        tarih_rects = []
        for t_label in [self.LABEL_TARIH, "TARİH:", "Tarih :", "TARİH :"]:
            tarih_rects = page.search_for(t_label)
            if tarih_rects:
                break

        if not tarih_rects:
            return False

        rect = tarih_rects[0]

        # Tarih değerini label'in sağına yaz
        tarih_point = fitz.Point(rect.x1 + 3, rect.y1)
        page.insert_text(
            tarih_point,
            tarih,
            fontname=fontname,
            fontsize=fontsize,
            color=(0, 0, 0),
        )

        # Saat'i bul (genellikle aynı satırda)
        saat_rects = []
        for s_label in ["Saat:", "SAAT:", "Saat :", "SAAT :"]:
            saat_rects = page.search_for(s_label)
            if saat_rects:
                break

        if saat_rects:
            saat_rect = saat_rects[0]
            saat_point = fitz.Point(saat_rect.x1 + 3, saat_rect.y1)
            page.insert_text(
                saat_point,
                saat,
                fontname=fontname,
                fontsize=fontsize,
                color=(0, 0, 0),
            )

        return True

    def _fill_clinical_notes(self, page: fitz.Page, data: PatientConsentData, fontname: str) -> bool:
        """Hekimin ek notları bölümüne klinik bilgileri yazar."""
        rects = page.search_for("Hekimin varsa ek notları:")
        if not rects:
            return False

        rect = rects[-1]

        notes = []
        if data.sikayet:
            notes.append(f"Şikayeti: {data.sikayet}")
        if data.ozgecmis:
            notes.append(f"ÖzGeçmiş: {data.ozgecmis}")
        if data.ilaclar:
            notes.append(f"İlaçlar: {data.ilaclar}")
        if data.allerjiler:
            notes.append(f"Allerjiler: {data.allerjiler}")
        if data.sigara_durumu:
            notes.append(f"Sigara durumu: {data.sigara_durumu}")
        if data.karar:
            notes.append(f"Sonuç / KARAR: {data.karar}")

        if not notes:
            return True

        text = "\n".join(notes)

        # Define a textbox area below the label
        y0 = rect.y1 + 5
        # Allow up to 150 points in height, constrain width
        textbox_rect = fitz.Rect(rect.x0, y0, page.rect.width - 30, y0 + 150)

        page.insert_textbox(
            textbox_rect,
            text,
            fontsize=9,
            fontname=fontname,
            color=(0, 0, 0),
            align=0  # left
        )
        return True

    def generate(self, form_id: str, patient_data: PatientConsentData) -> io.BytesIO:
        """
        Onam formunu hasta bilgileriyle kişiselleştirerek PDF stream döndürür.

        Args:
            form_id: Onam formu ID'si (manifest'teki id)
            patient_data: Hastaya ait bilgiler

        Returns:
            Kişiselleştirilmiş PDF BytesIO stream

        Raises:
            FileNotFoundError: Form ID'si geçersiz veya PDF bulunamadı
            ValueError: PDF işlenirken hata oluştu
        """
        form_path = self._get_form_path(form_id)
        if not form_path:
            raise FileNotFoundError(f"Onam formu bulunamadı: {form_id}")

        try:
            doc = fitz.open(form_path)
        except Exception as e:
            raise ValueError(f"PDF açılamadı: {e}")

        # --- Özel Durum: KVKK Onam Formu ---
        if form_id == "kvkk-onam-formu":
            for page_idx in range(len(doc)):
                page = doc[page_idx]
                fontname = self._register_font(page)
                bold_fontname = self._register_bold_font(page)

                # 1. Sol üst köşede bold olarak sadece ad soyad yaz
                page.insert_text(
                    fitz.Point(36, 18),
                    patient_data.hasta_adi_soyadi.upper(),
                    fontname=bold_fontname,
                    fontsize=10,
                    color=(0, 0, 0)
                )

                # 2. İkinci sayfadaki (son sayfa) form alanlarını doldur
                if page_idx == 1:
                    # Ad-Soyad bul ve doldur
                    rects_name = page.search_for("Ad-Soyad")
                    if rects_name:
                        name_text = patient_data.hasta_adi_soyadi
                        if patient_data.tc_kimlik:
                            name_text += f"   (T.C.: {patient_data.tc_kimlik})"
                        r = rects_name[0]
                        page.insert_text(
                            fitz.Point(175, r.y1),
                            name_text,
                            fontname=fontname,
                            fontsize=11,
                            color=(0, 0, 0)
                        )

                    # Tarih bul ve doldur (Tarih ve Saat)
                    rects_date = page.search_for("Tarih")
                    if rects_date:
                        date_text = f"{patient_data.tarih}  {patient_data.saat}"
                        r = rects_date[0]
                        page.insert_text(
                            fitz.Point(175, r.y1),
                            date_text,
                            fontname=fontname,
                            fontsize=11,
                            color=(0, 0, 0)
                        )

                # 3. Her sayfanın sol alt köşesine Ad Soyad, Tarih ve Saat bilgisi yaz (footer)
                footer_hasta_bilgi = patient_data.hasta_adi_soyadi
                if patient_data.tc_kimlik:
                    footer_hasta_bilgi += f" (TC: {patient_data.tc_kimlik})"
                footer_text = f"Hasta: {footer_hasta_bilgi} | Tarih: {patient_data.tarih} {patient_data.saat}"
                footer_point = fitz.Point(30, page.rect.height - 20)
                page.insert_text(
                    footer_point,
                    footer_text,
                    fontname=fontname,
                    fontsize=8,
                    color=(0.3, 0.3, 0.3)
                )

            # PDF'i BytesIO stream'e kaydet
            stream = io.BytesIO()
            doc.save(stream)
            doc.close()
            stream.seek(0)
            return stream

        filled_fields = []

        # --- İlk Sayfada: HASTA ADI SOYADI ve PROTOKOL NO ---
        # Tüm sayfalarda hasta adı ve protokol no alanlarını ara ve doldur
        first_page_filled = False
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            fontname = self._register_font(page)

            hasta_name = patient_data.hasta_adi_soyadi
            if patient_data.dogum_tarihi:
                hasta_name += f"   D.Tarihi: {patient_data.dogum_tarihi}"

            # Fontu büyüttük (11'den 13'e). Eğer çok uzunsa 11'e düşür.
            hasta_fontsize = 11 if len(hasta_name) > 40 else 13

            hasta_ok = self._find_and_fill_field(
                page,
                self.LABEL_HASTA_ADI,
                hasta_name,
                fontname,
                fontsize=hasta_fontsize,
                alt_labels=[self.ALT_LABEL_HASTA_ADI, "Ad-Soyad", "Hasta Adı Soyadı:", "Adı Soyadı:", "ADI SOYADI:", "ADI SOYADI :"],
            )
            protokol_ok = self._find_and_fill_field(
                page,
                self.LABEL_PROTOKOL,
                patient_data.protokol_no,
                fontname,
                fontsize=11,
                alt_labels=[self.ALT_LABEL_PROTOKOL, "Protokol No:", "PROTOKOL:", "PROTOKOL :", "Protokol:"],
            )

            if hasta_ok or protokol_ok:
                first_page_filled = True
                if hasta_ok:
                    filled_fields.append(f"HASTA ADI SOYADI (sayfa {page_idx + 1})")
                if protokol_ok:
                    filled_fields.append(f"PROTOKOL NO (sayfa {page_idx + 1})")

        if not first_page_filled:
            logger.warning(
                f"[{form_id}] İlk sayfalarda HASTA ADI SOYADI/PROTOKOL NO bulunamadı"
            )

        # --- Son/Sondan Önceki Sayfada: Tarih, Saat ve Doktor ---
        # Sondan 3 sayfaya bak
        sign_page_filled = False
        for page_idx in range(len(doc) - 1, max(len(doc) - 4, -1), -1):
            page = doc[page_idx]
            fontname = self._register_font(page)

            tarih_ok = self._find_and_fill_tarih_saat(
                page,
                patient_data.tarih,
                patient_data.saat,
                fontname,
                fontsize=11,
            )
            doktor_ok = self._find_and_fill_field(
                page,
                self.LABEL_DOKTOR,
                patient_data.doktor_adi_soyadi,
                fontname,
                fontsize=10,
            )

            if tarih_ok or doktor_ok:
                sign_page_filled = True
                if tarih_ok:
                    filled_fields.append(f"Tarih/Saat (sayfa {page_idx + 1})")
                if doktor_ok:
                    filled_fields.append(f"Doktor Adı Soyadı (sayfa {page_idx + 1})")
                break

        if not sign_page_filled:
            logger.warning(
                f"[{form_id}] Son sayfalarda Tarih/Doktor alanları bulunamadı"
            )

        logger.info(f"[{form_id}] Doldurulan alanlar: {filled_fields}")

        # --- Tüm Sayfalara Zaman Damgası ve Klinik Notlar ---
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            fontname = self._register_font(page)

            # Hekim Notlarını doldur
            self._fill_clinical_notes(page, patient_data, fontname)

            # Alt bilgi (zaman damgası)
            footer_hasta_bilgi = patient_data.hasta_adi_soyadi
            if patient_data.tc_kimlik:
                footer_hasta_bilgi += f" (TC: {patient_data.tc_kimlik})"

            footer_text = f"Hasta: {footer_hasta_bilgi} | Tarih: {patient_data.tarih} {patient_data.saat}"
            footer_point = fitz.Point(30, page.rect.height - 20)
            page.insert_text(
                footer_point,
                footer_text,
                fontname=fontname,
                fontsize=8,
                color=(0.3, 0.3, 0.3)
            )

        # PDF'i BytesIO stream'e kaydet
        stream = io.BytesIO()
        doc.save(stream)
        doc.close()
        stream.seek(0)
        return stream
