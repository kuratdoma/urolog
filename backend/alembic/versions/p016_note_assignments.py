"""add collaborative assignment fields to personal_notes table

Revision ID: p016_note_assignments
Revises: p015_note_color_no_orange
Create Date: 2026-09-01 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'p016_note_assignments'
down_revision: Union[str, None] = 'p015_note_color_no_orange'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('personal_notes', sa.Column('assigned_to_id', sa.Integer(), nullable=True))
    op.add_column('personal_notes', sa.Column('assigned_by_id', sa.Integer(), nullable=True))
    op.add_column(
        'personal_notes',
        sa.Column('assignment_status', sa.String(length=20), server_default='none', nullable=False)
    )
    op.add_column('personal_notes', sa.Column('rejection_reason', sa.String(), nullable=True))
    op.add_column('personal_notes', sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('personal_notes', sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        'personal_notes',
        sa.Column('popup_shown', sa.Boolean(), server_default='false', nullable=False)
    )

    op.create_index(op.f('ix_personal_notes_assigned_to_id'), 'personal_notes', ['assigned_to_id'], unique=False)
    op.create_index(op.f('ix_personal_notes_assignment_status'), 'personal_notes', ['assignment_status'], unique=False)
    op.create_foreign_key('fk_personal_notes_assigned_to_id', 'personal_notes', 'users', ['assigned_to_id'], ['id'])
    op.create_foreign_key('fk_personal_notes_assigned_by_id', 'personal_notes', 'users', ['assigned_by_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_personal_notes_assigned_by_id', 'personal_notes', type_='foreignkey')
    op.drop_constraint('fk_personal_notes_assigned_to_id', 'personal_notes', type_='foreignkey')
    op.drop_index(op.f('ix_personal_notes_assignment_status'), table_name='personal_notes')
    op.drop_index(op.f('ix_personal_notes_assigned_to_id'), table_name='personal_notes')
    op.drop_column('personal_notes', 'popup_shown')
    op.drop_column('personal_notes', 'responded_at')
    op.drop_column('personal_notes', 'assigned_at')
    op.drop_column('personal_notes', 'rejection_reason')
    op.drop_column('personal_notes', 'assignment_status')
    op.drop_column('personal_notes', 'assigned_by_id')
    op.drop_column('personal_notes', 'assigned_to_id')
