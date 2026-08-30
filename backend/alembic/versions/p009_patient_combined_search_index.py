"""add_trgm_index_to_hastalar_protokol_no

Revision ID: p009_patient_search_trgm
Revises: p008_icd_drug_trgm
Create Date: 2026-08-29 20:58:00.000000

Performance optimization:
Hasta arama sorgusu (demographics_repository.get_patients) şu OR filtresini kurar:
    ad ILIKE %q% OR soyad ILIKE %q% OR tc_kimlik ILIKE %q% OR protokol_no ILIKE %q%
p005_trgm_idx ilk üç sütun için trigram indeksi eklemişti; protokol_no eksikti ve
OR'un o bacağı her aramada sequential scan'e düşüyordu. Bu migration eksik olan
indeksi tamamlar.

Not: Birleştirilmiş (ad || soyad || tc_kimlik) ifade indeksi bilinçli olarak
kullanılmadı — PostgreSQL bir ifade indeksini yalnızca sorgu metni tam olarak aynı
ifadeyi içerdiğinde kullanabilir; yukarıdaki OR filtresi onu asla tetiklemez.
"""
from typing import Sequence, Union
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'p009_patient_search_trgm'
down_revision: Union[str, None] = 'p008_icd_drug_trgm'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_INDEX = "ix_hastalar_protokol_no_trgm"


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # CONCURRENTLY: p005 ile aynı desen — GIN index build'i yazma kilidi almasın.
    with op.get_context().autocommit_block():
        op.execute(
            f"CREATE INDEX CONCURRENTLY IF NOT EXISTS {_INDEX} "
            f"ON hastalar USING gin (protokol_no gin_trgm_ops)"
        )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {_INDEX}")
