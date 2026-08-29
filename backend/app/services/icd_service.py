import json
import os
import re
from typing import List, Dict, Optional

class ICDService:
    _instance = None
    _is_initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ICDService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._is_initialized:
            self._codes: List[Dict[str, str]] = []
            self._lookup: Dict[str, str] = {}
            self._load_data()
            self.__class__._is_initialized = True

    def _normalize_text(self, text: str) -> str:
        if not text:
            return ""
        text = text.lower()
        replacements = {
            'ı': 'i', 'i̇': 'i',
            'ö': 'o', 'ö': 'o',
            'ü': 'u', 'ü': 'u',
            'ç': 'c', 'ç': 'c',
            'ş': 's', 'ş': 's',
            'ğ': 'g', 'ğ': 'g'
        }
        for tr, eng in replacements.items():
            text = text.replace(tr, eng)
        return text.strip()

    def _load_data(self):
        file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "icd_codes.json")
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                self._codes = json.load(f)
                # Build Fast lookup dictionary
                for item in self._codes:
                    if "kodu" in item:
                        self._lookup[str(item["kodu"]).upper()] = item.get("adi", "")
            print(f"✅ ICD-10 data loaded into memory. Total items: {len(self._codes)}")
        except Exception as e:
            print(f"🔥 CRITICAL ERROR loading ICD codes: {e}")
            self._codes = []

    def search(self, query: str, limit: int = 20) -> List[Dict[str, str]]:
        if not query:
            return []

        normalized_query = self._normalize_text(query)
        search_terms = [t for t in normalized_query.split() if t]
        
        results = []
        seen_codes = set()

        # 1. Exact Code Match
        for item in self._codes:
            code_norm = self._normalize_text(item["kodu"])
            if code_norm == normalized_query:
                results.append(item)
                seen_codes.add(item["kodu"])
                if len(results) >= limit:
                    return results

        # 2. Starts With Code Match
        for item in self._codes:
            if item["kodu"] in seen_codes:
                continue
            code_norm = self._normalize_text(item["kodu"])
            if code_norm.startswith(normalized_query):
                results.append(item)
                seen_codes.add(item["kodu"])
                if len(results) >= limit:
                    return results

        # 3. Name Match (All terms must exist in the name)
        for item in self._codes:
            if item["kodu"] in seen_codes:
                continue
            name_norm = self._normalize_text(item["adi"])
            
            # Check if all search terms are in the normalized name
            all_match = all(term in name_norm for term in search_terms)
            if all_match:
                results.append(item)
                seen_codes.add(item["kodu"])
                if len(results) >= limit:
                    break

        return results

    def lookup_name(self, code: str) -> str:
        """
        Looks up the name of an ICD code.
        If code is not a valid ICD pattern or not found, returns the code itself.
        """
        if not code or not isinstance(code, str):
            return str(code) if code else ""
            
        try:
            upper_code = code.upper().strip()
            # Simple validation for ICD-10 pattern (e.g., A00, B20.1)
            pattern = re.compile(r'^[A-Z]\d{2}(\.\d+)?$')
            if not pattern.match(upper_code):
                return code
            
            return self._lookup.get(upper_code, code)
        except Exception as e:
            print(f"⚠️ Error in ICD lookup_name: {e}")
            return code

# Singleton instance
icd_service = ICDService()
