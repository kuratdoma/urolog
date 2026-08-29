"""finance: düzenli gider şablonları

Revision ID: p007_recurring
Revises: p006_finance_idx
Create Date: 2026-08-29 00:00:00.000000

Kira, maaş, abonelik gibi tekrar eden giderler için şablon tablosu.
Şablonun kendisi gider değildir; ondan dönem dönem finans_islemler kaydı
üretilir. son_uretilen_donem aynı dönemin iki kez üretilmesini engeller.

Üretim manuel tetiklenir (Finans › Düzenli Giderler › Bekleyenleri Oluştur);
zamanlanmış görev altyapısı devreye alındığında aynı uç otomatik çağrılabilir.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'p007_recurring'
down_revision: Union[str, None] = 'p006_finance_idx'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'duzenli_giderler',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ad', sa.String(length=200), nullable=False),
        sa.Column('tutar', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('periyot', sa.String(length=20), nullable=False, server_default='aylik'),
        sa.Column('ayin_gunu', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('baslangic_tarihi', sa.Date(), nullable=False),
        sa.Column('bitis_tarihi', sa.Date(), nullable=True),
        sa.Column('son_uretilen_donem', sa.Date(), nullable=True),
        sa.Column('kategori_id', sa.Integer(), nullable=True),
        sa.Column('firma_id', sa.Integer(), nullable=True),
        sa.Column('kasa_id', sa.Integer(), nullable=True),
        sa.Column('aciklama', sa.Text(), nullable=True),
        sa.Column('aktif', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['kategori_id'], ['finans_kategoriler.id'], ),
        sa.ForeignKeyConstraint(['firma_id'], ['firmalar.id'], ),
        sa.ForeignKeyConstraint(['kasa_id'], ['kasalar.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    # Bekleyen üretim taraması yalnızca aktif şablonlarda dolaşır
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_duzenli_giderler_aktif
        ON duzenli_giderler (baslangic_tarihi)
        WHERE aktif = TRUE
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_duzenli_giderler_aktif")
    op.drop_table('duzenli_giderler')
