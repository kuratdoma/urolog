import pytest
from app.services.audit_service import serialize_for_json

def test_audit_service_pii_redaction():
    # Details containing PII
    pii_details = {
        "status": "success",
        "ad": "Gizli",
        "soyad": "Kullanici",
        "tc_kimlik": "12345678901",
        "email": "test@example.com",
        "birth_date": "1990-01-01",
        "credit_card": "1234-5678-9012-3456",
        "other_info": "Safe"
    }
    
    # Run the serialization (which includes redaction)
    redacted_details = serialize_for_json(pii_details)
    
    assert redacted_details["status"] == "success"
    assert redacted_details["other_info"] == "Safe"
    
    # These should be redacted
    assert redacted_details["ad"] == "[REDACTED]"
    assert redacted_details["soyad"] == "[REDACTED]"
    assert redacted_details["tc_kimlik"] == "[REDACTED]"
    assert redacted_details["email"] == "[REDACTED]"
    assert redacted_details["birth_date"] == "[REDACTED]"
    assert redacted_details["credit_card"] == "[REDACTED]"
