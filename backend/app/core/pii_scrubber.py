"""
Shared PII-masking regexes for text sent to third-party LLM providers
(Gemini). Regex-based, best-effort — not a general NER solution.

Originally lived only in ai_scribe_service.py; extracted here so other
services (e.g. hpv_briefing_service.py) sending free-text patient data to
Gemini reuse the same identifiers instead of re-implementing (and
potentially drifting from) the same patterns.
"""
import re

TC_KIMLIK_RE = re.compile(r"\b[1-9]\d{10}\b")
PHONE_RE = re.compile(r"\b0?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b")


def mask_identifiers(text: str) -> str:
    """Masks TC kimlik no and Turkish phone numbers in free text."""
    text = TC_KIMLIK_RE.sub("[ID_MASKED]", text)
    text = PHONE_RE.sub("[PHONE_MASKED]", text)
    return text
