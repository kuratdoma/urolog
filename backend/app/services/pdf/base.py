import fitz
import io
import logging
import os
import uuid
from typing import Optional, Tuple, Any

logger = logging.getLogger(__name__)


class BasePDFService:
    """
    Base service for PDF generation providing core layout and font management.
    Designed for Turkish character compatibility and architectural consistency.
    """

    def __init__(self, title: str = "UroLog Rapor"):
        self.doc = fitz.open()
        self.title = title
        self.margin = 50
        self.page = None
        self.y = 0
        self.width = 0
        self.height = 0
        self.doc_uuid = str(uuid.uuid4())

        # Resolve Asset Path
        # base.py is in backend/app/services/pdf/
        # Assets are in backend/app/assets/branding/
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.assets_dir = os.path.abspath(
            os.path.join(current_dir, "../../assets/branding")
        )

        # Asset Discovery & Caching (Story 3-2: Performance and Brand Compliance)
        self.font_path, self.bold_font_path = self._discover_fonts()
        self.primary_font = "tr" if self.font_path else "Helvetica"
        self.bold_font = (
            "tr-bold"
            if self.bold_font_path
            else (self.primary_font if self.font_path else "Helvetica-Bold")
        )

        self.logo_bytes = self._load_logo()

        # Initialize first page
        self._new_page()

    def _discover_fonts(self) -> Tuple[Optional[str], Optional[str]]:
        """Finds bundled Roboto fonts."""
        reg_path = os.path.join(self.assets_dir, "Roboto-Regular.ttf")
        bold_path = os.path.join(self.assets_dir, "Roboto-Bold.ttf")

        res_reg = reg_path if os.path.exists(reg_path) else None
        res_bold = bold_path if os.path.exists(bold_path) else None

        if res_reg:
            logger.info(f"Found bundled Roboto-Regular: {res_reg}")
        if res_bold:
            logger.info(f"Found bundled Roboto-Bold: {res_bold}")

        return res_reg, res_bold

    def _load_logo(self) -> Optional[bytes]:
        """Caches logo bytes to minimize disk I/O."""
        logo_path = os.path.join(self.assets_dir, "logo.png")
        if os.path.exists(logo_path):
            with open(logo_path, "rb") as f:
                return f.read()
        logger.warning("Logo not found for PDF caching.")
        return None

    def _insert_text(
        self,
        point: Tuple[float, float],
        text: str,
        fontsize: float = 11,
        fontname: str = None,
        color: Tuple[float, float, float] = (0, 0, 0),
        bold: bool = False,
    ):
        """Helper to insert text with proper font embedding if needed."""
        if not self.page:
            return

        # Determine font based on weight
        if fontname:
            final_font = fontname
        elif bold:
            final_font = self.bold_font
        else:
            final_font = self.primary_font

        self.page.insert_text(
            point, text, fontname=final_font, fontsize=fontsize, color=color
        )

    def _new_page(self):
        """Creates a new page and resets cursor."""
        self.page = self.doc.new_page()

        # Register fonts on the NEW page
        if self.font_path:
            self.page.insert_font(fontname="tr", fontfile=self.font_path)
        if self.bold_font_path:
            self.page.insert_font(fontname="tr-bold", fontfile=self.bold_font_path)

        self.width = self.page.rect.width - (2 * self.margin)
        self.height = self.page.rect.height
        self.y = self.margin
        self.draw_header()

    def check_page_break(self, needed_height: float):
        """Checks if enough space is left, otherwise breaks page."""
        if self.y + needed_height > self.height - self.margin:
            self._new_page()

    def draw_logo(self):
        """Draws the branding logo from memory cache."""
        if self.logo_bytes:
            rect = fitz.Rect(self.margin, 20, self.margin + 100, 60)
            self.page.insert_image(rect, stream=self.logo_bytes)
        else:
            logger.warning("No logo data available to draw.")

    def draw_header(self):
        """Draws the standard application header."""
        # Draw Logo
        self.draw_logo()

        # Draw Title (Shifted right to not overlap logo, or center it)
        # Assuming logo is on left, let's center title or put it on right.
        # Previous implementation: (self.margin, self.y)

        # Let's move title down or right.
        # Logo max Y is around 60.
        title_y = 45

        self._insert_text(
            (self.margin + 120, title_y),  # Shift past logo
            self.title,
            bold=True,
            fontsize=16,
            color=(0.1, 0.2, 0.5),
        )

        self.y = 70  # Below logo/title

        self.page.draw_line(
            (self.margin, self.y),
            (self.margin + self.width, self.y),
            color=(0.8, 0.8, 0.8),
            width=1,
        )
        self.y += 20

    def draw_footer(self):
        """Draws footer on all pages without redundant registrations."""
        for i in range(len(self.doc)):
            page = self.doc[i]

            # Secure Footer Line 1: Page Info & System Name
            point_info = (self.margin, self.height - 35)
            text_info = f"Sayfa {i+1} / {len(self.doc)} | UroLog Digital Health System"

            # Secure Footer Line 2: Security Verification
            point_sec = (self.margin, self.height - 20)
            text_sec = f"UroLog Secure PDF | Verification: {self.doc_uuid}"

            # We assume fonts are registered per page in _new_page
            page.insert_text(
                point_info,
                text_info,
                fontname=self.primary_font,
                fontsize=8,
                color=(0.6, 0.6, 0.6),
            )
            page.insert_text(
                point_sec,
                text_sec,
                fontname=self.primary_font,
                fontsize=7,
                color=(0.5, 0.5, 0.5),
            )

    def draw_section_title(self, text: str):
        """Draws a themed section title."""
        self.check_page_break(40)
        self.y += 10
        self._insert_text(
            (self.margin, self.y),
            text.upper(),
            bold=True,
            fontsize=12,
            color=(0.2, 0.2, 0.2),
        )
        self.y += 18
        self.page.draw_line(
            (self.margin, self.y),
            (self.margin + 60, self.y),
            color=(0.3, 0.5, 0.8),
            width=2,
        )
        self.y += 15

    def draw_key_value(self, key: str, value: Any, x_offset: float = 10):
        """Draws a standard key-value pair."""
        self.check_page_break(15)
        text = f"{key}: {value if value is not None else 'N/A'}"
        self._insert_text((self.margin + x_offset, self.y), text, fontsize=10)
        self.y += 14

    def save(self) -> io.BytesIO:
        """Finalizes and returns the PDF stream."""
        self.draw_footer()
        stream = io.BytesIO()
        self.doc.save(stream)
        self.doc.close()
        stream.seek(0)
        return stream
