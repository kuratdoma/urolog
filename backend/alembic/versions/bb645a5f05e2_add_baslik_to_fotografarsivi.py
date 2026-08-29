"""add baslik to fotografarsivi

Revision ID: bb645a5f05e2
Revises: 49f17e055bad
Create Date: 2026-03-31 20:55:13.370724

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bb645a5f05e2'
down_revision: Union[str, None] = '49f17e055bad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add column baslik to fotograflar
    op.add_column('fotograflar', sa.Column('baslik', sa.String(length=255), nullable=True))
    
    # Ensure columns exist with correct types (safer than full sync)
    op.alter_column('fotograflar', 'asama',
               existing_type=sa.TEXT(),
               type_=sa.String(length=50),
               existing_nullable=True)
    op.alter_column('fotograflar', 'etiketler',
               existing_type=sa.TEXT(),
               type_=sa.String(length=255),
               existing_nullable=True)
    op.alter_column('fotograflar', 'dosya_yolu',
               existing_type=sa.TEXT(),
               type_=sa.String(length=255),
               existing_nullable=True)
    op.alter_column('fotograflar', 'dosya_adi',
               existing_type=sa.TEXT(),
               type_=sa.String(length=255),
               existing_nullable=True)


def downgrade() -> None:
    op.drop_column('fotograflar', 'baslik')
