
import unittest
import os
import sys

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.pdf.base import BasePDFService

class TestPDFBranding(unittest.TestCase):
    def test_font_discovery(self):
        service = BasePDFService()
        print(f"Discovered font: {service.font_path}")
        self.assertIsNotNone(service.font_path, "Font should be discovered")
        self.assertIn("Roboto-Regular.ttf", service.font_path, "Should use Roboto-Regular.ttf")

    def test_logo_method_exists(self):
        service = BasePDFService()
        self.assertTrue(hasattr(service, 'draw_logo'), "draw_logo method should exist")

    def test_secure_footer(self):
        service = BasePDFService()
        # service.save() # REMOVED: This closes the doc, preventing the next save() from working.
        
        # We can't easily parse the PDF text here without more complex logic, 
        # but we can check if the code runs without error and arguably mock fitz if needed.
        # For now, let's trust visual inspection for the exact string, 
        # but check if UUID generation logic exists if we were unit testing that specific method.
        # Since we are doing black-box style on the service:
        
        # Let's inspect the page text content using robust PDF parsing
        # This is "Verification Plan -> Automated -> Test Script"
        import fitz
        
        stream = service.save() # Finalizes and closes doc
        doc = fitz.open(stream=stream, filetype="pdf")
        page = doc[0]
        text = page.get_text()
        
        self.assertIn("UroLog Secure PDF", text, "Footer must contain secure label")
        # Check for generated UUID (simple length check or regex if needed)
        self.assertIn("Verification:", text, "Footer must contain Verification label")

if __name__ == '__main__':
    unittest.main()
