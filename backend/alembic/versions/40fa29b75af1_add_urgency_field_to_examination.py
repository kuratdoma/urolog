"""Add urgency field to Examination

Revision ID: 40fa29b75af1
Revises: ca965c7e873d
Create Date: 2026-07-06 11:50:52.905915

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '40fa29b75af1'
down_revision: Union[str, None] = 'ca965c7e873d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('muayeneler')]
    if 'urgency' not in columns:
        op.add_column('muayeneler', sa.Column('urgency', sa.String(length=10), nullable=True))


def downgrade() -> None:
    op.drop_column('muayeneler', 'urgency')
