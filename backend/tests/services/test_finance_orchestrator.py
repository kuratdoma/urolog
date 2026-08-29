"""
Finans para mantığı regresyon testleri.

Kasa bakiyesini ve hasta borcunu etkileyen kurallar burada sabitlenir:
tutar doğrulaması, kilitli alanların güncellenememesi ve taksit yuvarlaması.
"""
import pytest
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

# app.db.base tüm modelleri sırayla kayda alır; finans modellerini doğrudan
# import eden ilk modül olmak dairesel import hatasına yol açıyor.
import app.db.base  # noqa: F401
from app.services.orchestrators.finance_orchestrator import FinanceOrchestrator
from app.core.user_context import UserContext


def _orchestrator():
    """Repoları mocklanmış, DB'ye dokunmayan orchestrator."""
    mock_db = AsyncMock()
    orch = FinanceOrchestrator(mock_db, UserContext(user_id=1, username="admin"))
    orch.patient_repo = AsyncMock()
    orch.income_repo = AsyncMock()
    orch.expense_repo = AsyncMock()
    return orch, mock_db


def _odeme(tutar: float):
    """FinansOdemeCreate'in zorunlu alanlarını dolduran ödeme sözlüğü."""
    return {
        "tutar": tutar,
        "odeme_tarihi": "2026-01-15",
        "odeme_yontemi": "Nakit",
    }


def _tx_data(**overrides):
    data = {
        "islem_tipi": "gelir",
        "tarih": "2026-01-15",
        "tutar": 1000.0,
        "net_tutar": 1000.0,
        "odemeler": [],
        "satirlar": [],
    }
    data.update(overrides)
    return data


# =============================================================================
# İşlem oluşturma doğrulamaları
# =============================================================================
@pytest.mark.asyncio
async def test_sifir_tutarli_islem_reddedilir():
    orch, _ = _orchestrator()
    with pytest.raises(ValueError, match="sıfırdan büyük"):
        await orch.create_transaction_safely(_tx_data(net_tutar=0))


@pytest.mark.asyncio
async def test_negatif_tutarli_islem_reddedilir():
    orch, _ = _orchestrator()
    with pytest.raises(ValueError, match="sıfırdan büyük"):
        await orch.create_transaction_safely(_tx_data(net_tutar=-500))


@pytest.mark.asyncio
async def test_net_tutari_asan_odeme_reddedilir():
    """Fazla tahsilat kasayı şişirir ve hasta bakiyesini eksiye düşürür."""
    orch, _ = _orchestrator()
    data = _tx_data(net_tutar=1000, odemeler=[_odeme(1500)])
    with pytest.raises(ValueError, match="aşamaz"):
        await orch.create_transaction_safely(data)


@pytest.mark.asyncio
async def test_parcali_odeme_toplami_net_tutara_esitse_kabul_edilir():
    orch, _ = _orchestrator()
    tx = MagicMock(id=42)
    orch.income_repo.create_income_transaction.return_value = tx
    orch.income_repo.get_transaction.return_value = tx

    data = _tx_data(net_tutar=1000, odemeler=[_odeme(400), _odeme(600)])
    await orch.create_transaction_safely(data)

    orch.income_repo.create_income_transaction.assert_awaited_once()


@pytest.mark.asyncio
async def test_sifir_tutarli_odeme_reddedilir():
    orch, _ = _orchestrator()
    data = _tx_data(net_tutar=1000, odemeler=[_odeme(0)])
    with pytest.raises(ValueError, match="Ödeme tutarları"):
        await orch.create_transaction_safely(data)


@pytest.mark.asyncio
async def test_var_olmayan_hasta_ile_islem_reddedilir():
    orch, _ = _orchestrator()
    orch.patient_repo.get_by_id.return_value = None
    with pytest.raises(ValueError, match="hasta kaydı bulunamadı"):
        await orch.create_transaction_safely(_tx_data(hasta_id=uuid4()))


@pytest.mark.asyncio
async def test_gider_islemi_expense_repoya_yonlendirilir():
    orch, _ = _orchestrator()
    tx = MagicMock(id=7)
    orch.expense_repo.create_expense_transaction.return_value = tx
    orch.income_repo.get_transaction.return_value = tx

    await orch.create_transaction_safely(_tx_data(islem_tipi="gider"))

    orch.expense_repo.create_expense_transaction.assert_awaited_once()
    orch.income_repo.create_income_transaction.assert_not_awaited()


@pytest.mark.asyncio
async def test_olusturma_sonrasi_durum_senkronlanir():
    """Tahsilat tamamsa işlem 'tamamlandi' olmalı — sync çağrılmazsa kalır."""
    orch, _ = _orchestrator()
    tx = MagicMock(id=99)
    orch.income_repo.create_income_transaction.return_value = tx
    orch.income_repo.get_transaction.return_value = tx

    await orch.create_transaction_safely(_tx_data())

    orch.income_repo.sync_transaction_status.assert_awaited_once_with(99)


# =============================================================================
# İşlem güncelleme — kilitli alanlar
# =============================================================================
@pytest.mark.asyncio
async def test_iptal_edilmis_islem_guncellenemez():
    orch, _ = _orchestrator()
    orch.income_repo.get_transaction.return_value = MagicMock(durum="iptal")
    with pytest.raises(ValueError, match="İptal edilmiş"):
        await orch.update_transaction(1, {"aciklama": "yeni"})


@pytest.mark.asyncio
async def test_olmayan_islem_guncellemesi_none_doner():
    orch, _ = _orchestrator()
    orch.income_repo.get_transaction.return_value = None
    assert await orch.update_transaction(1, {"aciklama": "x"}) is None


@pytest.mark.asyncio
async def test_bakiyeyi_etkileyen_alanlar_guncellemeden_ayiklanir():
    """tutar / net_tutar / kasa_id kasa bakiyesini bozar; UPDATE'e girmemeli."""
    orch, mock_db = _orchestrator()
    orch.income_repo.get_transaction.return_value = MagicMock(durum="bekliyor")

    await orch.update_transaction(
        1,
        {
            "tutar": 9999,
            "net_tutar": 9999,
            "kasa_id": 5,
            "aciklama": "düzeltme",
        },
    )

    assert mock_db.execute.await_count == 1
    stmt = mock_db.execute.await_args.args[0]
    guncellenen = set(stmt.compile().params.keys())

    assert any("aciklama" in k for k in guncellenen)
    for kilitli in ("tutar", "net_tutar", "kasa_id"):
        assert not any(
            k == kilitli or k.startswith(f"{kilitli}_") for k in guncellenen
        ), f"{kilitli} güncellenmemeliydi (params: {guncellenen})"


@pytest.mark.asyncio
async def test_sadece_kilitli_alan_gelirse_update_calistirilmaz():
    orch, mock_db = _orchestrator()
    tx = MagicMock(durum="bekliyor")
    orch.income_repo.get_transaction.return_value = tx

    sonuc = await orch.update_transaction(1, {"tutar": 5000})

    mock_db.execute.assert_not_awaited()
    assert sonuc is tx


# =============================================================================
# Toplu tahsilat dağıtımı
# =============================================================================
def _acik(islem_id, ref, kalan):
    return {
        "id": islem_id,
        "referans_kodu": ref,
        "tarih": "2026-01-01",
        "vade_tarihi": None,
        "aciklama": None,
        "net_tutar": kalan,
        "odenen_tutar": 0.0,
        "kalan_tutar": kalan,
    }


@pytest.mark.asyncio
async def test_toplu_tahsilat_en_eski_borctan_baslar():
    """FIFO: liste sırası korunmalı, ilk borç tam kapanmadan ikinciye geçilmemeli."""
    orch, _ = _orchestrator()
    orch.income_repo.get_open_transactions.return_value = [
        _acik(1, "GEL-1", 300.0),
        _acik(2, "GEL-2", 500.0),
    ]

    sonuc = await orch.collect_bulk(
        patient_id=uuid4(), tutar=400.0, kasa_id=1,
        odeme_yontemi="Nakit", odeme_tarihi="2026-02-01",
    )

    assert sonuc["tahsil_edilen"] == 400.0
    assert sonuc["islem_sayisi"] == 2
    # İlk işlem tamamen, ikinci kısmen kapanmalı
    assert sonuc["dagitim"][0] == {
        "islem_id": 1, "referans_kodu": "GEL-1", "tutar": 300.0, "kalan_borc": 0.0,
    }
    assert sonuc["dagitim"][1]["tutar"] == 100.0
    assert sonuc["dagitim"][1]["kalan_borc"] == 400.0


@pytest.mark.asyncio
async def test_toplu_tahsilat_toplam_borcu_asamaz():
    orch, _ = _orchestrator()
    orch.income_repo.get_open_transactions.return_value = [_acik(1, "GEL-1", 250.0)]

    with pytest.raises(ValueError, match="toplam borcu aşıyor"):
        await orch.collect_bulk(
            patient_id=uuid4(), tutar=1000.0, kasa_id=1,
            odeme_yontemi="Nakit", odeme_tarihi="2026-02-01",
        )


@pytest.mark.asyncio
async def test_acik_borcu_olmayan_hastada_toplu_tahsilat_reddedilir():
    orch, _ = _orchestrator()
    orch.income_repo.get_open_transactions.return_value = []

    with pytest.raises(ValueError, match="açık borcu yok"):
        await orch.collect_bulk(
            patient_id=uuid4(), tutar=100.0, kasa_id=1,
            odeme_yontemi="Nakit", odeme_tarihi="2026-02-01",
        )


@pytest.mark.asyncio
async def test_toplu_tahsilat_tam_kapatma_kurusu_birakmaz():
    """Toplam borcun tamamı ödendiğinde artan kalmamalı."""
    orch, _ = _orchestrator()
    orch.income_repo.get_open_transactions.return_value = [
        _acik(1, "GEL-1", 333.33),
        _acik(2, "GEL-2", 666.67),
    ]

    sonuc = await orch.collect_bulk(
        patient_id=uuid4(), tutar=1000.0, kasa_id=1,
        odeme_yontemi="Nakit", odeme_tarihi="2026-02-01",
    )

    assert sonuc["tahsil_edilen"] == 1000.0
    assert all(d["kalan_borc"] == 0.0 for d in sonuc["dagitim"])


# =============================================================================
# Taksit yuvarlaması
# =============================================================================
@pytest.mark.parametrize(
    "tutar,adet",
    [
        (1000.0, 3),    # 333.33 x2 + 333.34
        (100.0, 3),     # klasik 1/3 tuzağı
        (1000.0, 7),
        (12345.67, 12),
        (999.99, 6),
    ],
)
def test_taksit_toplami_odeme_tutarina_esit(tutar, adet):
    """
    Taksitlerin toplamı ödeme tutarını kuruşu kuruşuna vermeli.

    Uygulanan yöntem (income_repository.add_payment ile aynı): eşit taksitler
    yuvarlanır, artan/eksilen fark son taksite yazılır.
    """
    base = round(tutar / adet, 2)
    son = round(tutar - base * (adet - 1), 2)
    taksitler = [base] * (adet - 1) + [son]

    toplam = float(sum(Decimal(str(t)) for t in taksitler))
    assert toplam == pytest.approx(tutar, abs=0.005)
    assert len(taksitler) == adet
    assert all(t > 0 for t in taksitler), "Taksit tutarı sıfır veya negatif olamaz"
