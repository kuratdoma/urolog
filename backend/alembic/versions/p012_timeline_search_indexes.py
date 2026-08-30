"""add_timeline_and_advanced_search_indexes

Revision ID: p012_timeline_search_indexes
Revises: p011_icd_norm_trgm
Create Date: 2026-08-30 12:45:00.000000

Performance optimization:
1. Patient Timeline UNION ALL:
   - Randevular: randevu_tarihcesi (hasta_id) ve randevular (hasta_id, start DESC)
   - Muayeneler, Operasyonlar, Tetkikler, Finans için composite hasta_id + tarih indeksleri zaten var
   - sharded_clinical_dosyalar: hasta_id + created_at DESC indeksi eksikti

2. Gelişmiş Arama (Advanced Search):
   - Tanı kodları (tani1_kodu..tani5_kodu) ve tedavi için trigram indexleri eksikti
"""
from typing import Sequence, Union
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'p012_timeline_search_indexes'
down_revision: Union[str, None] = 'p011_icd_norm_trgm'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_BTREE_INDEXES = [
    # (index_name, table, columns, where)
    ("ix_randevular_patient_timeline", "randevular", "hasta_id, start DESC", "is_deleted = 0"),
    ("ix_randevu_tarihce_patient", "randevu_tarihce", "hasta_id, created_at DESC", None),
    ("ix_dosyalar_patient_timeline", "sharded_clinical_dosyalar", "hasta_id, created_at DESC", "is_deleted = FALSE"),
]

_TRGM_INDEXES = [
    # (index_name, table, column)
    ("ix_muayeneler_tani1_kodu_trgm", "muayeneler", "tani1_kodu"),
    ("ix_muayeneler_tani2_kodu_trgm", "muayeneler", "tani2_kodu"),
    ("ix_muayeneler_tedavi_trgm", "muayeneler", "tedavi"),
]


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    with op.get_context().autocommit_block():
        for name, table, cols, where_clause in _BTREE_INDEXES:
            where_sql = f" WHERE {where_clause}" if where_clause else ""
            op.execute(
                f"CREATE INDEX CONCURRENTLY IF NOT EXISTS {name} "
                f"ON {table} ({cols}){where_sql}"
            )

        for name, table, column in _TRGM_INDEXES:
            op.execute(
                f"CREATE INDEX CONCURRENTLY IF NOT EXISTS {name} "
                f"ON {table} USING gin ({column} gin_trgm_ops)"
            )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        for name, table, _, _ in _BTREE_INDEXES:
            op.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {name}")

        for name, _, _ in _TRGM_INDEXES:
            op.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {name}")
