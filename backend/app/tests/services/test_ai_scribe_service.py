import pytest
from app.services.ai_scribe_service import AIScribeService

def test_build_template_prompt_default_persona(ai_scribe_service: AIScribeService):
    prompt = ai_scribe_service._build_template_prompt(template_name=None, persona="default")
    assert "Standart resmi klinik üslup" in prompt
    assert "C-3PO MODU AKTİF" not in prompt

def test_build_template_prompt_c3po_persona(ai_scribe_service: AIScribeService):
    prompt = ai_scribe_service._build_template_prompt(template_name=None, persona="c3po")
    assert "C-3PO MODU AKTİF" in prompt
    assert "TÜM KLİNİK NOT BÜYÜK HARFLE YAZILACAKTIR" in prompt
    assert "KISALTMALAR BOLCA KULLANILACAKTIR" in prompt
