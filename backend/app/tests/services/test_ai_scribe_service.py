import pytest
from unittest.mock import AsyncMock

from app.services.ai_scribe_service import AIScribeService
from app.schemas.ai_scribe import AIScribeMode

def test_build_template_prompt_default_persona(ai_scribe_service: AIScribeService):
    prompt = ai_scribe_service._build_template_prompt(template_name=None, persona="default")
    assert "Standart resmi klinik üslup" in prompt
    assert "C-3PO MODU AKTİF" not in prompt

def test_build_template_prompt_c3po_persona(ai_scribe_service: AIScribeService):
    prompt = ai_scribe_service._build_template_prompt(template_name=None, persona="c3po")
    assert "C-3PO MODU AKTİF" in prompt
    assert "TÜM KLİNİK NOT BÜYÜK HARFLE YAZILACAKTIR" in prompt
    assert "KISALTMALAR BOLCA KULLANILACAKTIR" in prompt


# --- polish_letter (consultation report "AI İLE DÜZENLE") ---

class TestDetectFactDrift:
    def test_no_drift_when_numbers_preserved(self, ai_scribe_service: AIScribeService):
        # Not: sayı token'ları basit bir regex ile karşılaştırılır ("." veya
        # "," ondalık ayracı sayılır); tarih formatı değiştirmek (ör.
        # 2024-01-05 -> 05.01.2024) token'ların birleşme şeklini
        # değiştirebileceğinden test aynı formatı korur.
        original = "Hastaya 5 Ocak 2024 tarihinde 500 mg dozunda ilaç başlandı, PSA 4.2 idi."
        polished = "Hastaya 5 Ocak 2024 tarihinde 500 mg dozunda ilaç başlanmış olup PSA değeri 4.2'dir."
        assert ai_scribe_service._detect_fact_drift(original, polished) is False

    def test_drift_flagged_when_a_number_disappears(self, ai_scribe_service: AIScribeService):
        original = "Hastaya günde 2 kez 500 mg dozunda ilaç verildi, PSA 4.2 idi."
        polished = "Hastaya günde ilaç verilmiş, PSA değeri normaldi."
        assert ai_scribe_service._detect_fact_drift(original, polished) is True

    def test_no_drift_when_polished_adds_extra_numbers(self, ai_scribe_service: AIScribeService):
        # Fazladan sayı eklenmesi (ör. madde numaralandırması) bir tekst
        # kaybı değildir; heuristic sadece kaybolan sayıları yakalamalı.
        original = "PSA 4.2 idi."
        polished = "1. PSA değeri 4.2 olarak ölçüldü."
        assert ai_scribe_service._detect_fact_drift(original, polished) is False

    def test_no_drift_on_empty_strings(self, ai_scribe_service: AIScribeService):
        assert ai_scribe_service._detect_fact_drift("", "") is False


class TestBuildPolishPrompt:
    def test_prompt_forbids_content_changes(self, ai_scribe_service: AIScribeService):
        prompt = ai_scribe_service._build_polish_prompt()
        assert "EKLEME, ÇIKARMA ya da DEĞİŞTİRME" in prompt
        assert "polished_text" in prompt


class TestPolishLetterPiiMasking:
    @pytest.mark.asyncio
    async def test_tc_kimlik_and_phone_are_masked_before_reaching_gemini(
        self, ai_scribe_service: AIScribeService
    ):
        draft = "Hastamızın T.C. kimlik no 12345678901, telefon 0532 123 45 67."
        ai_scribe_service.gemini_provider.is_available = lambda: True
        captured = {}

        async def fake_analyze_text(text, prompt):
            captured["text"] = text
            return {"polished_text": "düzenlenmiş metin"}

        ai_scribe_service.gemini_provider.analyze_text = fake_analyze_text

        await ai_scribe_service.polish_letter(draft_text=draft, mode=AIScribeMode.GEMINI)

        assert "12345678901" not in captured["text"]
        assert "0532 123 45 67" not in captured["text"]

    @pytest.mark.asyncio
    async def test_patient_name_is_not_masked_by_design(self, ai_scribe_service: AIScribeService):
        # Mevcut kod hassasiyeti: sadece TC kimlik ve telefon maskelenir,
        # hasta/doktor ad-soyadı maskelenmez. Bu test, davranışın
        # gelecekte sessizce değişmesini (ör. isim maskeleme eklenip
        # mektup bağlamının bozulması) yakalar.
        draft = "Hastamız Ahmet Yılmaz, Dr. Mehmet Demir'e yönlendirilmiştir."
        ai_scribe_service.gemini_provider.is_available = lambda: True
        captured = {}

        async def fake_analyze_text(text, prompt):
            captured["text"] = text
            return {"polished_text": "düzenlenmiş metin"}

        ai_scribe_service.gemini_provider.analyze_text = fake_analyze_text

        await ai_scribe_service.polish_letter(draft_text=draft, mode=AIScribeMode.GEMINI)

        assert "Ahmet Yılmaz" in captured["text"]
        assert "Mehmet Demir" in captured["text"]


class TestPolishLetterFallback:
    @pytest.mark.asyncio
    async def test_falls_back_to_local_on_gemini_quota_exceeded(
        self, ai_scribe_service: AIScribeService
    ):
        draft = "Hasta öyküsünde herhangi bir özellik yoktur."
        ai_scribe_service.gemini_provider.is_available = lambda: True
        ai_scribe_service.gemini_provider.analyze_text = AsyncMock(
            side_effect=Exception("ResourceExhausted: quota exceeded")
        )
        ai_scribe_service.local_llm_provider.analyze_text = AsyncMock(
            return_value={"polished_text": "yerel model ile düzenlendi"}
        )

        result = await ai_scribe_service.polish_letter(draft_text=draft, mode=AIScribeMode.GEMINI)

        assert result["mode_used"] == AIScribeMode.LOCAL
        assert result["polished_text"] == "yerel model ile düzenlendi"

    @pytest.mark.asyncio
    async def test_non_quota_gemini_error_propagates_without_local_fallback(
        self, ai_scribe_service: AIScribeService
    ):
        draft = "Hasta öyküsünde herhangi bir özellik yoktur."
        ai_scribe_service.gemini_provider.is_available = lambda: True
        ai_scribe_service.gemini_provider.analyze_text = AsyncMock(
            side_effect=Exception("network timeout")
        )
        ai_scribe_service.local_llm_provider.analyze_text = AsyncMock(
            return_value={"polished_text": "should not be used"}
        )

        with pytest.raises(Exception):
            await ai_scribe_service.polish_letter(draft_text=draft, mode=AIScribeMode.GEMINI)

        ai_scribe_service.local_llm_provider.analyze_text.assert_not_called()


class TestPolishLetterFactDriftWarning:
    @pytest.mark.asyncio
    async def test_fact_drift_warning_true_when_number_lost(
        self, ai_scribe_service: AIScribeService
    ):
        draft = "Hastaya 500 mg dozunda ilaç başlandı."
        ai_scribe_service.gemini_provider.is_available = lambda: True
        ai_scribe_service.gemini_provider.analyze_text = AsyncMock(
            return_value={"polished_text": "Hastaya ilaç başlanmıştır."}
        )

        result = await ai_scribe_service.polish_letter(draft_text=draft, mode=AIScribeMode.GEMINI)

        assert result["fact_drift_warning"] is True

    @pytest.mark.asyncio
    async def test_fact_drift_warning_false_when_numbers_preserved(
        self, ai_scribe_service: AIScribeService
    ):
        draft = "Hastaya 500 mg dozunda ilaç başlandı."
        ai_scribe_service.gemini_provider.is_available = lambda: True
        ai_scribe_service.gemini_provider.analyze_text = AsyncMock(
            return_value={"polished_text": "Hastaya 500 mg dozunda ilaç başlanmıştır."}
        )

        result = await ai_scribe_service.polish_letter(draft_text=draft, mode=AIScribeMode.GEMINI)

        assert result["fact_drift_warning"] is False

    @pytest.mark.asyncio
    async def test_raises_when_gemini_returns_no_text(self, ai_scribe_service: AIScribeService):
        draft = "Hasta öyküsünde herhangi bir özellik yoktur."
        ai_scribe_service.gemini_provider.is_available = lambda: True
        ai_scribe_service.gemini_provider.analyze_text = AsyncMock(return_value={})

        with pytest.raises(Exception):
            await ai_scribe_service.polish_letter(draft_text=draft, mode=AIScribeMode.GEMINI)
