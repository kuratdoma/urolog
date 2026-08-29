"""Fix clinical tables UUID types

Revision ID: 7a0f12c3e4d5
Revises: 49f17e055bad
Create Date: 2026-04-02 19:38:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7a0f12c3e4d5'
down_revision: Union[str, None] = '49f17e055bad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tables to convert from Integer ID to UUID ID
    tables = [
        'fotograflar',
        'durum_bildirir_raporlari',
        'istirahat_raporlari',
        'konsultasyon_raporlari',
        'telefon_gorusmeleri',
        'tibbi_mudahale_raporlari',
        'trus_biyopsileri'
    ]
    
    for table in tables:
        # 1. Drop default and sequence
        op.execute(f"ALTER TABLE {table} ALTER COLUMN id DROP DEFAULT")
        op.execute(f"DROP SEQUENCE IF EXISTS {table}_id_seq")
        
        # 2. Alter column type to UUID using gen_random_uuid()
        # Note: This is safe because tables were confirmed empty on production
        op.execute(f"ALTER TABLE {table} ALTER COLUMN id TYPE uuid USING gen_random_uuid()")
        
        # 3. Set default to gen_random_uuid()
        op.execute(f"ALTER TABLE {table} ALTER COLUMN id SET DEFAULT gen_random_uuid()")


def downgrade() -> None:
    # Reverting to integer would be complex and data-destructive if data existed.
    # Given they were empty, we omit complex downgrade logic for this critical fix.
    pass
