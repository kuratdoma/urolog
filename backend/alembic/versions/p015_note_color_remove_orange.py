"""remove orange from personal_notes.color palette, add blue

Renk paleti application seviyesinde bir Python Enum ile sınırlanır (kolon
düz String, native_enum=False) — bu yüzden yeni değer eklemek (blue) şema
değişikliği gerektirmez. 'orange' kaldırıldığı için var olan satırlar en
yakın önem seviyesine (red) taşınır.

Revision ID: p015_note_color_no_orange
Revises: p014_personal_note_color
Create Date: 2026-08-31 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'p015_note_color_no_orange'
down_revision: Union[str, None] = 'p014_personal_note_color'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE personal_notes SET color = 'red' WHERE color = 'orange'")


def downgrade() -> None:
    # Hangi satırların eskiden 'orange' olduğu geri getirilemez — no-op.
    pass
