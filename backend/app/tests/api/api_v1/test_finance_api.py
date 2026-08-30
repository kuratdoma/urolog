import pytest
from datetime import date
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.api import deps
from app.models.user import User
from app.core.permissions import UserRole

client = TestClient(app)

def override_get_current_user():
    return User(id=1, email="doctor@urolog.com", username="dr_test", is_active=True, is_superuser=True, role=UserRole.ADMIN)

app.dependency_overrides[deps.get_current_user] = override_get_current_user


@patch("app.repositories.finance.income_repository.IncomeRepository.get_financial_summary")
def test_finance_summary(mock_summary):
    mock_summary.return_value = {
        "toplam_gelir": 15000.0,
        "toplam_gider": 3500.0,
        "net_bakiye": 11500.0,
        "tahsil_edilen": 12000.0,
        "bekleyen_tahsilat": 3000.0,
        "bekleyen_odeme": 500.0,
        "islem_sayisi": 18
    }

    response = client.get("/api/v1/finance/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["toplam_gelir"] == 15000.0
    assert data["net_bakiye"] == 11500.0


@patch("app.repositories.finance.income_repository.IncomeRepository.get_financial_summary")
def test_finance_daily_summary(mock_summary):
    mock_summary.return_value = {
        "toplam_gelir": 2500.0,
        "toplam_gider": 400.0,
        "net_bakiye": 2100.0,
        "tahsil_edilen": 2500.0,
        "bekleyen_tahsilat": 0.0,
        "bekleyen_odeme": 0.0,
        "islem_sayisi": 4
    }

    response = client.get("/api/v1/finance/summary/daily?tarih=2026-08-30")
    assert response.status_code == 200
    data = response.json()
    assert data["gelir"] == 2500.0
    assert data["gider"] == 400.0
    assert data["net"] == 2100.0


def test_finance_category_breakdown_validation():
    # islem_tipi 'gelir' veya 'gider' dışında bir şey olamaz
    response = client.get("/api/v1/finance/reports/category-breakdown?islem_tipi=gecersiz")
    assert response.status_code == 422


@patch("app.repositories.finance.income_repository.IncomeRepository.get_aging_report")
def test_finance_aging_report(mock_aging):
    mock_aging.return_value = [
        {"kova": "0_30", "etiket": "0-30 Gün", "tutar": 5000.0, "islem_sayisi": 5},
        {"kova": "31_60", "etiket": "31-60 Gün", "tutar": 3000.0, "islem_sayisi": 2},
        {"kova": "61_90", "etiket": "61-90 Gün", "tutar": 2000.0, "islem_sayisi": 1},
    ]

    response = client.get("/api/v1/finance/reports/aging")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert data[0]["kova"] == "0_30"
    assert data[0]["etiket"] == "0-30 Gün"


def test_finance_rbac_unauthorized():
    # Yetkisiz rol (Hemşire vb.) finans modülüne erişmeye çalıştığında 403 almalı
    def override_nurse_user():
        return User(id=2, email="nurse@urolog.com", username="nurse_test", is_active=True, is_superuser=False, role=UserRole.NURSE)

    original_override = app.dependency_overrides.get(deps.get_current_user)
    app.dependency_overrides[deps.get_current_user] = override_nurse_user
    try:
        response = client.get("/api/v1/finance/summary")
        assert response.status_code == 403
    finally:
        if original_override:
            app.dependency_overrides[deps.get_current_user] = original_override
        else:
            app.dependency_overrides.pop(deps.get_current_user, None)
