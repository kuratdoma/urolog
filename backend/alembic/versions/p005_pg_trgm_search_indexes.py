"""add_pg_trgm_gin_indexes_for_ilike_search

Revision ID: p005_trgm_idx
Revises: p004_hpv_briefing
Create Date: 2026-08-22 12:00:00.000000

Performance optimization: search queries across the app use leading-wildcard
ILIKE('%...%') patterns (patient name/TC/referans search, examination
diagnosis/complaint/history text search, operation name search). Plain
btree indexes (added in p001_performance_indexes) cannot be used by the
query planner for these patterns, forcing a sequential scan. This adds
pg_trgm-backed GIN indexes, which Postgres CAN use for leading-wildcard
ILIKE.

Indexes are created CONCURRENTLY (via autocommit_block) so this migration
does not hold a write lock on these tables for its duration.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'p005_trgm_idx'
down_revision: Union[str, None] = 'p004_hpv_briefing'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_INDEXES = [
    # (index_name, table, column)
    ("ix_hastalar_ad_trgm", "hastalar", "ad"),
    ("ix_hastalar_soyad_trgm", "hastalar", "soyad"),
    ("ix_hastalar_tc_kimlik_trgm", "hastalar", "tc_kimlik"),
    ("ix_hastalar_referans_trgm", "hastalar", "referans"),
    ("ix_muayeneler_sikayet_trgm", "muayeneler", "sikayet"),
    ("ix_muayeneler_oyku_trgm", "muayeneler", "oyku"),
    ("ix_muayeneler_bulgu_notu_trgm", "muayeneler", "bulgu_notu"),
    ("ix_muayeneler_fizik_muayene_trgm", "muayeneler", "fizik_muayene"),
    ("ix_muayeneler_tani1_trgm", "muayeneler", "tani1"),
    ("ix_muayeneler_tani2_trgm", "muayeneler", "tani2"),
    ("ix_muayeneler_tani3_trgm", "muayeneler", "tani3"),
    ("ix_muayeneler_tani4_trgm", "muayeneler", "tani4"),
    ("ix_muayeneler_tani5_trgm", "muayeneler", "tani5"),
    ("ix_operasyonlar_ameliyat_trgm", "operasyonlar", "ameliyat"),
]


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

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
