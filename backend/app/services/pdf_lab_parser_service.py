"""PDF Lab Parser Service - Extract lab results from PDF documents.

Supports common Turkish lab report formats:
  - Kocaeli Sistem Laboratuvarı
  - Standard hospital lab reports
  - Multi-section reports (BİYOKİMYA, HORMON, HEMOGRAM, etc.)
"""

import re
from typing import List, Optional, Tuple
from pydantic import BaseModel

# PyMuPDF (fitz) for PDF text extraction - REQUIRED
try:
    import fitz  # PyMuPDF

    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False


class PDFLabResult(BaseModel):
    test_name: str
    value: str
    unit: Optional[str] = None
    reference: Optional[str] = None


class PDFLabParserResponse(BaseModel):
    success: bool
    message: str
    report_date: Optional[str] = None
    results: List[PDFLabResult] = []
    raw_text: Optional[str] = None  # For debugging


class PDFLabParserService:
    """Service to extract lab results from PDF files."""

    # ----------------------------------------------------------------
    # Canonical test name map:  (regex pattern on extracted name) → display name
    # Order matters – first match wins. Keep more specific patterns above generic ones.
    # ----------------------------------------------------------------
    TEST_NAME_MAP: List[Tuple[str, str]] = [
        # --- Hormones / PSA ---
        (r"TOTAL\s*PSA|PSA.*TOTAL|PROSTAT\s*SPES.*TOTAL|PSA\s*\(TOTAL\)", "PSA (TOTAL)"),
        (r"SERBEST\s*PSA|FREE\s*PSA|PSA.*SERBEST|PROSTAT\s*SPES.*FREE", "SERBEST PSA"),
        (r"^PSA$", "PSA (TOTAL)"),
        (r"TSH.*TİROİD|TSH.*TIROID|^TSH$", "TSH"),
        (r"SERBEST\s*T3", "SERBEST T3"),
        (r"SERBEST\s*T4", "SERBEST T4"),
        (r"TOTAL\s*TESTOSTERON|TOTAL\s*TESTOSTERONE|^TESTOSTERON$|^TESTOSTERONE$", "Testosteron (Total)"),
        (r"SERBEST\s*TESTOSTERON|FREE\s*TESTOSTERONE", "Testosteron (Serbest)"),
        (r"^LH\b|LUTEİN|LUTEIN", "LH"),
        (r"^FSH$", "FSH"),
        (r"PROLAKTİN|PROLAKTIN", "PROLAKTİN"),
        (r"ESTRADİOL|ESTRADIOL", "ESTRADIOL"),
        (r"PROGESTERON", "PROGESTERON"),
        (r"^PTH$", "PTH"),
        # --- Vitamins ---
        (r"25.*HİDROKSİ.*VİTAMİN\s*D|25.*OH.*VİTAMİN\s*D|VİTAMİN\s*D3|VİTAMİN\s*D$", "VİTAMİN D"),
        (r"VİTAMİN\s*B12|B12\s*VİTAMİN", "VİTAMİN B12"),
        (r"FOLİK\s*ASİ[DT]|FOLAT", "FOLAT"),
        # --- Glucose / Diabetes ---
        (r"GLUKOZ.*AÇLIK|AÇLIK\s*GLUKOZ|^GLUKOZ$", "GLUKOZ"),
        (r"HBA1C|HbA1c", "HBA1C"),
        # --- Kidney ---
        (r"KREATİNİN|KREATININ", "KREATİNİN"),
        (r"^ÜRE$|^URE$", "ÜRE"),
        (r"ÜRİK\s*ASİT|URIK\s*ASIT", "ÜRİK ASİT"),
        (r"eGFR", "eGFR"),
        # --- Liver ---
        (r"AST.*ASPARTAT|SGOT.*AST|^AST$", "AST"),
        (r"ALT.*ALANİN|SGPT.*ALT|^ALT$", "ALT"),
        (r"^GGT$", "GGT"),
        (r"^ALP$", "ALP"),
        (r"^LDH$", "LDH"),
        (r"TOTAL\s*BİLİRUBİN", "TOTAL BİLİRUBİN"),
        (r"DİREKT\s*BİLİRUBİN", "DİREKT BİLİRUBİN"),
        (r"İNDİREKT\s*BİLİRUBİN", "İNDİREKT BİLİRUBİN"),
        (r"ALBÜMİN", "ALBÜMİN"),
        (r"TOTAL\s*PROTEİN", "TOTAL PROTEİN"),
        # --- Lipids ---
        (r"TOTAL\s*KOLESTEROL", "TOTAL KOLESTEROL"),
        (r"LDL\s*KOLESTEROL|^LDL$", "LDL"),
        (r"HDL\s*KOLESTEROL|^HDL$", "HDL"),
        (r"TRİGLİSERİD|TRIGLISERID", "TRİGLİSERİD"),
        (r"^VLDL$", "VLDL"),
        # --- Minerals ---
        (r"SODYUM|^NA$", "SODYUM"),
        (r"POTASYUM|^K$", "POTASYUM"),
        (r"KALSİYUM|KALSIYUM", "KALSİYUM"),
        (r"FOSFOR", "FOSFOR"),
        (r"MAGNEZYUM", "MAGNEZYUM"),
        (r"DEMİR|DEMIR", "DEMİR"),
        (r"FERRİTİN|FERRITIN", "FERRİTİN"),
        (r"ÇİNKO|CINKO", "ÇİNKO"),
        (r"^KLOR$", "KLOR"),
        # --- Infection markers ---
        (r"ANTİ\s*HIV|ANTI.*HIV", "ANTİ HIV"),
        (r"HBsAg", "HBsAg"),
        (r"ANTİ\s*HCV|ANTI.*HCV", "ANTİ HCV"),
        (r"ANTİ\s*HBs|ANTI.*HBs", "ANTİ HBs"),
        (r"^CRP$", "CRP"),
        (r"SEDİMANTASYON|SEDIMANTASYON", "SEDİMANTASYON"),
        # --- Hemogram ---
        (r"^WBC$", "WBC"),
        (r"^RBC$", "RBC"),
        (r"^HGB$|^HB$", "HGB"),
        (r"^HCT$", "HCT"),
        (r"^PLT$", "PLT"),
        (r"^MCV$", "MCV"),
        (r"^MCH$(?!\s*C)", "MCH"),
        (r"^MCHC$", "MCHC"),
        (r"^RDW(?:[_\s]CV)?$", "RDW"),
        (r"^MPV$", "MPV"),
        (r"^PDW$", "PDW"),
        (r"^PCT$", "PCT"),
        (r"^P-?LCR$", "P-LCR"),
        # Differential – absolute (#)
        (r"^NEU(?:TRO)?(?:FİL)?\s*#$|^NEUT?\s*#$", "NÖTROFİL #"),
        (r"^LYM(?:P|FO)?(?:SİT)?\s*#$", "LENFOSİT #"),
        (r"^MON(?:O)?(?:SİT)?\s*#$", "MONOSİT #"),
        (r"^EOS(?:İNOFİL)?\s*#$", "EOZİNOFİL #"),
        (r"^BAS(?:OFİL)?\s*#$", "BAZOFİL #"),
        # Differential – percent (%)
        (r"^NEU(?:TRO)?(?:FİL)?\s*%$|^NEUT?\s*%$", "NÖTROFİL %"),
        (r"^LYM(?:P|FO)?(?:SİT)?\s*%$", "LENFOSİT %"),
        (r"^MON(?:O)?(?:SİT)?\s*%$", "MONOSİT %"),
        (r"^EOS(?:İNOFİL)?\s*%$", "EOZİNOFİL %"),
        (r"^BAS(?:OFİL)?\s*%$", "BAZOFİL %"),
        # Fallback differential names
        (r"^NÖTROFİL$|^NOTROFIL$", "NÖTROFİL"),
        (r"^LENFOSİT$|^LENFOSIT$", "LENFOSİT"),
        (r"^MONOSİT$|^MONOSIT$", "MONOSİT"),
        (r"^EOZİNOFİL$|^EOZINOFIL$", "EOZİNOFİL"),
        (r"^BAZOFİL$|^BAZOFIL$", "BAZOFİL"),
        # --- Coagulation ---
        (r"^INR$", "INR"),
        (r"^PT$", "PT"),
        (r"^APTT$", "APTT"),
        (r"FİBRİNOJEN", "FİBRİNOJEN"),
        (r"D-?DİMER", "D-DİMER"),
        # --- Enzymes ---
        (r"AMİLAZ", "AMİLAZ"),
        (r"LİPAZ", "LİPAZ"),
        # --- Urinalysis ---
        (r"DANSİTE|DANSITE", "İDRAR DANSİTE"),
        (r"^pH$", "İDRAR pH"),
        (r"^PROTEİN$|^PROTEIN$", "İDRAR PROTEİN"),
        (r"^NİTRİT$|^NITRIT$", "İDRAR NİTRİT"),
        (r"^KETON$", "İDRAR KETON"),
        (r"^BİLİRUBİN$|^BILIRUBIN$", "İDRAR BİLİRUBİN"),
        (r"UROBİLİNOJEN|UROBILINOJEN", "ÜROBİLİNOJEN"),
        (r"^ERİTROSİT$|^ERITROSIT$", "İDRAR ERİTROSİT"),
        (r"^LÖKOSİT$|^LOKOSIT$|^LOKOSİT$", "İDRAR LÖKOSİT"),
    ]

    # ----------------------------------------------------------------
    # Lines that should be entirely ignored
    # ----------------------------------------------------------------
    SKIP_LINE_RE = re.compile(
        r"^(?:"
        r"MERKEZ LABORATUVAR"
        r"|Tetkik İsteyen"
        r"|DR\."
        r"|İşlem\s*:"
        r"|Numune"
        r"|Uzman Onay"
        r"|Tetkik İstem"
        r"|Tetkik Adı"
        r"|Sonuç"
        r"|Dur\.\s*Birim"
        r"|Ref\."
        r"|ÖZEL"
        r"|KOCAELİ"
        r"|TIBBI LABORATUVAR"
        r"|Laboratuvar Ruhsat"
        r"|Hastanın"
        r"|TC Kimlik"
        r"|Doğum"
        r"|Protokol"
        r"|Rapor Numarası"
        r"|Sicil"
        r"|Pasaport"
        r"|Uz\.Dr\."
        r"|Dip\.No"
        r"|Biyokimya.*Uzman"
        r"|Enfeksiyon"
        r"|Klinik Mikrobiyoloji"
        r"|MM\d+"
        r"|Bu rapor"
        r"|Rapor Revizyon"
        r"|\d+\s*/\s*\d+$"
        r"|Tel\s*:"
        r"|Fax\s*:"
        r"|Web\s*:"
        r"|E-?Posta"
        r"|\["
        r"|www\."
        r"|bilgi@"
        r"|Hayrettin"
        r")",
        re.IGNORECASE,
    )

    # Section headers – not tests but signal a new lab category
    SECTION_HEADERS = re.compile(
        r"^(?:BİYOKİMYA|HORMON.*ELİSA|HEMOGRAM|TAM KAN|SEDİMANTASYON\s+TESTİ"
        r"|TAM İDRAR|İDRAR|MİKROSKOPİ|MİKROBİYOLOJİ|SERUM|KOAGÜLASYON)$",
        re.IGNORECASE,
    )

    # Regex for date detection in text
    DATE_RE = re.compile(r"(\d{2})\.(\d{2})\.(\d{4})")

    # Numeric value pattern
    NUMERIC_RE = re.compile(r"^[<>]?\s*[-+]?\d+[.,]?\d*$")

    # Qualitative value pattern
    QUALITATIVE_VALUES = {
        "negatif", "pozitif", "normal", "reaktif", "non-reaktif",
        "non reaktif", "negative", "positive",
    }

    # Known units (lowercased)
    KNOWN_UNITS = {
        "mg/dl", "mg/l", "g/dl", "g/l", "µg/dl", "ug/dl", "ng/ml", "ng/dl",
        "pg/dl", "pg/ml", "µiu/ml", "uiu/ml", "miu/ml", "iu/ml", "u/l", "%",
        "mmol/l", "µmol/l", "umol/l", "meq/l", "s/co", "ul", "hpf", "mm/saat",
        "fl", "pg", "k/ul", "10^3/ul", "10^6/ul", "ratio", "ml/dk/1.73 m2",
        "10*3/ul", "10*6/ul",
    }

    # ----------------------------------------------------------------
    # Helpers
    # ----------------------------------------------------------------
    @classmethod
    def _extract_text(cls, pdf_bytes: bytes) -> str:
        if not PDF_SUPPORT:
            raise ImportError("PyMuPDF gerekli: pip install PyMuPDF")
        text = ""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page in doc:
            text += page.get_text() + "\n"
        doc.close()
        return text

    @classmethod
    def _find_date(cls, text: str) -> Optional[str]:
        m = cls.DATE_RE.search(text)
        if m:
            d, mo, y = m.groups()
            return f"{y}-{mo}-{d}"
        return None

    @classmethod
    def _is_skip(cls, line: str) -> bool:
        return bool(cls.SKIP_LINE_RE.match(line))

    @classmethod
    def _is_section_header(cls, line: str) -> bool:
        return bool(cls.SECTION_HEADERS.match(line))

    @classmethod
    def _is_date_line(cls, line: str) -> bool:
        """Lines like '13.03.2026 10:41:44'"""
        return bool(re.match(r"^\d{2}\.\d{2}\.\d{4}", line))

    @classmethod
    def _is_numeric(cls, s: str) -> bool:
        cleaned = s.strip().replace(",", ".").replace(" ", "")
        return bool(cls.NUMERIC_RE.match(cleaned))

    @classmethod
    def _is_qualitative(cls, s: str) -> bool:
        return s.strip().lower() in cls.QUALITATIVE_VALUES

    @classmethod
    def _is_value(cls, s: str) -> bool:
        return cls._is_numeric(s) or cls._is_qualitative(s)

    @classmethod
    def _is_flag(cls, s: str) -> bool:
        """Y (Yüksek) / D (Düşük) single letter flags."""
        return s.strip() in ("Y", "D", "H", "L", "N")

    @classmethod
    def _is_unit(cls, s: str) -> bool:
        return s.strip().lower() in cls.KNOWN_UNITS

    @classmethod
    def _is_reference(cls, s: str) -> bool:
        s = s.strip()
        if re.search(r"\d+[.,]?\d*\s*-\s*\d+[.,]?\d*", s):
            return True
        if re.match(r"^[<>]\s*\d", s):
            return True
        return False

    @classmethod
    def _canonicalize(cls, raw_name: str) -> Optional[str]:
        """Map raw test name to canonical display name."""
        n = raw_name.strip().upper()
        # Remove parenthetical extras like "(Aspartat Aminotransferaz, SGOT)"
        # but keep the base name for matching
        for pattern, display in cls.TEST_NAME_MAP:
            if re.search(pattern, n, re.IGNORECASE):
                return display
        return None

    # ----------------------------------------------------------------
    # Main table‑aware parser
    # ----------------------------------------------------------------
    @classmethod
    def _parse_structured(cls, text: str) -> List[PDFLabResult]:
        """
        Parse lab results from PDF text using a state-machine approach.
        Handles multi-line test names, inline values, flags (Y/D), and
        multi-line reference ranges.
        """
        results: List[PDFLabResult] = []
        lines = [ln.strip() for ln in text.split("\n") if ln.strip()]

        i = 0
        while i < len(lines):
            line = lines[i]

            # Skip noise
            if cls._is_skip(line) or cls._is_section_header(line) or cls._is_date_line(line):
                i += 1
                continue

            # --- Try to recognise a test name in the current line ---
            # Some PDFs concatenate name + value on one line, e.g.
            #   "TSH (Tiroid Stimülan Hormon) 1,15"
            # Strategy: try the full line first; if it doesn't match,
            # try removing a trailing numeric token.

            canonical = cls._canonicalize(line)
            inline_value: Optional[str] = None

            if not canonical:
                # Try stripping a trailing numeric value
                m = re.match(r"^(.+?)\s+([\d]+[.,]?\d*)$", line)
                if m:
                    name_part, val_part = m.group(1).strip(), m.group(2).strip()
                    canonical = cls._canonicalize(name_part)
                    if canonical:
                        inline_value = val_part

            if not canonical:
                # Try merging with next line (multi‑line test names)
                if i + 1 < len(lines):
                    merged = line + " " + lines[i + 1]
                    canonical = cls._canonicalize(merged)
                    if canonical:
                        i += 1  # consume extra line
                        # Also check for inline value in merged line
                        m2 = re.match(r"^(.+?)\s+([\d]+[.,]?\d*)$", merged)
                        if m2:
                            c2 = cls._canonicalize(m2.group(1).strip())
                            if c2:
                                canonical = c2
                                inline_value = m2.group(2).strip()

            if not canonical:
                i += 1
                continue

            # --- Found a test name.  Now harvest value, unit, reference ---
            value = inline_value
            unit: Optional[str] = None
            reference: Optional[str] = None
            ref_parts: List[str] = []

            j = i + 1
            lookahead = 0
            max_lookahead = 8  # generous for multi-line references

            while j < len(lines) and lookahead < max_lookahead:
                nxt = lines[j].strip()

                # Stop if we hit another test, section header, or skip line
                if cls._canonicalize(nxt):
                    break
                # Also check merged with next for early-stop
                if j + 1 < len(lines) and cls._canonicalize(nxt + " " + lines[j + 1].strip()):
                    break

                if cls._is_skip(nxt) or cls._is_section_header(nxt) or cls._is_date_line(nxt):
                    j += 1
                    lookahead += 1
                    continue

                # Flag letter (Y/D) – skip
                if cls._is_flag(nxt):
                    j += 1
                    lookahead += 1
                    continue

                # Value (first numeric/qualitative we hit)
                if not value and cls._is_value(nxt):
                    value = nxt
                    j += 1
                    lookahead += 1
                    continue

                # Unit
                if not unit and cls._is_unit(nxt):
                    unit = nxt
                    j += 1
                    lookahead += 1
                    continue

                # Reference range (may be multi-line like "Normal 0-200\nSınırda 200-239\nYüksek >=240")
                if cls._is_reference(nxt) or (ref_parts and re.match(r"^(Normal|Sınırda|Yüksek|Düşük)", nxt, re.IGNORECASE)):
                    ref_parts.append(nxt)
                    j += 1
                    lookahead += 1
                    continue
                
                # Continuation of reference on label lines (e.g. "Sınırda 200 - 239")
                if ref_parts and re.match(r"^(Normal|Sınırda|Yüksek|Düşük)\s", nxt, re.IGNORECASE):
                    ref_parts.append(nxt)
                    j += 1
                    lookahead += 1
                    continue

                # Unknown short token that might be unit
                if value and not unit and len(nxt) < 20 and not cls._is_reference(nxt):
                    # Could be unit with special chars: "µIU/mL" etc.
                    # Basic heuristic: contains a "/" or is very short
                    if "/" in nxt or len(nxt) <= 8:
                        unit = nxt
                        j += 1
                        lookahead += 1
                        continue

                # If we've collected enough, stop
                if value and (unit or len(ref_parts) > 0):
                    # one more chance for reference
                    if not ref_parts:
                        j += 1
                        lookahead += 1
                        continue
                    break

                j += 1
                lookahead += 1

            # Assemble reference
            if ref_parts:
                reference = " | ".join(ref_parts)

            if value:
                # Normalise commas in value for consistency
                results.append(
                    PDFLabResult(
                        test_name=canonical,
                        value=value.replace(".", ",") if cls._is_numeric(value) and "." in value else value,
                        unit=unit,
                        reference=reference,
                    )
                )

            i = j if j > i + 1 else i + 1

        return results

    # ----------------------------------------------------------------
    # Public API
    # ----------------------------------------------------------------
    @classmethod
    def parse_pdf(cls, pdf_bytes: bytes) -> PDFLabParserResponse:
        if not PDF_SUPPORT:
            return PDFLabParserResponse(
                success=False,
                message="PyMuPDF is required for PDF parsing. Install with: pip install PyMuPDF",
            )

        try:
            text = cls._extract_text(pdf_bytes)
        except Exception as e:
            return PDFLabParserResponse(
                success=False, message=f"PDF text extraction failed: {str(e)}"
            )

        if not text or len(text.strip()) < 10:
            return PDFLabParserResponse(
                success=False, message="PDF içeriği okunamadı veya boş."
            )

        report_date = cls._find_date(text)
        results = cls._parse_structured(text)

        # De-duplicate by test name (keep first occurrence)
        seen: set = set()
        unique: List[PDFLabResult] = []
        for r in results:
            if r.test_name not in seen:
                seen.add(r.test_name)
                unique.append(r)

        if not unique:
            return PDFLabParserResponse(
                success=False,
                message="PDF'de tanınabilir lab sonucu bulunamadı.",
                report_date=report_date,
                results=[],
                raw_text=text[:2000],
            )

        return PDFLabParserResponse(
            success=True,
            message=f"{len(unique)} adet lab sonucu bulundu.",
            report_date=report_date,
            results=unique,
        )

    # Keep backward compatibility alias
    extract_text_from_pdf = _extract_text
    find_date = _find_date
