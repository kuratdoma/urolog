import fitz
from typing import List
import logging

logger = logging.getLogger(__name__)


def wrap_text(
    text: str, font_name: str, fontsize: float, max_width: float, font_path: str = None
) -> List[str]:
    """
    Wraps text to fit within a given width.
    If font_path is provided, uses fitz.Font for correct length calculation with custom fonts.
    Otherwise uses fitz.get_text_length with standard font names.
    """
    if not text:
        return []

    lines = []
    paragraphs = text.split("\n")

    # Cache font object if providing path to avoid repetitive disk I/O per word
    if font_path:
        try:
            # We try to use a persistent font object if possible, but for simplicity in a stateless
            # utility function, we at least open it once per wrap_text call instead of per word.
            font_obj = fitz.Font(fontfile=font_path)
        except Exception as e:
            logger.error(f"Failed to load font {font_path}: {e}")
            font_obj = None

    def get_length(s: str) -> float:
        if font_obj:
            return font_obj.text_length(s, fontsize=fontsize)
        return fitz.get_text_length(s, fontname=font_name, fontsize=fontsize)

    for paragraph in paragraphs:
        words = paragraph.split(" ")
        current_line = []

        for word in words:
            # Try adding the word
            test_line = " ".join(current_line + [word])
            length = get_length(test_line)

            if length <= max_width:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(" ".join(current_line))
                    current_line = [word]
                else:
                    # Single word is wider than max_width, force it
                    lines.append(word)
                    current_line = []

        if current_line:
            lines.append(" ".join(current_line))

    return lines
