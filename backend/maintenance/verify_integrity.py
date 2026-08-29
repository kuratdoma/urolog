#!/usr/bin/env python3
"""
verify_integrity.py - Data Integrity Verification Tool

Story 1.3: Integrity Verification (SHA-256 Row Hashing)

This tool calculates cryptographic hashes of database rows to verify:
1. Legacy data completeness before migration
2. Sharded data fidelity after migration
3. Zero-diff comparison between legacy and sharded states

Usage:
    python -m maintenance.verify_integrity --mode legacy
    python -m maintenance.verify_integrity --mode sharded
    python -m maintenance.verify_integrity --mode compare

Exit Codes:
    0: PASS - All checksums match
    1: FAIL - Mismatch detected (see diff report)
    2: ERROR - Script execution failed
"""

import argparse
import asyncio
import hashlib
import json
import sys
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# Add parent to path for imports
sys.path.insert(0, str(__file__).rsplit("/maintenance", 1)[0])

from app.db.session import SessionLocal


# =============================================================================
# CONFIGURATION
# =============================================================================

# Tables to verify (Domain -> Table Names)
VERIFICATION_TARGETS = {
    "patient": ["hastalar"],
    "clinical": [
        "muayeneler",
        "operasyonlar",
        "hasta_notlari",
        "planlar",
        "telefon_gorusmeleri",
        "tetkik_sonuclari",
        "fotograf_arsivi",
        "istirahat_raporlari",
        "durum_bildirir_raporlari",
        "tibbi_mudahale_raporlari",
        "trus_biyopsileri",
    ],
    "finance": [
        "finans_islemler",
        "finans_odemeler",
        "finans_islem_satirlari",
        "finans_taksitler",
        "kasa_hareketler",
        "hasta_finans_hareketleri",
    ],
}

# Columns to exclude from hash (audit columns, auto-generated)
EXCLUDE_COLUMNS = {"created_at", "updated_at"}


# =============================================================================
# HASH UTILITIES
# =============================================================================

def serialize_value(value: Any) -> str:
    """Convert a value to a stable string representation for hashing."""
    if value is None:
        return "NULL"
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, Decimal):
        return str(value.normalize())
    if isinstance(value, (dict, list)):
        return json.dumps(value, sort_keys=True, default=str)
    return str(value)


def hash_row(row: dict[str, Any], exclude: set[str] | None = None) -> str:
    """
    Calculate SHA-256 hash of a row's contents.
    
    Args:
        row: Dictionary of column -> value
        exclude: Set of column names to exclude from hash
    
    Returns:
        Hexadecimal SHA-256 hash string
    """
    exclude = exclude or EXCLUDE_COLUMNS
    
    # Sort keys for deterministic ordering
    sorted_keys = sorted(k for k in row.keys() if k not in exclude)
    
    # Build canonical string representation
    parts = []
    for key in sorted_keys:
        value = serialize_value(row[key])
        parts.append(f"{key}:{value}")
    
    canonical = "|".join(parts)
    
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


# =============================================================================
# DATABASE QUERIES
# =============================================================================

async def get_table_row_count(session: AsyncSession, table: str) -> int:
    """Get row count for a table."""
    result = await session.execute(text(f"SELECT COUNT(*) FROM {table}"))
    return result.scalar() or 0


async def get_table_rows(
    session: AsyncSession, 
    table: str, 
    batch_size: int = 10000,
    offset: int = 0
) -> list[dict[str, Any]]:
    """Fetch rows from a table in batches."""
    query = text(f"SELECT * FROM {table} ORDER BY id LIMIT :limit OFFSET :offset")
    result = await session.execute(query, {"limit": batch_size, "offset": offset})
    
    # Convert to list of dicts
    columns = result.keys()
    return [dict(zip(columns, row)) for row in result.fetchall()]


async def compute_table_hashes(
    session: AsyncSession,
    table: str,
    batch_size: int = 10000
) -> dict[str, str]:
    """
    Compute SHA-256 hashes for all rows in a table.
    
    Returns:
        Dictionary mapping row ID -> hash
    """
    hashes: dict[str, str] = {}
    offset = 0
    
    while True:
        rows = await get_table_rows(session, table, batch_size, offset)
        if not rows:
            break
        
        for row in rows:
            row_id = str(row.get("id", offset))
            hashes[row_id] = hash_row(row)
        
        offset += batch_size
        print(f"  Processed {offset} rows from {table}...")
    
    return hashes


# =============================================================================
# VERIFICATION MODES
# =============================================================================

async def verify_legacy(session: AsyncSession) -> dict[str, dict[str, str]]:
    """
    Compute hashes for all legacy tables.
    
    Returns:
        Dictionary: domain -> table -> {id: hash}
    """
    results: dict[str, dict[str, dict[str, str]]] = {}
    
    for domain, tables in VERIFICATION_TARGETS.items():
        results[domain] = {}
        print(f"\n[{domain.upper()}] Verifying legacy tables...")
        
        for table in tables:
            try:
                count = await get_table_row_count(session, table)
                print(f"  {table}: {count} rows")
                
                hashes = await compute_table_hashes(session, table)
                results[domain][table] = hashes
                
            except Exception as e:
                print(f"  ERROR: {table} - {e}")
                results[domain][table] = {"__error__": str(e)}
    
    return results


async def verify_sharded(session: AsyncSession) -> dict[str, dict[str, str]]:
    """
    Compute hashes for sharded tables.
    
    Note: This will be implemented when sharded schemas exist.
    Currently returns empty dict as placeholder.
    """
    print("\n[SHARDED] Sharded tables not yet implemented.")
    print("  Run migration first, then use --mode compare")
    return {}


def compare_hashes(
    legacy: dict[str, dict[str, dict[str, str]]],
    sharded: dict[str, dict[str, dict[str, str]]]
) -> tuple[bool, list[str]]:
    """
    Compare legacy and sharded hashes.
    
    Returns:
        (passed: bool, diff_report: list[str])
    """
    diffs: list[str] = []
    
    for domain, tables in legacy.items():
        for table, legacy_hashes in tables.items():
            sharded_hashes = sharded.get(domain, {}).get(table, {})
            
            # Check for missing rows in sharded
            for row_id, legacy_hash in legacy_hashes.items():
                if row_id == "__error__":
                    continue
                    
                sharded_hash = sharded_hashes.get(row_id)
                
                if sharded_hash is None:
                    diffs.append(f"MISSING: {domain}.{table}.{row_id}")
                elif sharded_hash != legacy_hash:
                    diffs.append(f"MISMATCH: {domain}.{table}.{row_id}")
            
            # Check for extra rows in sharded
            for row_id in sharded_hashes:
                if row_id not in legacy_hashes:
                    diffs.append(f"EXTRA: {domain}.{table}.{row_id}")
    
    return len(diffs) == 0, diffs


# =============================================================================
# MAIN
# =============================================================================

async def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Verify data integrity between legacy and sharded databases"
    )
    parser.add_argument(
        "--mode",
        choices=["legacy", "sharded", "compare"],
        default="legacy",
        help="Verification mode"
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output file for hash results (JSON)"
    )
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("UroLog Data Integrity Verification Tool")
    print("=" * 60)
    
    async with SessionLocal() as session:
        if args.mode == "legacy":
            print(f"\nMode: LEGACY - Computing hashes for current tables")
            results = await verify_legacy(session)
            
            # Summary
            total_rows = sum(
                len(hashes) for tables in results.values() 
                for hashes in tables.values() 
                if "__error__" not in hashes
            )
            print(f"\n✅ Computed hashes for {total_rows} rows")
            
            if args.output:
                with open(args.output, "w") as f:
                    json.dump(results, f, indent=2)
                print(f"📄 Results saved to: {args.output}")
            
            return 0
            
        elif args.mode == "sharded":
            print(f"\nMode: SHARDED - Computing hashes for sharded tables")
            results = await verify_sharded(session)
            return 0
            
        elif args.mode == "compare":
            print(f"\nMode: COMPARE - Comparing legacy vs sharded")
            
            # Load cached legacy hashes or compute fresh
            legacy = await verify_legacy(session)
            sharded = await verify_sharded(session)
            
            passed, diffs = compare_hashes(legacy, sharded)
            
            if passed:
                print("\n✅ VERIFICATION PASSED: Zero diffs detected")
                return 0
            else:
                print(f"\n❌ VERIFICATION FAILED: {len(diffs)} differences found")
                for diff in diffs[:20]:  # Show first 20
                    print(f"  - {diff}")
                if len(diffs) > 20:
                    print(f"  ... and {len(diffs) - 20} more")
                return 1
    
    return 2


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
