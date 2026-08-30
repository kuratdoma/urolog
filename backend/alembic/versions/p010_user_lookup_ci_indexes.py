"""add_functional_lower_indexes_for_user_login_lookup

Revision ID: p010_user_ci_idx
Revises: p009_patient_search_trgm
Create Date: 2026-08-30 10:00:00.000000

UserRepository artık e-posta/kullanıcı adını büyük-küçük harf duyarsız arıyor
(lower(email) = ... / lower(username) = ...). Sütunlardaki mevcut unique index'ler
ifade sarmalandığı için kullanılamaz; her login sequential scan'e düşer.
Bu migration eşleşen fonksiyonel index'leri ekler.
"""
from typing import Sequence, Union
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'p010_user_ci_idx'
down_revision: Union[str, None] = 'p009_patient_search_trgm'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_INDEXES = [
    ("ix_users_lower_email", "users", "lower(email)"),
    ("ix_users_lower_username", "users", "lower(username)"),
]


def upgrade() -> None:
    # CONCURRENTLY: p005/p009 ile aynı desen — build sırasında yazma kilidi alınmasın.
    with op.get_context().autocommit_block():
        for name, table, expr in _INDEXES:
            op.execute(
                f"CREATE INDEX CONCURRENTLY IF NOT EXISTS {name} ON {table} (({expr}))"
            )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        for name, _table, _expr in _INDEXES:
            op.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {name}")
