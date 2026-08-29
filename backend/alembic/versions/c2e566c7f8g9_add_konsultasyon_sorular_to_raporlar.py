"""add konsultasyon_sorular to konsultasyon_raporlari

Revision ID: c2e566c7f8g9
Revises: 40fa29b75af1
Create Date: 2026-07-07 08:50:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c2e566c7f8g9'
down_revision = '40fa29b75af1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('konsultasyon_raporlari')]
    if 'konsultasyon_sorular' not in columns:
        op.add_column(
            'konsultasyon_raporlari',
            sa.Column('konsultasyon_sorular', sa.Text(), nullable=True)
        )


def downgrade() -> None:
    op.drop_column('konsultasyon_raporlari', 'konsultasyon_sorular')
