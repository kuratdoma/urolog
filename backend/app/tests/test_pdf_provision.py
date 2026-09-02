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
        cinsiyet="Erkek",
        police_no="POL-998877",
        kart_musteri_no="KRT-5544",
        basvuru_tarihi="17.08.2026",
        sikayeti="İdrarda yanma ve sık idrara çıkma şikayeti.",
        oykusu="Yaklaşık 3 gündür devam eden dizüri ve polaküri.",
        sikayet_baslangic_tarihi="3 gün",
        daha_once_basvuru_var_mi="Hayır",
        gecmis_oyku_ilaclar="Hipertansiyon - Norvasc 5mg",
        fizik_muayene_bulgulari="Batın rahat, hassasiyet yok, KVAH (-/-)",
        tetkikler_sonuclari="Tam İdrar Tahlili: Lökosit (+), Bakteri (+)",
        giris_tipi="Poliklinik",
        on_tani_tani="Akut Sistit / İdrar Yolu Enfeksiyonu",
        icd10_kodu="N30.0",
        planlanan_tedavi_islem="Oral antibiyotik ve bol sıvı alımı",
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


def test_pdf_provision_female_patient_and_separate_fields():
    dto = InsuranceProvisionDTO(
        sigorta_sirketi="Axa Sigorta",
        sigortali_adi_soyadi="Ayşe Fatma Kaya",
        cinsiyet="Kadın",
        sikayeti="Sol yan ağrısı ve bulantı",
        oykusu="Aniden başlayan sol flank ağrısı",
        giris_tipi="Acil",
        on_tani_tani="Üreter Taşı",
        icd10_kodu="N20.1",
        planlanan_tedavi_islem="İntravenöz hidrasyon, analjezik ve Üreterorenoskopi (URS)",
        save_to_documents=False
    )
    service = PDFProvisionFormService(dto)
    pdf_stream = service.generate()
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


def test_pdf_provision_multiline_sikayet_oyku():
    dto = InsuranceProvisionDTO(
        sigorta_sirketi="Mapfre Sigorta",
        sigortali_adi_soyadi="Mehmet Demir",
        sikayet_oyku="Şikayet: Sol yan ağrısı ve hematüri\nÖykü: 3 gündür devam eden şiddetli kolik ağrı.",
        gecmis_oyku_ilaclar="Özgeçmiş: Hipertansiyon\nİlaçlar: Norvasc 5mg",
        fizik_muayene_bulgulari="Sol KVAH (+)",
        on_tani_tani="Üreter Taşı",
        icd10_kodu="N20.1",
        save_to_documents=False
    )
    service = PDFProvisionFormService(dto)
    pdf_stream = service.generate()
    pdf_bytes = pdf_stream.getvalue()

    assert len(pdf_bytes) > 0
    assert pdf_bytes.startswith(b"%PDF")
