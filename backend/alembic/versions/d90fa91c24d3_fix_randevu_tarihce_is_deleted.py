"""fix_randevu_tarihce_is_deleted

Revision ID: d90fa91c24d3
Revises: a534bd3385d6
Create Date: 2026-06-29 16:26:31.776427

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd90fa91c24d3'
down_revision: Union[str, None] = 'a534bd3385d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('randevu_tarihce')]
    if 'is_deleted' not in columns:
        op.add_column('randevu_tarihce', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('randevu_tarihce', 'is_deleted')
