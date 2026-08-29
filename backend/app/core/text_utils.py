# Turkish character normalization mapping
TURKISH_CHAR_MAP = {
    "İ": "I",
    "ı": "i",
    "Ş": "S",
    "ş": "s",
    "Ğ": "G",
    "ğ": "g",
    "Ü": "U",
    "ü": "u",
    "Ö": "O",
    "ö": "o",
    "Ç": "C",
    "ç": "c",
    "i̇": "i",  # Dotted lowercase i (combining dot above)
}


def normalize_turkish(text: str) -> str:
    """
    Normalize Turkish characters to ASCII equivalents.
    This allows matching "Kreatinin" = "KREATİNİN" = "KREATININ"
    """
    if not text:
        return text
    result = text
    for tr_char, ascii_char in TURKISH_CHAR_MAP.items():
        result = result.replace(tr_char, ascii_char)
    return result
