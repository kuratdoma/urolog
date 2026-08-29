"""add_iief_s6_to_lipus_details

Revision ID: f73b62153c30
Revises: e680a6b5c3d2
Create Date: 2026-04-17 15:59:22.470365

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f73b62153c30'
down_revision: Union[str, None] = 'e680a6b5c3d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('lipus_details')]
    if 'iief_s6' not in columns:
        op.add_column('lipus_details', sa.Column('iief_s6', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('lipus_details', 'iief_s6')
