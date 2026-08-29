"""Add LipusDetails table

Revision ID: e680a6b5c3d2
Revises: df3ccc115c72
Create Date: 2026-04-15 17:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e680a6b5c3d2'
down_revision: Union[str, None] = 'df3ccc115c72'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table('lipus_details',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('muayene_id', sa.UUID(), nullable=False),
        sa.Column('takip_donemi', sa.String(length=50), nullable=False),
        sa.Column('ed_tedavisi_6ay', sa.String(length=255), nullable=True),
        sa.Column('pde5_yaniti', sa.String(length=100), nullable=True),
        sa.Column('alerji_var', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('cerrahi_oyku', sa.Text(), nullable=True),
        sa.Column('eslik_eden_hastalik', sa.Text(), nullable=True),
        sa.Column('kullanilan_ilaclar', sa.Text(), nullable=True),
        sa.Column('iief_s1', sa.Integer(), nullable=True),
        sa.Column('iief_s2', sa.Integer(), nullable=True),
        sa.Column('iief_s3', sa.Integer(), nullable=True),
        sa.Column('iief_s4', sa.Integer(), nullable=True),
        sa.Column('iief_s5', sa.Integer(), nullable=True),
        sa.Column('iief_total', sa.Integer(), nullable=True),
        sa.Column('sep2', sa.String(length=10), nullable=True),
        sa.Column('sep3', sa.String(length=10), nullable=True),
        sa.Column('gaq1', sa.String(length=10), nullable=True),
        sa.Column('gaq2', sa.String(length=10), nullable=True),
        sa.Column('ehs_skor', sa.Integer(), nullable=True),
        sa.Column('memnuniyet_sabah', sa.Integer(), nullable=True),
        sa.Column('memnuniyet_cinsel', sa.Integer(), nullable=True),
        sa.Column('memnuniyet_mast', sa.Integer(), nullable=True),
        sa.Column('vas_skor', sa.Integer(), nullable=True),
        sa.Column('yan_etki_kizariklik', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('yan_etki_morarma', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('yan_etki_hematuri', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('yan_etki_yanma', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('yan_etki_diger', sa.Text(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lipus_details_id'), 'lipus_details', ['id'], unique=False)
    op.create_index(op.f('ix_lipus_details_muayene_id'), 'lipus_details', ['muayene_id'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_lipus_details_muayene_id'), table_name='lipus_details')
    op.drop_index(op.f('ix_lipus_details_id'), table_name='lipus_details')
    op.drop_table('lipus_details')
