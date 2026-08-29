"""add hpv_briefing_kayitlari table

Revision ID: p004_hpv_briefing
Revises: p003_lab_normalize
Create Date: 2026-08-17 14:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'p004_hpv_briefing'
down_revision: Union[str, None] = 'p003_lab_normalize'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'hpv_briefing_kayitlari',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('hasta_id', sa.UUID(), nullable=False),
        sa.Column('briefing_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('son_islem_tarihi', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_hpv_briefing_kayitlari_hasta_id'), 'hpv_briefing_kayitlari', ['hasta_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_hpv_briefing_kayitlari_hasta_id'), table_name='hpv_briefing_kayitlari')
    op.drop_table('hpv_briefing_kayitlari')
