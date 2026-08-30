"""add_normalized_trgm_index_to_icd_names

Revision ID: p011_icd_norm_trgm
Revises: p010_user_ci_idx
Create Date: 2026-08-30 11:20:00.000000

ICD araması Türkçe karakterlere duyarsız olmalı: hekim "uriner" yazdığında
"Üriner ..." tanıları da bulunmalı. Eski in-memory servis bu normalizasyonu
Python'da iki tarafa da uyguluyordu; DB'ye taşındığında aynı davranışı
korumak için normalize edilmiş ifade üzerinde bir GIN trigram indeksi gerekli.

translate() + lower() immutable olduğu için ifade indekslenebilir.
"""
from typing import Sequence, Union
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'p011_icd_norm_trgm'
down_revision: Union[str, None] = 'p010_user_ci_idx'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# app/repositories/system_repository.py içindeki ICD_NORMALIZE_SQL ile
# BİREBİR aynı olmalı; farklılık indeksin kullanılmamasına yol açar.
_NORMALIZED_ADI = (
    "lower(translate(adi, 'ıİğĞüÜşŞöÖçÇ', 'iigguussoocc'))"
)
_INDEX_NAME = "ix_icd_tanilar_adi_norm_trgm"


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # CONCURRENTLY: p008 ile aynı desen — GIN build'i yazma kilidi almasın.
    with op.get_context().autocommit_block():
        op.execute(
            f"CREATE INDEX CONCURRENTLY IF NOT EXISTS {_INDEX_NAME} "
            f"ON icd_tanilar USING gin (({_NORMALIZED_ADI}) gin_trgm_ops)"
        )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {_INDEX_NAME}")
