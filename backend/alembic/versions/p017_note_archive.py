"""add completed_at to personal_notes for the archive view

Tamamlanan işler artık aktif listelerden çıkıp "Arşiv" sekmesinde toplanıyor.
completed_at, arşivin en son tamamlanandan geriye doğru sıralanabilmesi ve
kartta "Tamamlandı: ..." bilgisinin gösterilebilmesi için tutuluyor.

Revision ID: p017_note_archive
Revises: p016_note_assignments
Create Date: 2026-09-02 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'p017_note_archive'
down_revision: Union[str, None] = 'p016_note_assignments'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('personal_notes', sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True))
    # Mevcut tamamlanmış notlar arşivde tarihsiz kalmasın: en iyi tahmin olarak
    # son güncelleme (yoksa oluşturma) zamanı ile doldurulur.
    op.execute(
        """
        UPDATE personal_notes
        SET completed_at = COALESCE(updated_at, created_at)
        WHERE is_done = true AND completed_at IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column('personal_notes', 'completed_at')
