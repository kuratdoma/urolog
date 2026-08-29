"""merge_heads

Revision ID: d7e4be3de818
Revises: 7a0f12c3e4d5, bb645a5f05e2
Create Date: 2026-04-04 23:51:04.758117

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd7e4be3de818'
down_revision: Union[str, None] = ('7a0f12c3e4d5', 'bb645a5f05e2')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
