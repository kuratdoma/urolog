"""add_pde5_kullanim_ek_tedavi_to_lipus

Revision ID: a1b2c3d4e5f6
Revises: f73b62153c30, df3ccc115c72
Create Date: 2026-04-18 13:52:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = ('f73b62153c30', 'df3ccc115c72')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('lipus_details')]
    if 'pde5_kullanim' not in columns:
        op.add_column('lipus_details', sa.Column('pde5_kullanim', sa.String(255), nullable=True))
    if 'ek_tedavi' not in columns:
        op.add_column('lipus_details', sa.Column('ek_tedavi', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('lipus_details', 'ek_tedavi')
    op.drop_column('lipus_details', 'pde5_kullanim')
