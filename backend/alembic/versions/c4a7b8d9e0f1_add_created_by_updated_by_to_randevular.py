"""add_created_by_updated_by_to_randevular

Revision ID: c4a7b8d9e0f1
Revises: d90fa91c24d3
Create Date: 2026-06-30 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4a7b8d9e0f1'
down_revision: Union[str, None] = 'd90fa91c24d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # randevular sütunları
    columns_randevular = [col['name'] for col in inspector.get_columns('randevular')]
    if 'created_by_id' not in columns_randevular:
        op.add_column('randevular', sa.Column('created_by_id', sa.Integer(), nullable=True))
    if 'created_by_name' not in columns_randevular:
        op.add_column('randevular', sa.Column('created_by_name', sa.String(), nullable=True))
    if 'updated_by_id' not in columns_randevular:
        op.add_column('randevular', sa.Column('updated_by_id', sa.Integer(), nullable=True))
    if 'updated_by_name' not in columns_randevular:
        op.add_column('randevular', sa.Column('updated_by_name', sa.String(), nullable=True))
    
    fks_randevular = [fk['name'] for fk in inspector.get_foreign_keys('randevular')]
    if 'fk_randevular_created_by_id' not in fks_randevular:
        op.create_foreign_key('fk_randevular_created_by_id', 'randevular', 'users', ['created_by_id'], ['id'])
    if 'fk_randevular_updated_by_id' not in fks_randevular:
        op.create_foreign_key('fk_randevular_updated_by_id', 'randevular', 'users', ['updated_by_id'], ['id'])
    
    # randevu_tarihce sütunları
    columns_tarihce = [col['name'] for col in inspector.get_columns('randevu_tarihce')]
    if 'degistiren_id' not in columns_tarihce:
        op.add_column('randevu_tarihce', sa.Column('degistiren_id', sa.Integer(), nullable=True))
    if 'degistiren_name' not in columns_tarihce:
        op.add_column('randevu_tarihce', sa.Column('degistiren_name', sa.String(), nullable=True))
    
    fks_tarihce = [fk['name'] for fk in inspector.get_foreign_keys('randevu_tarihce')]
    if 'fk_randevu_tarihce_degistiren_id' not in fks_tarihce:
        op.create_foreign_key('fk_randevu_tarihce_degistiren_id', 'randevu_tarihce', 'users', ['degistiren_id'], ['id'])


def downgrade() -> None:
    # randevu_tarihce
    op.drop_constraint('fk_randevu_tarihce_degistiren_id', 'randevu_tarihce', type_='foreignkey')
    op.drop_column('randevu_tarihce', 'degistiren_name')
    op.drop_column('randevu_tarihce', 'degistiren_id')
    
    # randevular
    op.drop_constraint('fk_randevular_updated_by_id', 'randevular', type_='foreignkey')
    op.drop_constraint('fk_randevular_created_by_id', 'randevular', type_='foreignkey')
    op.drop_column('randevular', 'updated_by_name')
    op.drop_column('randevular', 'updated_by_id')
    op.drop_column('randevular', 'created_by_name')
    op.drop_column('randevular', 'created_by_id')
