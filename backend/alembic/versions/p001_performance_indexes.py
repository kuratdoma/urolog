"""add_performance_composite_indexes

Revision ID: p001_perf_idx
Revises: df3ccc115c72, f73b62153c30
Create Date: 2026-06-10 14:40:00.000000

Performance optimization: Add composite partial indexes for frequently queried
patterns across clinical, patient, and appointment tables.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'p001_perf_idx'
down_revision: Union[str, None] = '8e6c4e5a2b3c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Hastalar (Patient listing & search) ──────────────────────────────
    # Main listing: ORDER BY updated_at DESC WHERE is_deleted = FALSE
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_hastalar_listing
        ON hastalar (updated_at DESC NULLS LAST)
        WHERE is_deleted = FALSE
    """)
    # Search: ad, soyad with soft-delete filter
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_hastalar_search
        ON hastalar (ad, soyad)
        WHERE is_deleted = FALSE
    """)

    # ── Muayeneler (Examinations) ────────────────────────────────────────
    # Patient clinical history: hasta_id + tarih DESC, filtered by soft-delete
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_muayeneler_patient_active
        ON muayeneler (hasta_id, tarih DESC)
        WHERE is_deleted = FALSE
    """)

    # ── Operasyonlar (Operations) ────────────────────────────────────────
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_operasyonlar_patient_active
        ON operasyonlar (hasta_id, tarih DESC)
        WHERE is_deleted = FALSE
    """)

    # ── Tetkikler (Lab/Imaging Results) ──────────────────────────────────
    # Includes kategori for filtering between Lab vs Goruntuleme
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_tetkikler_patient_active
        ON tetkikler (hasta_id, kategori, tarih DESC)
        WHERE is_deleted = FALSE
    """)

    # ── Notlar (Clinical Notes) ──────────────────────────────────────────
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_notlar_patient_active
        ON notlar (hasta_id, tarih DESC)
        WHERE is_deleted = FALSE
    """)

    # ── Fotograflar (Photos) ─────────────────────────────────────────────
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_fotograflar_patient_active
        ON fotograflar (hasta_id)
        WHERE is_deleted = FALSE
    """)

    # ── Finans İşlemler ──────────────────────────────────────────────────
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_finans_islemler_patient_active
        ON finans_islemler (hasta_id, tarih DESC)
        WHERE is_deleted = FALSE
    """)

    # ── Belgeler (Documents) ─────────────────────────────────────────────
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_dosyalar_patient_active
        ON sharded_clinical_dosyalar (hasta_id)
        WHERE is_deleted = FALSE
    """)

    # ── Randevular (Appointments - Dashboard) ────────────────────────────
    # Dashboard queries filter by start date range + is_deleted + status + type
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_randevular_dashboard
        ON randevular (start, is_deleted, status)
    """)

    # ── İstirahat Raporları ──────────────────────────────────────────────
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_istirahat_patient_active
        ON istirahat_raporlari (hasta_id)
        WHERE is_deleted = FALSE
    """)

    # ── Kişisel Notlar ───────────────────────────────────────────────────
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_kisisel_notlar_patient_active
        ON kisisel_notlar (hasta_id)
        WHERE is_deleted = FALSE
    """)

    # ── Telefon Görüşmeleri ──────────────────────────────────────────────
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_telefon_patient_active
        ON telefon_gorusmeleri (hasta_id, tarih DESC)
        WHERE is_deleted = FALSE
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_hastalar_listing")
    op.execute("DROP INDEX IF EXISTS ix_hastalar_search")
    op.execute("DROP INDEX IF EXISTS ix_muayeneler_patient_active")
    op.execute("DROP INDEX IF EXISTS ix_operasyonlar_patient_active")
    op.execute("DROP INDEX IF EXISTS ix_tetkikler_patient_active")
    op.execute("DROP INDEX IF EXISTS ix_notlar_patient_active")
    op.execute("DROP INDEX IF EXISTS ix_fotograflar_patient_active")
    op.execute("DROP INDEX IF EXISTS ix_finans_islemler_patient_active")
    op.execute("DROP INDEX IF EXISTS ix_dosyalar_patient_active")
    op.execute("DROP INDEX IF EXISTS ix_randevular_dashboard")
    op.execute("DROP INDEX IF EXISTS ix_istirahat_patient_active")
    op.execute("DROP INDEX IF EXISTS ix_kisisel_notlar_patient_active")
    op.execute("DROP INDEX IF EXISTS ix_telefon_patient_active")
