"""add color column to personal_notes for importance marking

Revision ID: p014_personal_note_color
Revises: p013_personal_notes
Create Date: 2026-08-30 23:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'p014_personal_note_color'
down_revision: Union[str, None] = 'p013_personal_notes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'personal_notes',
        sa.Column('color', sa.String(), nullable=False, server_default='default'),
    )


def downgrade() -> None:
    op.drop_column('personal_notes', 'color')
