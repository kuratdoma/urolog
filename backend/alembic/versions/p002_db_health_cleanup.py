"""db_health_cleanup: remove duplicate indexes, add missing FK indexes

Revision ID: p002_db_health
Revises: p001_perf_idx
Create Date: 2026-06-12 09:50:00.000000

Database health optimization:
1. Remove 35 duplicate indexes (primary key + ix_*_id redundancy)
2. Remove 2 composite duplicate indexes (fotograflar, kisisel_notlar)
3. Add 11 missing foreign key indexes for JOIN/CASCADE performance
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'p002_db_health'
down_revision: Union[str, None] = 'p001_perf_idx'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ─────────────────────────────────────────────────────────────────────────────
# Primary key ile birebir çakışan gereksiz ix_*_id indexleri
# SQLAlchemy'nin primary_key=True + index=True kombinasyonundan kaynaklanıyor.
# Primary key zaten otomatik olarak B-tree index oluşturur.
# ─────────────────────────────────────────────────────────────────────────────
DUPLICATE_PK_INDEXES = [
    "ix_icd_tanilar_id",
    "ix_ilac_tanimlari_id",
    "ix_hastalar_id",
    "ix_sharded_clinical_dosyalar_id",
    "ix_randevular_id",
    "ix_finans_kategoriler_id",
    "ix_hastaneler_id",
    "ix_hemsireler_id",
    "ix_anestezi_personelleri_id",
    "ix_anestezi_tipleri_id",
    "ix_cerrahlar_id",
    "ix_doktorlar_id",
    "ix_finans_hizmetler_id",
    "ix_kasalar_id",
    "ix_meslekler_id",
    "ix_randevu_turleri_id",
    "ix_sablon_tanimlari_id",
    "ix_system_settings_key",
    "ix_takip_konulari_id",
    "ix_users_id",
    "ix_fotograflar_id",
    "ix_kisisel_notlar_id",
    "ix_lipus_details_id",
    "ix_tetkik_tanimlari_id",
    "ix_asistanlar_id",
    "ix_firmalar_id",
    "ix_ekip_uyeleri_id",
    "ix_kasa_hareketleri_id",
    "ix_stok_alimlari_id",
    "ix_kurumlar_id",
    "ix_stok_hareketleri_id",
    "ix_ozel_sigortalar_id",
    "ix_stok_urunler_id",
    "ix_biyopsi_sablonlari_id",
    "ix_recete_sablonlari_id",
]

# ─────────────────────────────────────────────────────────────────────────────
# Composite duplicate indexler:
# ix_fotograflar_hasta_id  →  ix_fotograflar_patient_active ile aynı sütun
# ix_kisisel_notlar_hasta_id → ix_kisisel_notlar_patient_active ile aynı sütun
# (patient_active versiyonu partial index, daha optimal)
# ─────────────────────────────────────────────────────────────────────────────
DUPLICATE_COMPOSITE_INDEXES = [
    "ix_fotograflar_hasta_id",
    "ix_kisisel_notlar_hasta_id",
]


def upgrade() -> None:
    # ── BÖLÜM 1: Duplicate PK indexlerini kaldır ─────────────────────────
    for idx in DUPLICATE_PK_INDEXES:
        op.execute(f"DROP INDEX IF EXISTS {idx}")

    # ── BÖLÜM 2: Composite duplicate indexleri kaldır ────────────────────
    for idx in DUPLICATE_COMPOSITE_INDEXES:
        op.execute(f"DROP INDEX IF EXISTS {idx}")

    # ── BÖLÜM 3: Eksik FK indexlerini ekle ───────────────────────────────
    # Bu indexler JOIN ve CASCADE DELETE performansını iyileştirir.

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_audit_logs_user_id
        ON audit_logs (user_id)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_finans_islem_satirlari_islem_id
        ON finans_islem_satirlari (islem_id)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_finans_kategoriler_ust_id
        ON finans_kategoriler (ust_kategori_id)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_finans_odemeler_islem_id
        ON finans_odemeler (islem_id)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_finans_taksitler_odeme_id
        ON finans_taksitler (odeme_id)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_kasa_hareketleri_kasa_id
        ON kasa_hareketleri (kasa_id)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_randevular_doctor_id
        ON randevular (doctor_id)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_stok_alimlari_firma_id
        ON stok_alimlari (firma_id)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_stok_alimlari_urun_id
        ON stok_alimlari (urun_id)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_stok_hareketleri_hasta_id
        ON stok_hareketleri (hasta_id)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_stok_hareketleri_urun_id
        ON stok_hareketleri (urun_id)
    """)


def downgrade() -> None:
    # ── FK indexlerini kaldır ─────────────────────────────────────────────
    op.execute("DROP INDEX IF EXISTS ix_audit_logs_user_id")
    op.execute("DROP INDEX IF EXISTS ix_finans_islem_satirlari_islem_id")
    op.execute("DROP INDEX IF EXISTS ix_finans_kategoriler_ust_id")
    op.execute("DROP INDEX IF EXISTS ix_finans_odemeler_islem_id")
    op.execute("DROP INDEX IF EXISTS ix_finans_taksitler_odeme_id")
    op.execute("DROP INDEX IF EXISTS ix_kasa_hareketleri_kasa_id")
    op.execute("DROP INDEX IF EXISTS ix_randevular_doctor_id")
    op.execute("DROP INDEX IF EXISTS ix_stok_alimlari_firma_id")
    op.execute("DROP INDEX IF EXISTS ix_stok_alimlari_urun_id")
    op.execute("DROP INDEX IF EXISTS ix_stok_hareketleri_hasta_id")
    op.execute("DROP INDEX IF EXISTS ix_stok_hareketleri_urun_id")

    # ── Composite duplicateleri geri ekle ─────────────────────────────────
    op.execute("CREATE INDEX IF NOT EXISTS ix_fotograflar_hasta_id ON fotograflar (hasta_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_kisisel_notlar_hasta_id ON kisisel_notlar (hasta_id)")

    # ── PK duplicate indexleri geri ekle (istenmez ama rollback için) ────
    # NOT: Bunları geri eklemeye gerek yok çünkü primary key indexi zaten var.
    # Ama tam rollback uyumluluğu için bırakıyoruz:
    op.execute("CREATE INDEX IF NOT EXISTS ix_icd_tanilar_id ON icd_tanilar (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_ilac_tanimlari_id ON ilac_tanimlari (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_hastalar_id ON hastalar (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_sharded_clinical_dosyalar_id ON sharded_clinical_dosyalar (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_randevular_id ON randevular (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_finans_kategoriler_id ON finans_kategoriler (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_hastaneler_id ON hastaneler (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_hemsireler_id ON hemsireler (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_anestezi_personelleri_id ON anestezi_personelleri (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_anestezi_tipleri_id ON anestezi_tipleri (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_cerrahlar_id ON cerrahlar (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_doktorlar_id ON doktorlar (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_finans_hizmetler_id ON finans_hizmetler (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_kasalar_id ON kasalar (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_meslekler_id ON meslekler (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_randevu_turleri_id ON randevu_turleri (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_sablon_tanimlari_id ON sablon_tanimlari (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_system_settings_key ON system_settings (key)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_takip_konulari_id ON takip_konulari (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_id ON users (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fotograflar_id ON fotograflar (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_kisisel_notlar_id ON kisisel_notlar (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_lipus_details_id ON lipus_details (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tetkik_tanimlari_id ON tetkik_tanimlari (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_asistanlar_id ON asistanlar (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_firmalar_id ON firmalar (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_ekip_uyeleri_id ON ekip_uyeleri (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_kasa_hareketleri_id ON kasa_hareketleri (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_stok_alimlari_id ON stok_alimlari (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_kurumlar_id ON kurumlar (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_stok_hareketleri_id ON stok_hareketleri (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_ozel_sigortalar_id ON ozel_sigortalar (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_stok_urunler_id ON stok_urunler (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_biyopsi_sablonlari_id ON biyopsi_sablonlari (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_recete_sablonlari_id ON recete_sablonlari (id)")
