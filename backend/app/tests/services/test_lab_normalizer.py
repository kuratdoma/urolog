"""
Tests for LabNormalizerService.
Validates test name and unit normalization against known clinical variations.
"""
import pytest
from app.services.lab_normalizer_service import (
    normalize_test_name,
    normalize_unit,
    normalize_lab_record,
    clean_punctuation,
)


# ── clean_punctuation ─────────────────────────────────────────────────────

class TestCleanPunctuation:
    def test_leading_asterisk(self):
        assert clean_punctuation("*ldl Kolesterol") == "ldl Kolesterol"

    def test_leading_dash(self):
        assert clean_punctuation("-Albumin") == "Albumin"

    def test_trailing_dots(self):
        assert clean_punctuation("Glukoz.") == "Glukoz"
        assert clean_punctuation("Kreatının ..") == "Kreatının"

    def test_trailing_paren(self):
        assert clean_punctuation("Aspartat Aminotransferaz )") == "Aspartat Aminotransferaz"

    def test_clean_input(self):
        assert clean_punctuation("Kreatinin") == "Kreatinin"

    def test_empty(self):
        assert clean_punctuation("") == ""
        assert clean_punctuation(None) is None


# ── normalize_test_name — Kreatinin ailesi ────────────────────────────────

class TestKreatininFamily:
    def test_kreatinin_basic(self):
        assert normalize_test_name("Kreatinin") == "Kreatinin"

    def test_kreatinin_turkish_variant(self):
        assert normalize_test_name("Kreatının") == "Kreatinin"

    def test_kreatinin_with_serum(self):
        assert normalize_test_name("KREATİNİN Serum") == "Kreatinin"

    def test_creatinine_english(self):
        assert normalize_test_name("Creatinine") == "Kreatinin"

    def test_kreatinin_with_gfr_unit(self):
        """Kreatinin with clearance unit should become Kreatinin Klerensi."""
        assert normalize_test_name("Kreatinin", "ml/dk/1.73 m2") == "Kreatinin Klerensi"

    def test_kreatinin_klerensi_explicit(self):
        assert normalize_test_name("Kreatinin Klerens Testi") == "Kreatinin Klerensi"

    def test_albumin_kreatinin_orani(self):
        assert normalize_test_name("Albumin/Kreatinin") == "Albumin/Kreatinin Oranı"

    def test_spot_idrar_kreatinin(self):
        assert normalize_test_name("Spot İdr. Kreatinin") == "Spot İdrar Kreatinin"

    def test_ck_mb_not_kreatinin(self):
        """CK-MB should NOT be mapped to Kreatinin."""
        assert normalize_test_name("CK-MB") == "CK-MB (Kreatin Kinaz-MB)"

    def test_ck_not_kreatinin(self):
        """CK should NOT be mapped to Kreatinin."""
        assert normalize_test_name("Kreatin Kinaz") == "CK (Kreatin Kinaz)"


# ── normalize_test_name — BUN vs Üre ─────────────────────────────────────

class TestBunVsUre:
    def test_ure_basic(self):
        assert normalize_test_name("Üre") == "Üre"

    def test_bun(self):
        assert normalize_test_name("BUN") == "BUN"

    def test_kan_ure_azotu(self):
        assert normalize_test_name("Kan Üre Azotu") == "BUN"


# ── normalize_test_name — Karaciğer Enzimleri ────────────────────────────

class TestLiverEnzymes:
    def test_alt_basic(self):
        assert normalize_test_name("ALT") == "ALT (SGPT)"

    def test_sgpt(self):
        assert normalize_test_name("SGPT") == "ALT (SGPT)"

    def test_alanin_aminotransferaz(self):
        assert normalize_test_name("Alanin Aminotransferaz") == "ALT (SGPT)"

    def test_ast_basic(self):
        assert normalize_test_name("AST") == "AST (SGOT)"

    def test_sgot(self):
        assert normalize_test_name("SGOT") == "AST (SGOT)"

    def test_aspartat_aminotransferaz(self):
        assert normalize_test_name("Aspartat Aminotransferaz") == "AST (SGOT)"

    def test_alp(self):
        assert normalize_test_name("Alkalen Fosfataz") == "ALP"

    def test_ggt(self):
        assert normalize_test_name("Gamma Glutamil Transferaz") == "GGT"


# ── normalize_test_name — PSA ─────────────────────────────────────────────

class TestPSA:
    def test_psa_total_basic(self):
        assert normalize_test_name("PSA") == "PSA (Total)"

    def test_psa_total_explicit(self):
        assert normalize_test_name("Total PSA") == "PSA (Total)"

    def test_psa_total_long_form(self):
        assert normalize_test_name("Prostat Spesifik Antijen") == "PSA (Total)"

    def test_psa_serbest_basic(self):
        assert normalize_test_name("Serbest PSA") == "PSA (Serbest)"

    def test_psa_serbest_free(self):
        assert normalize_test_name("Free PSA") == "PSA (Serbest)"


# ── normalize_test_name — Glukoz ──────────────────────────────────────────

class TestGlukoz:
    def test_glukoz_basic(self):
        assert normalize_test_name("Glukoz") == "Glukoz"

    def test_glukoz_aclik(self):
        assert normalize_test_name("Glukoz, Açlık") == "Glukoz"

    def test_hasta_basi_glukoz_separate(self):
        assert normalize_test_name("Hasta Başı Glukoz") == "Hasta Başı Glukoz"

    def test_hba1c(self):
        assert normalize_test_name("HbA1c") == "HbA1c"


# ── normalize_unit ────────────────────────────────────────────────────────

class TestNormalizeUnit:
    def test_mg_dl(self):
        assert normalize_unit("mg/dL") == "mg/dL"
        assert normalize_unit("mg/dl") == "mg/dL"
        assert normalize_unit("mg-dL") == "mg/dL"
        assert normalize_unit("mgr/dL") == "mg/dL"

    def test_ng_ml(self):
        assert normalize_unit("ng/mL") == "ng/mL"
        assert normalize_unit("ng/ml") == "ng/mL"

    def test_ug_l_to_ng_ml(self):
        """µg/L is numerically equivalent to ng/mL, should normalize."""
        assert normalize_unit("µg/L") == "ng/mL"
        assert normalize_unit("ug/L") == "ng/mL"

    def test_u_l(self):
        assert normalize_unit("U/L") == "U/L"
        assert normalize_unit("IU/L") == "U/L"
        assert normalize_unit("u/l") == "U/L"

    def test_miu_l(self):
        assert normalize_unit("mIU/L") == "mIU/L"
        assert normalize_unit("µIU/mL") == "mIU/L"
        assert normalize_unit("uIU/mL") == "mIU/L"

    def test_gfr_unit(self):
        assert normalize_unit("mL/dk/1.73m²") == "mL/dk/1.73m²"
        assert normalize_unit("ml/dk/1,73m²") == "mL/dk/1.73m²"

    def test_invalid_units_cleared(self):
        assert normalize_unit("*") is None
        assert normalize_unit("-") is None
        assert normalize_unit("") is None
        assert normalize_unit(None) is None

    def test_unknown_unit_preserved(self):
        """Unknown units should be returned as-is, stripped."""
        assert normalize_unit("  units123  ") == "units123"


# ── normalize_lab_record (integration) ────────────────────────────────────

class TestNormalizeLabRecord:
    def test_full_normalization(self):
        name, unit = normalize_lab_record("Kreatının", "mg/dl")
        assert name == "Kreatinin"
        assert unit == "mg/dL"

    def test_psa_with_ug_l(self):
        name, unit = normalize_lab_record("Prostat Spesifik Antijen", "ug/L")
        assert name == "PSA (Total)"
        assert unit == "ng/mL"

    def test_kreatinin_klerensi_by_unit(self):
        name, unit = normalize_lab_record("Kreatinin", "ml/dk/1.73 m2")
        assert name == "Kreatinin Klerensi"
        assert unit == "mL/dk/1.73m²"

    def test_none_passthrough(self):
        name, unit = normalize_lab_record(None, None)
        assert name is None
        assert unit is None

    def test_empty_name_passthrough(self):
        name, unit = normalize_lab_record("", "mg/dL")
        assert name == ""
        assert unit == "mg/dL"
