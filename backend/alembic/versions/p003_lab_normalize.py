"""normalize_lab_test_names_and_units: standardize existing tetkikler data

Revision ID: p003_lab_normalize
Revises: p002_db_health
Create Date: 2026-08-13 08:45:00.000000

Data migration: applies lab_normalizer_service rules to all existing
tetkikler records (tetkik_adi and birim columns).
Does NOT change schema — only updates data values for consistency.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'p003_lab_normalize'
down_revision: Union[str, None] = 'c2e566c7f8g9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Normalize all existing tetkik_adi and birim values using the
    lab_normalizer_service rules.

    Strategy:
    1. Read all distinct (tetkik_adi, birim) pairs
    2. Run each through normalize_lab_record()
    3. Batch UPDATE where the normalized values differ from originals
    """
    from app.services.lab_normalizer_service import normalize_lab_record

    conn = op.get_bind()

    # Get all distinct (tetkik_adi, birim) pairs from Laboratuvar records
    rows = conn.execute(
        sa.text("""
            SELECT DISTINCT tetkik_adi, birim
            FROM tetkikler
            WHERE is_deleted = false
              AND tetkik_adi IS NOT NULL
              AND tetkik_adi != ''
        """)
    ).fetchall()

    update_count = 0
    for row in rows:
        original_name = row[0]
        original_unit = row[1]

        normalized_name, normalized_unit = normalize_lab_record(
            original_name, original_unit
        )

        # Only update if something actually changed
        name_changed = normalized_name != original_name
        unit_changed = normalized_unit != original_unit

        if name_changed or unit_changed:
            # Build UPDATE with exact matching on both columns
            if original_unit is None:
                conn.execute(
                    sa.text("""
                        UPDATE tetkikler
                        SET tetkik_adi = :new_name,
                            birim = :new_unit
                        WHERE tetkik_adi = :old_name
                          AND birim IS NULL
                          AND is_deleted = false
                    """),
                    {
                        "new_name": normalized_name,
                        "new_unit": normalized_unit,
                        "old_name": original_name,
                    }
                )
            else:
                conn.execute(
                    sa.text("""
                        UPDATE tetkikler
                        SET tetkik_adi = :new_name,
                            birim = :new_unit
                        WHERE tetkik_adi = :old_name
                          AND birim = :old_unit
                          AND is_deleted = false
                    """),
                    {
                        "new_name": normalized_name,
                        "new_unit": normalized_unit,
                        "old_name": original_name,
                        "old_unit": original_unit,
                    }
                )
            update_count += 1

    print(f"[p003_lab_normalize] Normalized {update_count} distinct (name, unit) pairs")


def downgrade() -> None:
    """
    Data migration — no automatic rollback.
    Original values are not preserved; restore from backup if needed.
    """
    print("[p003_lab_normalize] DOWNGRADE: This is a data-only migration.")
    print("  Original values were overwritten. Restore from DB backup if needed.")
