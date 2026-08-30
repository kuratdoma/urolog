"""
ICD arama/çözümleme davranış testleri.

Bu testler DB'ye gitmeden repository'nin sözleşmesini doğrular: kısa sorgular
sorguya hiç dönüşmemeli, bulunamayan kodlar kodun kendisi olarak değil None
olarak dönmeli (rapor/PDF çıktısına sahte tanı adı sızmasın).
"""
import asyncio

import pytest

from app.repositories.system_repository import SystemRepository


class _FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def __iter__(self):
        return iter(self._rows)


class _FakeSession:
    """execute() çağrılarını kaydeden, sabit satır döndüren sahte oturum."""

    def __init__(self, rows=()):
        self.rows = list(rows)
        self.calls = []

    async def execute(self, stmt, params=None):
        self.calls.append((stmt, params))
        return _FakeResult(self.rows)


class _Row:
    def __init__(self, kodu, adi):
        self.kodu = kodu
        self.adi = adi


@pytest.mark.parametrize("query", ["", "  ", "a", None])
def test_short_query_does_not_hit_db(query):
    session = _FakeSession()
    repo = SystemRepository(session)

    assert asyncio.run(repo.search_icd_ranked(query)) == []
    assert session.calls == []


def test_trigram_disabled_for_short_queries():
    session = _FakeSession()
    asyncio.run(SystemRepository(session).search_icd_ranked("N4"))

    _stmt, params = session.calls[0]
    assert params["use_trigram"] is False
    assert params["prefix"] == "N4%"
    assert params["contains"] == "%n4%"


def test_trigram_enabled_for_long_queries():
    session = _FakeSession()
    asyncio.run(SystemRepository(session).search_icd_ranked("prostat"))

    _stmt, params = session.calls[0]
    assert params["use_trigram"] is True


def test_search_returns_code_and_name_pairs():
    session = _FakeSession([_Row("N40", "Prostat hiperplazisi"), _Row("N41", None)])
    results = asyncio.run(SystemRepository(session).search_icd_ranked("prostat"))

    assert results == [
        {"kodu": "N40", "adi": "Prostat hiperplazisi"},
        {"kodu": "N41", "adi": ""},
    ]


def test_lookup_missing_code_returns_none_not_the_code():
    session = _FakeSession([_Row("N40", "Prostat hiperplazisi")])
    names = asyncio.run(SystemRepository(session).lookup_icd_names(["n40", "ZZZ99"]))

    assert names["N40"] == "Prostat hiperplazisi"
    assert names["ZZZ99"] is None


def test_lookup_empty_input_does_not_hit_db():
    session = _FakeSession()
    assert asyncio.run(SystemRepository(session).lookup_icd_names(["", "  ", None])) == {}
    assert session.calls == []


def test_turkish_characters_are_normalized_for_the_query():
    """Hekim "uriner" yazdığında "Üriner ..." tanıları da bulunmalı."""
    session = _FakeSession()
    asyncio.run(SystemRepository(session).search_icd_ranked("Üriner"))

    _stmt, params = session.calls[0]
    assert params["q_norm"] == "uriner"
    assert params["contains"] == "%uriner%"
    # Kod eşleşmesi ham metinle yapılır (kodlarda Türkçe karakter yok).
    assert params["q"] == "Üriner"


def test_sql_normalization_matches_the_indexed_expression():
    """
    p011 ifade indeksi ile sorgudaki ifade birebir aynı olmalı; ayrışırlarsa
    indeks sessizce kullanılmaz ve arama seq scan'e düşer.
    """
    import importlib.util
    from pathlib import Path

    migration = (
        Path(__file__).resolve().parents[3]
        / "alembic"
        / "versions"
        / "p011_icd_normalized_trgm_index.py"
    )
    spec = importlib.util.spec_from_file_location("p011_icd_norm_trgm", migration)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    assert SystemRepository.ICD_NORMALIZE_SQL == module._NORMALIZED_ADI
