"""add_missing_hasta_fields

Revision ID: 8e6c4e5a2b3c
Revises: a1b2c3d4e5f6
Create Date: 2026-04-19 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8e6c4e5a2b3c'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('hastalar')]
    if 'faks' not in columns:
        op.add_column('hastalar', sa.Column('faks', sa.String(length=20), nullable=True))
    if 'personel_ids' not in columns:
        op.add_column('hastalar', sa.Column('personel_ids', sa.String(length=255), nullable=True))
    if 'indirim_grubu' not in columns:
        op.add_column('hastalar', sa.Column('indirim_grubu', sa.String(length=100), nullable=True))
    if 'dil' not in columns:
        op.add_column('hastalar', sa.Column('dil', sa.String(length=50), server_default='Türkçe', nullable=True))
    if 'etiketler' not in columns:
        op.add_column('hastalar', sa.Column('etiketler', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('hastalar', 'etiketler')
    op.drop_column('hastalar', 'dil')
    op.drop_column('hastalar', 'indirim_grubu')
    op.drop_column('hastalar', 'personel_ids')
    op.drop_column('hastalar', 'faks')
