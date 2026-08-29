import pytest
from app.schemas.insurance_provision import InsuranceProvisionDTO
from app.services.pdf.pdf_provision_service import PDFProvisionFormService

def test_pdf_provision_form_service_generate():
    dto = InsuranceProvisionDTO(
        sigorta_sirketi="Allianz Sigorta",
        provizyon_no="PRV-123456",
        irtibat_tel="0212 555 1234",
        sigortali_adi_soyadi="Ahmet Yılmaz",
        tc_kimlik_no="12345678901",
        dogum_tarihi="15.05.1980",
        cinsiyet="Bay",
        police_no="POL-998877",
        kart_musteri_no="KRT-5544",
        basvuru_tarihi="17.08.2026",
        sikayet_oyku="Dysuria and lower back pain.",
        sikayet_baslangic_tarihi="3 gün",
        daha_once_basvuru_var_mi="Hayır",
        gecmis_oyku_ilaclar="Hypertension - Arlevert",
        fizik_muayene_bulgulari="Abdomen soft, non-tender",
        tetkikler_sonuclari="PSA: 1.2, USG: Normal",
        giris_tipi="Poliklinik",
        on_tani_tani="BPH / Prostatit",
        icd10_kodu="N40",
        planlanan_tedavi_islem="Medical Therapy",
        anlasma_durumu="Anlaşmalı",
        operator="Prof. Dr. Tayyar Alp Özkan",
        tarih="17.08.2026"
    )

    service = PDFProvisionFormService(dto)
    pdf_stream = service.generate()

    assert pdf_stream is not None
    pdf_bytes = pdf_stream.getvalue()
    assert len(pdf_bytes) > 0
    assert pdf_bytes.startswith(b"%PDF")

def test_pdf_provision_turkish_characters_and_empty_fields():
    dto = InsuranceProvisionDTO(
        sigorta_sirketi="Bupa Acıbadem Sigorta A.Ş. ĞÜŞİÖÇğüşiöç",
        sigortali_adi_soyadi="Çağrı Öztürk Iğdır",
        sikayet_oyku="Şiddetli böbrek ağrısı ve sık idrara çıkma şikayeti var. Çözüm arıyor.",
        on_tani_tani="Böbrek Taşı (N20.0)",
        save_to_documents=False
    )
    service = PDFProvisionFormService(dto)
    pdf_stream = service.generate()
    pdf_bytes = pdf_stream.getvalue()

    assert len(pdf_bytes) > 0
    assert pdf_bytes.startswith(b"%PDF")
