"""finance: taksit tahsil tarihi + filtre indeksleri

Revision ID: p006_finance_idx
Revises: p005_trgm_idx
Create Date: 2026-08-29 00:00:00.000000

İki eksiği kapatır:

1. finans_taksitler.tahsil_tarihi — Pydantic şeması bu alanı tanımlıyordu ama
   tabloda karşılığı yoktu; taksitin ne zaman tahsil edildiği kaydedilemiyordu.

2. finans_islemler filtre indeksleri — işlem arama (tarih, tip, durum, kategori,
   firma, kasa, vade) tam tablo taraması yapıyordu. Aktif kayıtlar üzerinde
   kısmi indeksler eklenir; silinmiş kayıtlar indeksi şişirmez.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'p006_finance_idx'
down_revision: Union[str, None] = 'p005_trgm_idx'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1) Taksit tahsil tarihi ──────────────────────────────────────────
    op.execute("""
        ALTER TABLE finans_taksitler
        ADD COLUMN IF NOT EXISTS tahsil_tarihi DATE
    """)

    # ── 2) İşlem listeleme ve filtre indeksleri ──────────────────────────
    # Varsayılan sıralama: tarih DESC, id DESC (aktif kayıtlar)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_finans_islemler_listing
        ON finans_islemler (tarih DESC, id DESC)
        WHERE is_deleted = FALSE
    """)

    # Tip + durum birlikte filtrelenir (gelir/gider sayfaları, özet sorguları)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_finans_islemler_tip_durum
        ON finans_islemler (islem_tipi, durum)
        WHERE is_deleted = FALSE
    """)

    # Vadesi geçmiş taraması: vade_tarihi < today
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_finans_islemler_vade
        ON finans_islemler (vade_tarihi)
        WHERE is_deleted = FALSE AND vade_tarihi IS NOT NULL
    """)

    # Kırılım filtreleri — NULL satırlar indekse alınmaz
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_finans_islemler_kategori
        ON finans_islemler (kategori_id)
        WHERE is_deleted = FALSE AND kategori_id IS NOT NULL
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_finans_islemler_firma
        ON finans_islemler (firma_id)
        WHERE is_deleted = FALSE AND firma_id IS NOT NULL
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_finans_islemler_kasa
        ON finans_islemler (kasa_id)
        WHERE is_deleted = FALSE AND kasa_id IS NOT NULL
    """)

    # Kasa hareket dökümü: kasa_id + tarih DESC
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_kasa_hareketleri_kasa_tarih
        ON kasa_hareketleri (kasa_id, tarih DESC)
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_kasa_hareketleri_kasa_tarih")
    op.execute("DROP INDEX IF EXISTS ix_finans_islemler_kasa")
    op.execute("DROP INDEX IF EXISTS ix_finans_islemler_firma")
    op.execute("DROP INDEX IF EXISTS ix_finans_islemler_kategori")
    op.execute("DROP INDEX IF EXISTS ix_finans_islemler_vade")
    op.execute("DROP INDEX IF EXISTS ix_finans_islemler_tip_durum")
    op.execute("DROP INDEX IF EXISTS ix_finans_islemler_listing")
    op.execute("ALTER TABLE finans_taksitler DROP COLUMN IF EXISTS tahsil_tarihi")
