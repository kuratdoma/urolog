"""
Lab Test Name & Unit Normalizer Service
========================================
Veritabanına kayıt öncesi tetkik_adi ve birim alanlarını standartlaştırır.
Tüm giriş noktalarından (batch, PDF parse, manuel) gelen veriyi normalize eder.

Klinik Ayrımlar:
- Kreatinin ≠ Kreatinin Klerensi ≠ Albumin/Kreatinin Oranı
- Üre ≠ BUN (Kan Üre Azotu)
- ALT = Alanin Aminotransferaz = SGPT
- AST = Aspartat Aminotransferaz = SGOT
- ALP = Alkalen Fosfataz
- GGT = Gamma Glutamil Transferaz
- CK (Kreatin Kinaz) ≠ Kreatinin
- Hasta Başı Glukoz ayrı, Glukoz(akş) = Glukoz
"""

import re
from typing import Optional, Tuple, List

from app.core.text_utils import normalize_turkish

# ---------------------------------------------------------------------------
# 1. STANDARD TEST NAME MAP
# Key: canonical name → Value: list of normalized (ASCII lowercase) aliases
# Order matters: more specific patterns should come before generic ones.
# ---------------------------------------------------------------------------

STANDARD_TEST_MAP: List[Tuple[str, List[str]]] = [
    # ── Kreatinin-ilişkili (spesifik önce) ────────────────────────────
    ("Albumin/Kreatinin Oranı", [
        "albumin/kreatinin orani", "albumin/kreatinin", "albumin/kreatinin orani",
    ]),
    ("Protein/Kreatinin Oranı", [
        "protein/kreatinin orani", "protein/kreatinin", "protein/kreatinin orani",
        "protein/kreatininspot idrar)",
    ]),
    ("Spot İdrar Kreatinin", [
        "spot idr. kreatinin", "spot idrar kreatinin",
        "kreatinin spot idrar", "kreatininspot idrar)",
        "id.spot kreatinin", "idrar kreatinin",
    ]),
    ("BUN/Kreatinin Oranı", [
        "bun/kreatinin orani", "bun/kreatinin orani",
    ]),
    ("CK-MB (Kreatin Kinaz-MB)", [
        "kreatin kinaz-mb", "kreatin kinaz mb", "ck-mb", "ckmb",
    ]),
    ("CK (Kreatin Kinaz)", [
        "kreatin kinaz", "kreatin kinase", "ck", "cpk",
    ]),
    # Kreatinin Klerensi: isimde "klerens" varsa veya birim bazlı ayrılacak
    ("Kreatinin Klerensi", [
        "kreatinin klerens testi", "kreatinin klerens",
        "kreatinin klerensi",
    ]),
    ("Kreatinin", [
        "kreatinin", "kreatinin, serum", "kreatinin serum:",
        "kreatinin serum-plazma", "kreatinin serum",
        "kreatinin ..", "kreatin", "creatinine", "creatinin",
    ]),

    # ── BUN vs Üre ────────────────────────────────────────────────────
    ("BUN", [
        "kan ure azotu", "ure azotu serum", "ure azotu",
        "ure - kan ure azotu", "kan ure nitrojeni : serum",
        "kan ure nitrojeni", "bunm", "bun",
    ]),
    ("Üre", [
        "ure", "urea",
    ]),

    # ── Karaciğer Enzimleri ───────────────────────────────────────────
    ("ALT (SGPT)", [
        "alanin aminotransferaz",
        "altalanin aminotransferaz)", "alt alanin aminotransferaz",
        "alt / sgpt", "sgpt serum", "sgpt",
        "alt * serum plazma", "alt",
    ]),
    ("AST (SGOT)", [
        "aspartat aminotransferaz",
        "aspartat aminotransferaz )", "ast aspartat aminotransferaz",
        "aspartat transaminaz",
        "ast / sgot", "sgot serum", "sgot",
        "ast serum plazma", "ast",
    ]),
    ("ALP", [
        "alkalen fosfataz", "alkalen fosfataz (alp)", "alpalkalen fosfataz)",
        "alp serum", "alp",
    ]),
    ("GGT", [
        "gamma glutamil transferaz",
        "gamma glutamil transfarez",
        "ggt",
    ]),
    ("LDH", [
        "laktat dehidrogenaz", "ldh",
    ]),
    ("Amilaz", [
        "amilaz", "amylase",
    ]),
    ("Lipaz", [
        "lipaz", "lipase",
    ]),

    # ── Böbrek / GFR ──────────────────────────────────────────────────
    ("eGFR", [
        "egfr", "e-gfr", "e gfr testi", "mdrd", "ckd-epi",
        "glomerul filtrasyon hizi",
        "tahmini glomeruler filtrasyon hizi",
        "gfh", "hgfh",
    ]),
    ("Ürik Asit", [
        "urik asit", "uric acid",
        "urik asit .", "urik asit serum",
    ]),

    # ── Glukoz / Diyabet ──────────────────────────────────────────────
    ("Hasta Başı Glukoz", [
        "hasta basi glukoz",
    ]),
    ("Tahmini Ortalama Glukoz", [
        "tahmini ortalama glukoz",
        "hesaplanmis ortalama glukoz",
    ]),
    ("HbA1c", [
        "hba1c", "hba1c )", "hba1c%", "hba1c-",
        "hba1c / hemoglobin a1c",
        "hba1c hba1c", "hemoglobin a1c",
        "ngsp hba1c", "ifcc hba1c",
        "mmol hba1c", "glike hemoglobin",
        "hba1c. tam kan",
    ]),
    ("Glukoz", [
        "glukoz", "glukoz.", "glukoz, aclik",
        "glukoz aclik", "aks glukoz", "glukoz (aks)", "glucose",
    ]),
    ("İnsülin", [
        "insulin",
    ]),

    # ── PSA (Serbest önce — daha spesifik) ────────────────────────────
    ("PSA (Serbest)", [
        "psa (serbest)", "serbest psa", "free psa", "psa serbest",
        "psa free", "psa (free)", "fpsa", "f-psa", "spsa", "s-psa",
        "serbest prostat spesifik antijen", "free prostat spesifik antijen",
    ]),
    ("PSA (Total)", [
        "psa (total)", "total psa", "psa total", "psa, total",
        "total, psa", "tpsa", "t-psa",
        "prostat spesifik antijen", "prostat spesifik antigen",
        "prostat spesifik ant", "psa",
    ]),

    # ── Elektrolitler ─────────────────────────────────────────────────
    ("Sodyum", [
        "sodyum", "sodyum serum", "sodium", 'na"',
        "duzeltilmis sodyum",
        "duzeltilmis sodyum degeri",
    ]),
    ("Potasyum", [
        "potasyum", "potasyum serum", "potassium", 'k"',
    ]),
    ("Klor", [
        "klor", "klorur", "chloride",
    ]),
    ("Kalsiyum", [
        "kalsiyum", "calcium",
        "total kalsiyum serum",
        "duzeltilmis kalsiyum",
        "duzeltilmis kalsiyum degeri",
        "kalsiyum serum - plazma", "kalsiyum serum-plazma",
        "iyonize kalsiyum",
    ]),
    ("Magnezyum", [
        "magnezyum", "magnesium",
    ]),
    ("Fosfor", [
        "fosfor", "phosphorus", "inorganik fosfor",
    ]),
    ("Demir", [
        "demir", "iron",
    ]),
    ("Demir Bağlama Kapasitesi", [
        "demir baglama kapasitesi",
        "total demir baglama kapasitesi",
    ]),
    ("Ferritin", [
        "ferritin", "ferritin.",
    ]),

    # ── Tiroid ────────────────────────────────────────────────────────
    ("TSH", [
        "tsh", "sensitive-tsh serum",
        "tsh-ul ii",
    ]),
    ("Serbest T3", [
        "serbest t3", "ft3", "ft3 serum", "free t3",
    ]),
    ("Serbest T4", [
        "serbest t4", "ft4", "ft4 serum", "ft4, serbest t4", "free t4",
    ]),

    # ── Lipid Profili ─────────────────────────────────────────────────
    ("Total Kolesterol", [
        "total kolesterol", "kolesterol total", "kolesterol",
    ]),
    ("LDL Kolesterol", [
        "ldl kolesterol", "ldl. kolesterol", "*ldl kolesterol",
        "ldl kolesterol.", "ldl-kolesterol",
    ]),
    ("HDL Kolesterol", [
        "hdl kolesterol", "hdl-kolesterol",
    ]),
    ("Trigliserid", [
        "trigliserid", "triglyceride",
    ]),
    ("VLDL Kolesterol", [
        "vldl kolesterol", "vldl",
    ]),

    # ── İnflamasyon ───────────────────────────────────────────────────
    ("CRP", [
        "crp", "crp**", "crp b", "crp, lateks",
        "crp,turbidimetrik", "crp,turbidimetrik",
        "crp turbidimetrik",
        "crp kantitatif", "crp : serum",
        "c reaktif protein",
        "c - reaktif protein", "c reaktif protein turbidimetrik",
        "c reaktif protein , ultrasensitif", "sensitif crp",
    ]),
    ("Sedimantasyon", [
        "sedimantasyon", "sedim", "esr", "eritrosit sedimantasyon hizi",
    ]),

    # ── Bilirubin ─────────────────────────────────────────────────────
    ("Bilirubin Total", [
        "bilirubin, total", "bilirubin total",
        "total bilirubin",
        "bilirubin. total serum plazma", "t.bilirubin",
    ]),
    ("Bilirubin Direkt", [
        "bilirubin, direkt", "bilirubin direkt",
        "direkt bilirubin",
        "direct bilirubin",
        "bilirubin direkt serum plazma", "direkt bilirubin serum",
        "d.bilirubin",
    ]),
    ("Bilirubin İndirekt", [
        "bilirubin, indirekt",
        "bilirubin indirekt",
        "indirekt bilirubin",
        "indirect bilirubin",
        "i.bilirubin",
    ]),
    ("Bilirubin", [
        "bilirubin", "bilirubin , her biri",
        "bilirubin her biri",
        "bilirubin bilirubin",
    ]),

    # ── Protein ───────────────────────────────────────────────────────
    ("Total Protein", [
        "total protein", "protein",
    ]),
    ("Albumin", [
        "albumin", "albumin**", "-albumin", "albumin",
    ]),

    # ── Hemogram ──────────────────────────────────────────────────────
    ("WBC", ["wbc", "lokosit", "leukocyte"]),
    ("RBC", ["rbc", "eritrosit", "erythrocyte"]),
    ("HGB", ["hgb", "hemoglobin"]),
    ("HCT", ["hct", "hematokrit", "hematocrit"]),
    ("PLT", ["plt", "trombosit", "platelet"]),
    ("MCV", ["mcv"]),
    ("MCH", ["mch"]),
    ("MCHC", ["mchc"]),
    ("RDW", ["rdw"]),
    ("MPV", ["mpv"]),

    # ── Vitamin / Mineral ─────────────────────────────────────────────
    ("Vitamin B12", [
        "vitamin b12", "vit b12", "b12 vitamini",
    ]),
    ("Vitamin D", [
        "vitamin d", "vit d", "25-oh vit d",
        "25-oh vitamin d", "d vitamini", "25 oh d vitamini",
    ]),
    ("Folat", [
        "folat", "folat..", "folate", "folik asit",
    ]),

    # ── Tümör Belirteçleri (PSA hariç) ────────────────────────────────
    ("CA 19-9", ["ca 19-9", "ca-19-9", "ca19-9"]),
    ("CA 125", ["ca 125", "ca-125", "ca125"]),
    ("CA 15-3", ["ca 15-3", "ca-15-3", "ca15-3"]),
    ("CA 72-4", ["ca 72-4", "ca-72-4", "ca72-4"]),
    ("CEA", ["cea", "karsinoembriyonik antijen"]),
    ("AFP", ["afp", "alfa fetoprotein", "alfa-fetoprotein"]),

    # ── Testosteron ───────────────────────────────────────────────────
    ("Testosteron (Serbest)", [
        "testosteron (serbest)", "serbest testosteron", "free testosteron",
    ]),
    ("Testosteron (Total)", [
        "testosteron (total)", "total testosteron", "testosteron",
    ]),

    # ── Koagülasyon ───────────────────────────────────────────────────
    ("INR", ["inr"]),
    ("PT", ["pt", "protrombin zamani"]),
    ("aPTT", ["aptt"]),

    # ── Diğer ─────────────────────────────────────────────────────────
    ("Parathormon (PTH)", ["parathormon", "pth"]),
    ("ProBNP", [
        "prob natriuretik peptid",
        "b natriuretik peptid", "nt-probnp", "probnp", "bnp",
    ]),
]


# ---------------------------------------------------------------------------
# 2. STANDARD UNIT MAP
# Key: normalized (ASCII lowercase) unit → Value: canonical unit string
# ---------------------------------------------------------------------------

_UNIT_RULES: List[Tuple[str, List[str]]] = [
    # -- Concentration (mass/volume) --
    ("mg/dL", [
        "mg/dl", "mg-dl", "mg dl", "mg\\dl", "mg\\\\dl", "mgr/dl", "mg / dl", "mg/dl *",
    ]),
    ("mg/L", [
        "mg/l", "mg-l", "mg l",
    ]),
    ("ng/mL", [
        "ng/ml", "ng-ml", "ng ml",
        # PSA-equivalent: 1 ng/mL = 1 µg/L = 1 ug/L
        "ug/l", "ug l", "ug-l", "µg/l", "µg l",
    ]),
    ("ng/dL", ["ng/dl", "ng-dl", "ng dl"]),
    ("ng/L", ["ng/l", "ng-l"]),
    ("pg/mL", ["pg/ml", "pg-ml", "pg ml"]),
    ("pg/dL", ["pg/dl"]),
    ("µg/dL", ["ug/dl", "µg/dl", "µg-dl", "µg dl"]),

    # -- Enzyme units --
    ("U/L", ["u/l", "u-l", "u l", "iu/l", "iu/i"]),

    # -- Electrolyte units --
    ("mmol/L", ["mmol/l", "mmol-l", "mmol l", "mmol/l"]),
    ("mEq/L", ["meq/l", "meg/l", "mek/l"]),

    # -- Thyroid units --
    ("mIU/L", [
        "miu/l", "miu-l", "miu l", "miu/ml",
        "mu/l", "mlu l", "mlu/l",
        "uiu/ml", "uiu-ml", "uiu/l",
        "µiu/ml", "mic,iu/ml", "micu/ml",
    ]),

    # -- Hematology --
    ("10^3/µL", ["k/ul", "10^3/µl", "mm3-10 3"]),
    ("x10^9/L", ["10^9-l", "x10^9/l", "10^9/l"]),
    ("x10^12/L", ["x10^12/l"]),
    ("g/dL", ["g/dl", "g-dl", "gr/dl"]),
    ("g/L", ["g/l", "gr/l", "g l"]),
    ("fL", ["fl"]),
    ("%", ["%"]),
    ("/HPF", ["/hpf", "p/hpf", "hpf"]),

    # -- Renal clearance --
    ("mL/dk/1.73m²", [
        "ml/dk", "ml/dak",
        "ml/dk/1.73 m2", "ml/dk/1.73m²", "ml/dk/1,73", "ml/dk/1,73m²",
        "ml/dk/1.73 m²", "ml/dk/1.73 m^2",
        "ml/dak/1,73m²", "ml/dak/1,7", "ml/dk/1.73",
    ]),

    # -- HbA1c --
    ("mmol/mol", ["mmol/mol", "mmol/mol h", "mmol/mol hb", "mmol"]),

    # -- Urine --
    ("mg/gün", ["mg/gun", "mg/gün"]),
    ("mg/g Krea", ["mg/g kreatinin", "mg/gr", "mg/g"]),
    ("CFU/mL", ["cfu/ml"]),

    # -- Other --
    ("ml/dk", ["ml/dk"]),
    ("pg", ["pg"]),
    ("Gün", ["gun"]),
]

# Build a flat lookup dict from the rules
STANDARD_UNIT_MAP: dict = {}
for canonical, aliases in _UNIT_RULES:
    for alias in aliases:
        STANDARD_UNIT_MAP[alias] = canonical

# Units that are meaningless and should be cleared
INVALID_UNITS = {"*", "-", "karar", "y", "1", "0 - 0,99", ""}


# ---------------------------------------------------------------------------
# 3. GFR / CLEARANCE UNIT PATTERNS
# If a test has one of these units it's a clearance/GFR value, not serum
# ---------------------------------------------------------------------------

GFR_UNIT_PATTERNS = [
    "ml/dk", "ml/dak", "1.73", "1,73",
]


# ---------------------------------------------------------------------------
# 4. HELPER FUNCTIONS
# ---------------------------------------------------------------------------

def _to_key(text: str) -> str:
    """Normalize text to lowercase ASCII for matching."""
    if not text:
        return ""
    t = normalize_turkish(text.lower().strip())
    # Collapse multiple spaces
    t = re.sub(r"\s+", " ", t)
    return t


def clean_punctuation(name: str) -> str:
    """
    Remove leading/trailing junk characters from test names.
    Examples: '*ldl Kolesterol' → 'ldl Kolesterol'
              'Glukoz.' → 'Glukoz'
              'Kreatının ..' → 'Kreatının'
              'Aspartat Amınotransferaz )' → 'Aspartat Amınotransferaz'
    """
    if not name:
        return name
    # Strip leading * - and trailing . ) .. ** etc.
    name = re.sub(r"^[*\-]+\s*", "", name)
    # Strip trailing punctuation (. * - etc) but do not strip trailing paren if there's a matching opening paren
    if "(" not in name:
        name = re.sub(r"\s*[.*)\-]+\s*$", "", name)
    else:
        name = re.sub(r"\s*[.*\-]+\s*$", "", name)
    return name.strip()


def normalize_unit(unit: Optional[str]) -> Optional[str]:
    """
    Normalize a unit string to its canonical form.
    Returns None for invalid/meaningless units.
    """
    if not unit:
        return None

    raw = unit.strip()
    key = _to_key(raw)

    if key in INVALID_UNITS:
        return None

    # Direct lookup
    if key in STANDARD_UNIT_MAP:
        return STANDARD_UNIT_MAP[key]

    # If not found, return the original stripped value
    return raw


def normalize_test_name(name: str, unit: Optional[str] = None) -> str:
    """
    Normalize a test name to its canonical form.
    Uses the unit to disambiguate cases like Kreatinin vs Kreatinin Klerensi.
    """
    if not name:
        return name

    # Step 1: Clean punctuation artifacts
    cleaned = clean_punctuation(name)

    # Step 2: Normalize to ASCII lowercase key
    key = _to_key(cleaned)

    if not key:
        return name

    # Step 3: Check if unit indicates GFR/Clearance
    unit_key = _to_key(unit) if unit else ""
    is_gfr_unit = any(p in unit_key for p in GFR_UNIT_PATTERNS) if unit_key else False

    # Step 4: Match against STANDARD_TEST_MAP
    for canonical, aliases in STANDARD_TEST_MAP:
        for alias in aliases:
            if key == alias:
                # Special case: "Kreatinin" with GFR unit → reclassify
                if canonical == "Kreatinin" and is_gfr_unit:
                    return "Kreatinin Klerensi"
                return canonical

    # Step 5: Partial match for common patterns not caught by exact match
    # e.g. "Aspartat Transamınaz" contains "aspartat transam"
    for canonical, aliases in STANDARD_TEST_MAP:
        for alias in aliases:
            if len(alias) >= 5 and alias in key:
                if canonical == "Kreatinin" and is_gfr_unit:
                    return "Kreatinin Klerensi"
                return canonical

    # No match found — return cleaned original with title case
    return cleaned


# ---------------------------------------------------------------------------
# 5. MAIN ENTRY POINT
# ---------------------------------------------------------------------------

def normalize_lab_record(
    tetkik_adi: Optional[str],
    birim: Optional[str],
) -> Tuple[Optional[str], Optional[str]]:
    """
    Main normalization function. Called before every database save.

    Returns:
        (normalized_tetkik_adi, normalized_birim)
    """
    if not tetkik_adi:
        return tetkik_adi, birim

    normalized_name = normalize_test_name(tetkik_adi, birim)
    normalized_unit = normalize_unit(birim)

    return normalized_name, normalized_unit
