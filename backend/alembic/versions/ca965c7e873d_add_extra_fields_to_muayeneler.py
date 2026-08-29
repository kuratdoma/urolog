"""Add extra_fields to muayeneler

Revision ID: ca965c7e873d
Revises: c4a7b8d9e0f1
Create Date: 2026-07-03 12:33:22.484963

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'ca965c7e873d'
down_revision: Union[str, None] = 'c4a7b8d9e0f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('muayeneler')]
    if 'extra_fields' not in columns:
        op.add_column('muayeneler', sa.Column('extra_fields', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column('muayeneler', 'extra_fields')
