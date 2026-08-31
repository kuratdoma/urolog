"""
HPV Briefing service tests — PII masking before data reaches Gemini, and
the JSON-parse failure path (must raise, not silently build a fake-empty
briefing).
"""
import pytest

from app.services.hpv_briefing_service import HPVBriefingService


def _make_context(ad="Ahmet", soyad="Yılmaz"):
    return {
        "patient": {"ad": ad, "soyad": soyad, "yas": 34, "cinsiyet": "Erkek"},
        "examinations": [
            {
                "tarih": "01.01.2026",
                "sikayet": "TC: 12345678901 numaralı hastanın şikayeti",
                "oyku": "Tel: 05321234567 üzerinden ulaşıldı",
            }
        ],
        "operations": [],
        "followups": [],
        "medical_reports": [],
    }


def test_build_prompt_does_not_leak_patient_name():
    service = HPVBriefingService()
    context = _make_context(ad="Ahmet", soyad="Yılmaz")

    prompt = service._build_prompt(context)

    assert "Ahmet" not in prompt
    assert "Yılmaz" not in prompt


def test_build_prompt_masks_tc_kimlik_and_phone_in_free_text():
    service = HPVBriefingService()
    context = _make_context()

    prompt = service._build_prompt(context)

    assert "12345678901" not in prompt
    assert "05321234567" not in prompt
    assert "[ID_MASKED]" in prompt
    assert "[PHONE_MASKED]" in prompt


def test_format_records_section_masks_identifiers():
    service = HPVBriefingService()
    context = _make_context()

    records_text = service._format_records_section(context)

    assert "12345678901" not in records_text
    assert "05321234567" not in records_text


def test_parse_json_response_raises_on_unparseable_text():
    """Previously returned {} silently, letting _build_response construct
    a fake-empty-but-valid-looking briefing that could get cached and
    shown to a doctor as if it were real. Must now raise."""
    service = HPVBriefingService()

    with pytest.raises(ValueError):
        service._parse_json_response("bu hiç JSON değil, sadece düz metin")


def test_parse_json_response_still_parses_valid_json():
    service = HPVBriefingService()
    result = service._parse_json_response('{"partner_durumu": "Evli"}')
    assert result == {"partner_durumu": "Evli"}


def test_parse_json_response_extracts_embedded_json():
    service = HPVBriefingService()
    text = 'Sonuç:\n```json\n{"partner_durumu": "Bekar"}\n```\n'
    result = service._parse_json_response(text)
    assert result == {"partner_durumu": "Bekar"}


def test_build_response_parses_medikal_tedavi():
    service = HPVBriefingService()
    context = _make_context()
    ai_data = {
        "partner_durumu": "Evli",
        "sigara_durumu": "Kullanmıyor",
        "medikal_tedavi": {
            "ilac_verildi": True,
            "ilaclar": ["VELP", "AHCC", "Silvershell"],
            "kullanim_sekli": "Günde 1 kapsül x 3 ay",
            "notlar": "Bağışıklık destekleyici takviye başlandı."
        }
    }
    resp = service._build_response(ai_data, context)
    assert resp.medikal_tedavi.ilac_verildi is True
    assert resp.medikal_tedavi.ilaclar == ["VELP", "AHCC", "Silvershell"]
    assert resp.medikal_tedavi.kullanim_sekli == "Günde 1 kapsül x 3 ay"
    assert resp.medikal_tedavi.notlar == "Bağışıklık destekleyici takviye başlandı."
