"""stok modülü veri bütünlüğü: ortalama maliyet, barkod tekilliği, tip/stok kısıtları

Revision ID: p008_stock_integrity
Revises: p007_recurring
Create Date: 2026-08-29

Bu revizyon üç şeyi yapar:

1. ``stok_urunler.ortalama_maliyet`` kolonunu ekler ve mevcut ``birim_fiyat``
   değeriyle doldurur. Envanter değerlemesi bundan sonra son alış fiyatı
   yerine ağırlıklı ortalama maliyet üzerinden yapılır.

2. ``stok_urunler.barkod`` üzerine tekil (unique) kısıt ekler. Mükerrer barkod
   taşıyan kayıtlarda en küçük id korunur, diğerlerinin barkodu NULL yapılır —
   barkod opsiyonel bir tanımlayıcı olduğu için kayıt kaybı olmaz, yalnızca
   çakışan etiket temizlenir. Etkilenen satır sayısı upgrade çıktısına yazılır.

3. Hareket tipi ve negatif stok için CHECK kısıtları ekler. Kısıtlar NOT VALID
   olarak eklenir: geçmiş kayıtlar taranmaz, yalnızca bundan sonraki yazmalar
   denetlenir. Böylece elinde negatif stok veya eski/serbest metin hareket tipi
   bulunan kurulumlarda migration patlamaz.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "p008_stock_integrity"
down_revision: Union[str, None] = "p007_recurring"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # --- 1. Ağırlıklı ortalama maliyet kolonu ---
    op.add_column(
        "stok_urunler",
        sa.Column("ortalama_maliyet", sa.Numeric(12, 4), nullable=True),
    )
    op.execute(
        """
        UPDATE stok_urunler
           SET ortalama_maliyet = COALESCE(birim_fiyat, 0)
         WHERE ortalama_maliyet IS NULL
        """
    )
    op.alter_column(
        "stok_urunler",
        "ortalama_maliyet",
        existing_type=sa.Numeric(12, 4),
        nullable=False,
        server_default="0",
    )

    # --- 2. Barkod tekilliği ---
    duplicates = conn.execute(
        sa.text(
            """
            SELECT COUNT(*) FROM stok_urunler s
             WHERE s.barkod IS NOT NULL
               AND EXISTS (
                   SELECT 1 FROM stok_urunler o
                    WHERE o.barkod = s.barkod
                      AND o.id < s.id
               )
            """
        )
    ).scalar()
    if duplicates:
        print(
            f"[p008] {duplicates} mükerrer barkod bulundu; "
            "en eski kayıt korunuyor, diğerlerinin barkodu NULL yapılıyor."
        )
        op.execute(
            """
            UPDATE stok_urunler s
               SET barkod = NULL
             WHERE s.barkod IS NOT NULL
               AND EXISTS (
                   SELECT 1 FROM stok_urunler o
                    WHERE o.barkod = s.barkod
                      AND o.id < s.id
               )
            """
        )
    op.create_unique_constraint("uq_stok_urunler_barkod", "stok_urunler", ["barkod"])

    # --- 3. CHECK kısıtları (NOT VALID: geçmiş veriyi tarama) ---
    op.execute(
        """
        ALTER TABLE stok_hareketleri
          ADD CONSTRAINT ck_stok_hareketleri_tip
          CHECK (hareket_tipi IN ('GIRIS', 'CIKIS', 'DUZELTME')) NOT VALID
        """
    )
    op.execute(
        """
        ALTER TABLE stok_urunler
          ADD CONSTRAINT ck_stok_urunler_stok_negatif_degil
          CHECK (mevcut_stok >= 0) NOT VALID
        """
    )
    op.execute(
        """
        ALTER TABLE stok_urunler
          ADD CONSTRAINT ck_stok_urunler_min_stok_negatif_degil
          CHECK (min_stok >= 0) NOT VALID
        """
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE stok_urunler "
        "DROP CONSTRAINT IF EXISTS ck_stok_urunler_min_stok_negatif_degil"
    )
    op.execute(
        "ALTER TABLE stok_urunler "
        "DROP CONSTRAINT IF EXISTS ck_stok_urunler_stok_negatif_degil"
    )
    op.execute(
        "ALTER TABLE stok_hareketleri DROP CONSTRAINT IF EXISTS ck_stok_hareketleri_tip"
    )
    op.drop_constraint("uq_stok_urunler_barkod", "stok_urunler", type_="unique")
    op.drop_column("stok_urunler", "ortalama_maliyet")
