"""add_gin_trgm_indexes_to_icd_and_drugs

Revision ID: p008_icd_drug_trgm
Revises: p008_stock_integrity
Create Date: 2026-08-29 20:55:00.000000

Performance optimization:
1. Adds GIN trigram indexes to icd_tanilar (adi, kodu)
2. Adds GIN trigram indexes to ilac_tanimlari (name, etkin_madde, barcode)
This replaces slow sequential scans (~11ms) with fast Bitmap Index Scans (~0.2ms)
for wildcard ILIKE ('%...%') searches.
"""
from typing import Sequence, Union
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'p008_icd_drug_trgm'
down_revision: Union[str, None] = 'p008_stock_integrity'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_INDEXES = [
    ("ix_icd_tanilar_adi_trgm", "icd_tanilar", "adi"),
    ("ix_icd_tanilar_kodu_trgm", "icd_tanilar", "kodu"),
    ("ix_ilac_tanimlari_name_trgm", "ilac_tanimlari", "name"),
    ("ix_ilac_tanimlari_etkin_madde_trgm", "ilac_tanimlari", "etkin_madde"),
    ("ix_ilac_tanimlari_barcode_trgm", "ilac_tanimlari", "barcode"),
]


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # CONCURRENTLY: p005 ile aynı desen — GIN build'i yazma kilidi almasın.
    with op.get_context().autocommit_block():
        for name, table, column in _INDEXES:
            op.execute(
                f"CREATE INDEX CONCURRENTLY IF NOT EXISTS {name} "
                f"ON {table} USING gin ({column} gin_trgm_ops)"
            )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        for name, _table, _column in _INDEXES:
            op.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {name}")
