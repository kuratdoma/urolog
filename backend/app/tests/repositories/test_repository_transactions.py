"""
Repository transaction sınırı ve toplu yazma davranışı testleri.

İki sözleşmeyi korurlar:

1. Repository katmanı commit ATMAZ — commit kararı istek sınırında
   `get_db()`'ye aittir. Aksi halde orchestrator'lar çok adımlı işlemleri
   (ödeme + kasa hareketi + cari güncelleme) tek transaction'da toplayamaz.
2. Toplu uçlar satır başına değil, tek seferde yazar/siler.

Not: Proje genelinde `asyncio_mode` yapılandırılmadığı için mevcut testlerdeki
gibi `asyncio.run(...)` kullanılır, `@pytest.mark.asyncio` değil.
"""

import asyncio
import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

from app.repositories.base_repository import BaseRepository
from app.repositories.clinical.models import TetkikSonuc

# SQLAlchemy mapper'ları çözebilmek için ilişkili modellerin de yüklenmesi
# gerekir (Randevu -> Hasta). audit_tasks.py'de de aynı gerekçeyle yapılıyor.
from app.repositories.patient.models import Hasta  # noqa: F401
from app.models.appointment import Randevu  # noqa: F401


def _fake_session() -> MagicMock:
    """commit/flush/refresh çağrılarını sayan sahte AsyncSession."""
    session = MagicMock()
    session.add = MagicMock()
    session.add_all = MagicMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.execute = AsyncMock()
    return session


def _tetkik_payload(name: str = "psa total") -> dict:
    return {
        "hasta_id": uuid.uuid4(),
        "tarih": datetime(2026, 1, 1),
        "tetkik_adi": name,
        "sonuc": "1.2",
        "birim": "ng/ml",
        "kategori": "Laboratuvar",
    }


def test_create_does_not_commit():
    """create() flush eder ama commit etmez — transaction istek sonunda kapanır."""
    session = _fake_session()
    repo = BaseRepository(TetkikSonuc, session)

    asyncio.run(repo.create(_tetkik_payload()))

    session.flush.assert_awaited_once()
    session.commit.assert_not_awaited()


def test_soft_delete_does_not_commit():
    session = _fake_session()
    session.execute.return_value = MagicMock(rowcount=1)
    repo = BaseRepository(TetkikSonuc, session)

    assert asyncio.run(repo.soft_delete(uuid.uuid4())) is True
    session.commit.assert_not_awaited()


def test_create_many_uses_single_flush():
    """N kayıt = 1 add_all + 1 flush (satır başına INSERT+COMMIT değil)."""
    session = _fake_session()
    repo = BaseRepository(TetkikSonuc, session)

    objs = asyncio.run(repo.create_many([_tetkik_payload() for _ in range(5)]))

    assert len(objs) == 5
    session.add_all.assert_called_once()
    assert len(session.add_all.call_args[0][0]) == 5
    session.flush.assert_awaited_once()
    session.commit.assert_not_awaited()


def test_create_many_empty_is_noop():
    session = _fake_session()
    repo = BaseRepository(TetkikSonuc, session)

    assert asyncio.run(repo.create_many([])) == []
    session.add_all.assert_not_called()
    session.flush.assert_not_awaited()


def test_soft_delete_many_issues_one_statement():
    """N id = 1 UPDATE ... WHERE id IN (...)."""
    session = _fake_session()
    session.execute.return_value = MagicMock(rowcount=3)
    repo = BaseRepository(TetkikSonuc, session)

    deleted = asyncio.run(repo.soft_delete_many([uuid.uuid4() for _ in range(3)]))

    assert deleted == 3
    session.execute.assert_awaited_once()
    session.commit.assert_not_awaited()


def test_soft_delete_many_empty_is_noop():
    session = _fake_session()
    repo = BaseRepository(TetkikSonuc, session)

    assert asyncio.run(repo.soft_delete_many([])) == 0
    session.execute.assert_not_awaited()


def test_batch_create_normalizes_test_names():
    """
    Toplu yol da tetkik adı normalizasyonundan geçmeli; aksi halde toplu
    içe aktarılan sonuçlar tekil kayıtlardan farklı isimle kaydedilir ve
    trend grafiği aynı tetkiki iki ayrı seri gibi gösterir.
    """
    from app.repositories.clinical.repository import ClinicalRepository
    from app.schemas.clinical import TetkikSonucCreate

    session = _fake_session()
    repo = ClinicalRepository(session)

    payload = _tetkik_payload(name="prostat spesifik antijen")
    objs = asyncio.run(
        repo.create_tetkik_sonuc_batch([TetkikSonucCreate(**payload)])
    )

    assert len(objs) == 1
    assert objs[0].tetkik_adi == "PSA (Total)"
    session.commit.assert_not_awaited()
