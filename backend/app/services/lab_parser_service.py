import re
import datetime
from typing import List, Optional
from pydantic import BaseModel

from app.core.text_utils import normalize_turkish


# Comprehensive list of test names and synonyms
# Format: (OfficialName, [Synonyms])
# NOTE: Synonyms are stored in normalized ASCII form (Turkish chars converted)
# The matching logic normalizes both input and synonyms for comparison
TEST_DEFINITIONS = [
    ("Glukoz", ["glukoz", "aks", "glucose", "kan sekeri", "seker"]),
    ("HbA1c", ["hba1c", "hemoglobin a1c", "glikozile hemoglobin"]),
    ("Insulin", ["insulin", "insulın"]),
    ("Ure", ["ure", "urea", "bun"]),
    ("Kreatinin", ["kreatinin", "creatinine", "creat"]),
    ("eGFR", ["egfr", "gfr"]),
    ("Urik Asit", ["urik asit", "uric acid"]),
    ("Total Bilirubin", ["total bilirubin", "t.bilirubin", "t-bilirubin"]),
    ("Direkt Bilirubin", ["direkt bilirubin", "d.bilirubin", "d-bilirubin"]),
    ("Indirekt Bilirubin", ["indirekt bilirubin", "i.bilirubin", "i-bilirubin"]),
    ("AST", ["ast", "sgot"]),
    ("ALT", ["alt", "sgpt"]),
    ("GGT", ["ggt", "g-gt"]),
    ("ALP", ["alp", "alkalen fosfataz"]),
    ("LDH", ["ldh", "laktat dehidrogenaz"]),
    ("Amilaz", ["amilaz", "amylase"]),
    ("Lipaz", ["lipaz", "lipase"]),
    ("Total Protein", ["total protein"]),
    ("Albumin", ["albumin"]),
    ("Sodyum", ["sodyum", "sodium", "Na"]),
    ("Potasyum", ["potasyum", "potassium", "K"]),
    ("Klor", ["klor", "chloride", "Cl"]),
    ("Kalsiyum", ["kalsiyum", "calcium", "Ca"]),
    ("Magnezyum", ["magnezyum", "magnesium", "Mg"]),
    ("Fosfor", ["fosfor", "phosphorus", "P"]),
    ("Demir", ["demir", "iron", "Fe"]),
    ("Ferritin", ["ferritin"]),
    ("TSH", ["tsh"]),
    ("Serbest T3", ["serbest t3", "st3", "free t3", "s.t3", "f-t3"]),
    ("Serbest T4", ["serbest t4", "st4", "free t4", "s.t4", "f-t4"]),
    # Updated PSA Definitions (Serbest MUST come before Total to prevent partial matching)
    (
        "PSA (SERBEST)",
        [
            "psa (free)",
            "serbest psa",
            "free psa",
            "psa serbest",
            "psa free",
            "serbest prostat spesifik antijen",
            "free prostat spesifik antijen",
            "prostat spesifik antijen free",
            "prostat spesifik antijen serbest",
            "serbest prostat spesifik antigen",
            "free prostat spesifik antigen",
            "prostat spesifik antigen free",
            "prostat spesifik antigen serbest",
            "spsa",
            "f-psa",
            "fpsa",
        ],
    ),
    (
        "PSA (TOTAL)",
        [
            "total prostat spesifik antijen",
            "prostat spesifik antijen total",
            "total psa",
            "psa total",
            "total, prostat spesifik antijen",
            "prostat spesifik antijen, total",
            "total, psa",
            "psa, total",
            "psa (total)",
            "prostat spesifik antijen",
            "prostat spesifik antigen",
            "prostat spesifik ant",
            "psa",
            "tpsa",
            "t-psa",
        ],
    ),
    ("Parathormon", ["parathormon", "pth"]),
    ("Vitamin D", ["vitamin d", "vit d", "25-oh vit d", "d vitamini"]),
    ("Vitamin B12", ["vitamin b12", "vit b12", "b12 vitamini"]),
    ("Folat", ["folat", "folate", "folik asit"]),
    ("CRP", ["crp", "c-reaktif protein"]),
    ("Sedimantasyon", ["sedimantasyon", "sedim", "esr"]),
    ("WBC", ["wbc", "lokosit", "leukocyte", "akyuvar"]),
    ("RBC", ["rbc", "eritrosit", "erythrocyte", "alyuvar"]),
    ("HGB", ["hgb", "hemoglobin", "hbg"]),
    ("HCT", ["hct", "hematokrit", "hematocrit"]),
    ("PLT", ["plt", "trombosit", "platelet"]),
    ("MCV", ["mcv"]),
    ("MCH", ["mch"]),
    ("MCHC", ["mchc"]),
    ("RDW", ["rdw"]),
    ("MPV", ["mpv"]),
    ("NE#", ["ne#", "neu#", "neut#", "notr#", "notrofil#"]),
    ("LY#", ["ly#", "lym#", "lenf#", "lenfosit#"]),
    ("MO#", ["mo#", "mon#", "mono#", "monosit#"]),
    ("EO#", ["eo#", "eos#", "eoz#", "eozinofil#"]),
    ("BA#", ["ba#", "bas#", "baz#", "bazofil#"]),
    ("NE%", ["ne%", "neu%", "neut%", "notr%", "notrofil%"]),
    ("LY%", ["ly%", "lym%", "lenf%", "lenfosit%"]),
    ("INR", ["inr"]),
    ("PT", ["pt", "protrombin zamani"]),
    ("aPTT", ["aptt"]),
    ("pH", ["ph"]),
]


def normalize_test_name(name: str) -> str:
    """
    Standardize test name for consistent storage and comparison.
    - Converts to lowercase
    - Normalizes Turkish characters
    - Strips whitespace
    - Removes extra spaces
    - Maps to standardized names from TEST_DEFINITIONS
    """
    if not name:
        return name
    normalized = normalize_turkish(name.lower().strip())
    # Remove extra whitespace
    normalized = re.sub(r"\s+", " ", normalized)

    # Check against known test definitions for standardization
    for test_key, synonyms in TEST_DEFINITIONS:
        for syn in synonyms:
            if normalized == syn:
                return test_key
            # Should we check for partial matches?
            # Table parser usually gives "Total PSA" which standardizes to "total psa".
            # So exact match against normalized synonyms is good.

    return normalized


class ParsedLabResult(BaseModel):
    test_name: str
    original_name: str
    value: str
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    date: Optional[datetime.date] = None


class LabParserResponse(BaseModel):
    report_date: Optional[datetime.date] = None
    results: List[ParsedLabResult]


class LabParserService:
    @staticmethod
    def parse_text(text: str) -> LabParserResponse:
        if not text or not text.strip():
            return LabParserResponse(results=[])

        # Pre-process: normalize line endings
        text = text.replace("\r\n", "\n").replace("\r", "\n")

        # 1. First, try to extract a global date
        report_date = None
        date_pattern = re.compile(r"(\d{2})[./](\d{2})[./](\d{4})")
        dm = date_pattern.search(text)
        if dm:
            try:
                d, m, y = dm.groups()
                report_date = datetime.date(int(y), int(m), int(d))
            except:
                pass

        # 2. Try Table Parser (Tab or multiple spaces)
        lines = text.split("\n")
        table_results = []
        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Detect row-specific date
            row_date = report_date
            rdm = date_pattern.search(line)
            if rdm:
                try:
                    rd, rm, ry = rdm.groups()
                    row_date = datetime.date(int(ry), int(rm), int(rd))
                except:
                    pass

            if "\t" in line:
                parts = [p.strip() for p in line.split("\t")]
            else:
                # Multiple spaces (at least 2)
                parts = [p.strip() for p in re.split(r"\s{2,}", line)]

            if len(parts) >= 2:
                # Filter out the date part if it's one of the columns to avoid it being "name"
                data_parts = [p for p in parts if not date_pattern.match(p)]

                if len(data_parts) >= 2:
                    name = data_parts[0]
                    val = data_parts[1]
                    unit = data_parts[2] if len(data_parts) > 2 else None
                    ref = data_parts[3] if len(data_parts) > 3 else None

                    # Basic validation of "value"
                    # Value should look like a measurement or qualitative result
                    is_numeric = re.search(r"\d", val)
                    # Normalize Turkish chars before checking qualitative values
                    val_normalized = normalize_turkish(val.lower())
                    is_qualitative = any(
                        q in val_normalized
                        for q in ["pozitif", "negatif", "uygun", "reaktif", "normal"]
                    )

                    if name and (is_numeric or is_qualitative) and len(name) < 60:
                        # Clean name and value
                        name_clean = re.sub(r"[\(\[].*?[\)\]]", "", name).strip()
                        val_clean = re.sub(r"^[:\s=]+", "", val).strip()

                        # Normalize the test name for consistent storage
                        standardized_name = normalize_test_name(name_clean)

                        if val_clean:
                            val_clean = val_clean.replace(".", ",")
                            table_results.append(
                                ParsedLabResult(
                                    test_name=standardized_name,
                                    original_name=name,
                                    value=val_clean,
                                    unit=unit,
                                    reference_range=ref,
                                    date=row_date,
                                )
                            )

        # If table parsing found significant results, return them
        if len(table_results) >= 2:
            return LabParserResponse(report_date=report_date, results=table_results)

        # 3. Fallback to Narrative Parser (Keyword matching)
        return LabParserService.parse_narrative(text, report_date)

    @staticmethod
    def parse_narrative(
        text: str, report_date: Optional[datetime.date] = None
    ) -> LabParserResponse:
        results = []

        # Old TEST_DEFINITIONS removed - now using global constant

        lines = text.split("\n")
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            if not line:
                i += 1
                continue

            # Check for localized date
            dm = re.search(r"(\d{2})[./](\d{2})[./](\d{4})", line)
            if dm:
                try:
                    d, m, y = dm.groups()
                    report_date = datetime.date(int(y), int(m), int(d))
                except:
                    pass

            # Normalize both the line and synonyms for Turkish char matching
            line_lower = line.lower()
            line_normalized = normalize_turkish(line_lower)
            found_test = None
            key_end = -1

            # Check for each test definition
            for test_name, synonyms in TEST_DEFINITIONS:
                # Sort synonyms by length to match longest first
                for syn in sorted(synonyms, key=len, reverse=True):
                    is_short = len(syn) <= 2

                    # Normalize the synonym as well for matching
                    syn_normalized = normalize_turkish(syn.lower())

                    # Handle # and % correctly with word boundaries
                    if syn_normalized.endswith("#") or syn_normalized.endswith("%"):
                        pattern = rf"\b{re.escape(syn_normalized)}"
                    else:
                        pattern = rf"\b{re.escape(syn_normalized)}\b"

                    # 1-2 char synonyms should be case-sensitive (use original line)
                    if is_short:
                        match_obj = re.search(pattern, normalize_turkish(line))
                    else:
                        match_obj = re.search(pattern, line_normalized)

                    if match_obj:
                        found_test = test_name
                        key_end = match_obj.end()
                        break
                if found_test:
                    break

            if found_test:
                # Start searching for data after the identified key
                remaining = line[key_end:].strip()

                # Cleanup common "noise" at the start (like (Serum/Plazma) or (Na))
                remaining = re.sub(r"^\s*[\(\[].*?[\)\]]\s*", "", remaining)

                # Regex for value: numbers or qualitative results
                val_regex = r"[:\s=]*([-+]?\d*[.,]?\d+|pozit[iı]f|negat[iı]f|reakt[iı]f|non-?reakt[iı]f|normal|yüksek|düşük)"
                unit_ref_regex = (
                    r"(?:\s+([\w%/\^]*))?(?:\s+[\(\[]?([\w\d.,/<> \-]+)[\)\]]?)?"
                )

                match = re.search(val_regex + unit_ref_regex, remaining, re.IGNORECASE)

                val, unit, ref = None, None, None

                if match and match.group(1):
                    val = match.group(1).strip()
                    unit = match.group(2).strip() if match.group(2) else None
                    ref = match.group(3).strip() if match.group(3) else None

                # Multi-line lookahead
                if not val:
                    j = i + 1
                    lookahead_limit = 5
                    while j < len(lines) and j < i + lookahead_limit:
                        next_line = lines[j].strip()
                        next_line_lower = next_line.lower()
                        if not next_line:
                            j += 1
                            continue

                        # Stop if another known test starts
                        is_other_test = False
                        for _, syns in TEST_DEFINITIONS:
                            for s in syns:
                                is_s_short = len(s) <= 2
                                pat = rf"\b{re.escape(s)}" + (
                                    "" if s[-1] in "#%" else r"\b"
                                )
                                if is_s_short:
                                    if re.search(pat, next_line):
                                        is_other_test = True
                                        break
                                else:
                                    if re.search(pat, next_line_lower):
                                        is_other_test = True
                                        break
                            if is_other_test:
                                break
                        if is_other_test:
                            break

                        # Look for keyword indicators
                        m_v = re.search(
                            r"(?:sonu[çc]|de[ğg]er)\w*\s*[:\s=]+\s*([-+]?\d*[.,]?\d+|pozit[iı]f|negat[iı]f|reakt[iı]f|non-?reakt[iı]f)",
                            next_line_lower,
                        )
                        if m_v and not val:
                            val = m_v.group(1)

                        m_u = re.search(
                            r"(?:birim)\w*\s*[:\s=]+\s*([\w%/\^]+)", next_line_lower
                        )
                        if m_u and not unit:
                            unit = m_u.group(1)

                        m_r = re.search(
                            r"(?:referans|aral[ıi]k|limit)\w*\s*[:\s=]+\s*(.+)",
                            next_line_lower,
                        )
                        if m_r and not ref:
                            r_val = m_r.group(1).strip()
                            # Clean leading "değeri", "range", etc.
                            r_val = re.sub(
                                r"^(?:de[ğg]eri|range|limit[ıi]|\s|:)+",
                                "",
                                r_val,
                                flags=re.IGNORECASE,
                            ).strip()
                            ref = r_val

                        # Fallback: if line is just a number
                        if not val and re.match(r"^[-+]?\d*[.,]?\d+$", next_line):
                            val = next_line

                        j += 1

                if val:
                    val = val.replace(".", ",")
                    results.append(
                        ParsedLabResult(
                            test_name=found_test,
                            original_name=found_test,
                            value=val,
                            unit=unit,
                            reference_range=ref,
                            date=report_date,
                        )
                    )

            i += 1

        return LabParserResponse(report_date=report_date, results=results)
