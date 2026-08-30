"""add personal_notes and note_reminder_occurrences tables

Revision ID: p013_personal_notes
Revises: p012_timeline_search_indexes
Create Date: 2026-08-30 21:00:00.000000

Kişisel not + hatırlatma modülü:
- personal_notes: kullanıcıya özel, private-only iş notları (recurrence alanları gömülü)
- note_reminder_occurrences: her tetiklenecek an için ayrı satır (audit/geçmiş için),
  UNIQUE(note_id, scheduled_for) ile çift üretim DB seviyesinde engellenir.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'p013_personal_notes'
down_revision: Union[str, None] = 'p012_timeline_search_indexes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'personal_notes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column(
            'recurrence_type',
            sa.String(),
            nullable=False,
            server_default='once',
        ),
        sa.Column('interval', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('time_of_day', sa.Time(), nullable=False),
        sa.Column('starts_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ends_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_done', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_personal_notes_user_id'), 'personal_notes', ['user_id'], unique=False)
    op.create_index(op.f('ix_personal_notes_starts_at'), 'personal_notes', ['starts_at'], unique=False)

    op.create_table(
        'note_reminder_occurrences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('note_id', sa.Integer(), nullable=False),
        sa.Column('scheduled_for', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('fired_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('acknowledged_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('snoozed_to', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['note_id'], ['personal_notes.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('note_id', 'scheduled_for', name='uq_note_occurrence_schedule'),
    )
    op.create_index(op.f('ix_note_reminder_occurrences_note_id'), 'note_reminder_occurrences', ['note_id'], unique=False)
    op.create_index(op.f('ix_note_reminder_occurrences_scheduled_for'), 'note_reminder_occurrences', ['scheduled_for'], unique=False)
    op.create_index(op.f('ix_note_reminder_occurrences_status'), 'note_reminder_occurrences', ['status'], unique=False)
    op.create_index(
        'ix_note_occurrence_status_schedule', 'note_reminder_occurrences', ['note_id', 'status'], unique=False
    )
    op.create_index(
        'ix_note_occurrence_due_scan', 'note_reminder_occurrences', ['scheduled_for', 'status'], unique=False
    )


def downgrade() -> None:
    op.drop_index('ix_note_occurrence_due_scan', table_name='note_reminder_occurrences')
    op.drop_index('ix_note_occurrence_status_schedule', table_name='note_reminder_occurrences')
    op.drop_index(op.f('ix_note_reminder_occurrences_status'), table_name='note_reminder_occurrences')
    op.drop_index(op.f('ix_note_reminder_occurrences_scheduled_for'), table_name='note_reminder_occurrences')
    op.drop_index(op.f('ix_note_reminder_occurrences_note_id'), table_name='note_reminder_occurrences')
    op.drop_table('note_reminder_occurrences')

    op.drop_index(op.f('ix_personal_notes_starts_at'), table_name='personal_notes')
    op.drop_index(op.f('ix_personal_notes_user_id'), table_name='personal_notes')
    op.drop_table('personal_notes')
