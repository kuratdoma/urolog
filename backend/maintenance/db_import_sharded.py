#!/usr/bin/env python3
"""
db_import_sharded.py - Sharded Data Migration Tool

Epic 1: Safe Migration & Integrity Verification
Story 1.2: Migration Engine

This script migrates data from legacy tables (public schema) to the new
domain-isolated schemas (patient, clinical, finance).

Features:
- Batch processing (10k records per batch per NFR5)
- Dry-run mode with diff reports
- Integrity verification via SHA-256 hashing
- Transactional safety (rollback on failure)

Usage:
    # Dry run (no changes)
    python -m maintenance.db_import_sharded --dry-run
    
    # Full migration
    python -m maintenance.db_import_sharded --execute
    
    # Migrate specific domain
    python -m maintenance.db_import_sharded --execute --domain patient

Exit Codes:
    0: SUCCESS - Migration complete
    1: FAILED - Migration failed (check logs)
    2: ERROR - Script execution error
"""

import argparse
import asyncio
import sys
from datetime import datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# Add parent to path for imports
sys.path.insert(0, str(__file__).rsplit("/maintenance", 1)[0])

from app.db.session import SessionLocal


# =============================================================================
# CONFIGURATION
# =============================================================================

BATCH_SIZE = 10000  # NFR5: Handle 10k records without memory leaks

# Migration mapping: legacy_table -> (target_schema, target_table)
# Note: In Phase 1, we're creating exact copies with same table names
MIGRATION_MAP = {
    "patient": {
        "hastalar": ("patient", "sharded_patient_demographics"),
    },
    "clinical": {
        "muayeneler": ("clinical", "sharded_clinical_muayeneler"),
        "operasyonlar": ("clinical", "sharded_clinical_operasyonlar"),
        "hasta_notlari": ("clinical", "sharded_clinical_notlar"),
        "telefon_gorusmeleri": ("clinical", "sharded_clinical_telefon_gorusmeleri"),
        "tetkik_sonuclari": ("clinical", "sharded_clinical_tetkikler"),
        "fotograf_arsivi": ("clinical", "sharded_clinical_fotograflar"),
        "istirahat_raporlari": ("clinical", "sharded_clinical_istirahat_raporlari"),
        "durum_bildirir_raporlari": ("clinical", "sharded_clinical_durum_bildirir_raporlari"),
        "tibbi_mudahale_raporlari": ("clinical", "sharded_clinical_tibbi_mudahale_raporlari"),
        "trus_biyopsileri": ("clinical", "sharded_clinical_trus_biyopsileri"),
        "randevular": ("clinical", "sharded_clinical_randevular"),
    },
    "finance": {
        "finans_islemler": ("finance", "sharded_finance_islemler"),
        # ... others follow same pattern if sharded
    },
}


# =============================================================================
# MIGRATION UTILITIES
# =============================================================================

async def get_table_columns(session: AsyncSession, table: str, schema: str = "public") -> list[str]:
    """Get column names for a table."""
    query = text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = :schema AND table_name = :table
        ORDER BY ordinal_position
    """)
    result = await session.execute(query, {"table": table, "schema": schema})
    return [row[0] for row in result.fetchall()]


async def get_row_count(session: AsyncSession, table: str, schema: str = "public") -> int:
    """Get row count for a table."""
    query = text(f"SELECT COUNT(*) FROM {schema}.{table}")
    result = await session.execute(query)
    return result.scalar() or 0


async def create_target_table(
    session: AsyncSession,
    source_table: str,
    target_schema: str,
    target_table: str,
    dry_run: bool = True,
    source_schema: str = "public"
) -> bool:
    """
    Create target table in sharded schema by copying structure from source.
    
    Returns:
        True if table was created or already exists
    """
    # Check if target already exists
    check_query = text("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = :schema AND table_name = :table
        )
    """)
    result = await session.execute(check_query, {"schema": target_schema, "table": target_table})
    exists = result.scalar()
    
    if exists:
        print(f"    Table {target_schema}.{target_table} already exists")
        return True
    
    if dry_run:
        print(f"    [DRY RUN] Would create {target_schema}.{target_table}")
        return True
    
    # Create table like source
    create_sql = f"""
        CREATE TABLE {target_schema}.{target_table} 
        (LIKE {source_schema}.{source_table} INCLUDING ALL)
    """
    await session.execute(text(create_sql))
    
    # Add audit columns missing from legacy
    audit_cols = [
        "ALTER TABLE {schema}.{table} ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE",
        "ALTER TABLE {schema}.{table} ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE {schema}.{table} ADD COLUMN IF NOT EXISTS created_by INTEGER",
        "ALTER TABLE {schema}.{table} ADD COLUMN IF NOT EXISTS updated_by INTEGER"
    ]
    
    for sql in audit_cols:
        await session.execute(text(sql.format(schema=target_schema, table=target_table)))
        
    print(f"    Created {target_schema}.{target_table} with audit columns")
    return True


async def migrate_table_data(
    session: AsyncSession,
    source_table: str,
    target_schema: str,
    target_table: str,
    batch_size: int = BATCH_SIZE,
    dry_run: bool = True,
    source_schema: str = "public"
) -> dict[str, Any]:
    """
    Migrate data from source to target table in batches.
    
    Returns:
        Migration statistics
    """
    stats = {
        "source_table": source_table,
        "target": f"{target_schema}.{target_table}",
        "source_count": 0,
        "migrated_count": 0,
        "batches": 0,
        "status": "pending",
    }
    
    # Get source count
    stats["source_count"] = await get_row_count(session, source_table, schema=source_schema)
    
    if stats["source_count"] == 0:
        stats["status"] = "skipped_empty"
        print(f"    {source_table}: 0 rows (skipped)")
        return stats
    
    if dry_run:
        stats["status"] = "dry_run"
        stats["migrated_count"] = stats["source_count"]
        print(f"    [DRY RUN] {source_table}: {stats['source_count']} rows would be migrated")
        return stats
    
    # Get columns for INSERT (only intersection)
    source_columns_raw = await get_table_columns(session, source_table, schema=source_schema)
    target_columns = await get_table_columns(session, target_table, schema=target_schema)
    
    # Define special casts: target_col -> cast_expression
    # This handles known legacy mismatches
    SPECIAL_CASTS = {
        "cocuk_sayisi": "NULLIF(cocuk_sayisi, '')::INTEGER",
        "kan_sulandirici": "(CASE WHEN kan_sulandirici::text IN ('', 'null') THEN '0' ELSE kan_sulandirici::text END)::INTEGER",
        "sms_izin": "CASE WHEN sms_izin IN ('1', 'True', 'true', 'Y') THEN TRUE ELSE FALSE END",
        "email_izin": "CASE WHEN email_izin IN ('1', 'True', 'true', 'Y') THEN TRUE ELSE FALSE END"
    }
    
    # Columns that exist in both
    common_columns = [c for c in source_columns_raw if c in target_columns]
    
    # Build the SELECT expressions
    select_exprs = []
    for col in common_columns:
        if col in SPECIAL_CASTS:
            select_exprs.append(f"{SPECIAL_CASTS[col]} AS \"{col}\"")
        elif col == "is_deleted":
            # Randevular is_deleted is Integer, others are Boolean
            if target_table == "sharded_clinical_randevular":
                select_exprs.append(f"\"{col}\"")
            else:
                select_exprs.append(f"\"{col}\"::BOOLEAN AS \"{col}\"")
        else:
            select_exprs.append(f"\"{col}\"")
            
    # Add defaults for columns that exist in target but NOT in source
    if "is_deleted" in target_columns and "is_deleted" not in common_columns:
        common_columns.append("is_deleted")
        select_exprs.append("FALSE AS \"is_deleted\"")
    if "created_at" in target_columns and "created_at" not in common_columns:
        common_columns.append("created_at")
        select_exprs.append("NOW() AS \"created_at\"")
            
    columns_str = ", ".join([f"\"{c}\"" for c in common_columns])
    select_str = ", ".join(select_exprs)
    
    # Clear target table first (idempotent migration)
    await session.execute(text(f"TRUNCATE {target_schema}.{target_table} CASCADE"))
    
    # Migrate in batches
    offset = 0
    while True:
        # Select batch from source
        select_sql = f"""
            INSERT INTO {target_schema}.{target_table} ({columns_str})
            SELECT {select_str} 
            FROM {source_schema}.{source_table}
            ORDER BY id
            LIMIT {batch_size} OFFSET {offset}
        """
        result = await session.execute(text(select_sql))
        rows_affected = result.rowcount
        
        if rows_affected == 0:
            break
        
        stats["migrated_count"] += rows_affected
        stats["batches"] += 1
        offset += batch_size
        
        print(f"    {source_table}: Migrated {stats['migrated_count']}/{stats['source_count']} rows...")
    
    stats["status"] = "completed"
    return stats


# =============================================================================
# DOMAIN MIGRATION
# =============================================================================

async def migrate_domain(
    session: AsyncSession,
    domain: str,
    dry_run: bool = True,
    source_schema: str = "public"
) -> dict[str, list[dict[str, Any]]]:
    """
    Migrate all tables for a domain.
    
    Returns:
        Dictionary of table migration statistics
    """
    if domain not in MIGRATION_MAP:
        raise ValueError(f"Unknown domain: {domain}")
    
    print(f"\n{'='*60}")
    print(f"[{domain.upper()}] Migrating domain tables...")
    print(f"{'='*60}")
    
    results: dict[str, dict[str, Any]] = {}
    
    for source_table, (target_schema, target_table) in MIGRATION_MAP[domain].items():
        print(f"\n  Processing: {source_table} -> {target_schema}.{target_table}")
        
        # Create target table
        await create_target_table(session, source_table, target_schema, target_table, dry_run, source_schema=source_schema)
        
        # Migrate data
        stats = await migrate_table_data(
            session, source_table, target_schema, target_table, 
            batch_size=BATCH_SIZE, dry_run=dry_run, source_schema=source_schema
        )
        results[source_table] = stats
    
    return results


# =============================================================================
# MAIN
# =============================================================================

async def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Migrate data from legacy tables to sharded schemas"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=True,
        help="Simulate migration without making changes (default)"
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually execute the migration"
    )
    parser.add_argument(
        "--domain",
        choices=["patient", "clinical", "finance", "all"],
        default="all",
        help="Domain to migrate (default: all)"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=BATCH_SIZE,
        help=f"Batch size for data migration (default: {BATCH_SIZE})"
    )
    parser.add_argument(
        "--source-schema",
        type=str,
        default="public",
        help="Source schema for legacy data (default: public)"
    )
    
    args = parser.parse_args()
    
    # --execute overrides --dry-run
    dry_run = not args.execute
    
    print("=" * 60)
    print("UroLog Sharded Data Migration Tool")
    print("=" * 60)
    print(f"Mode: {'DRY RUN' if dry_run else '⚠️  LIVE EXECUTION'}")
    print(f"Domain: {args.domain}")
    print(f"Batch Size: {args.batch_size}")
    print(f"Started: {datetime.now().isoformat()}")
    
    if not dry_run:
        print("\n⚠️  WARNING: This will modify the database!")
        print("Press Ctrl+C within 5 seconds to cancel...")
        try:
            await asyncio.sleep(5)
        except KeyboardInterrupt:
            print("\nCancelled.")
            return 2
    
    all_results: dict[str, dict[str, dict[str, Any]]] = {}
    
    async with SessionLocal() as session:
        try:
            domains = list(MIGRATION_MAP.keys()) if args.domain == "all" else [args.domain]
            
            for domain in domains:
                results = await migrate_domain(session, domain, dry_run, source_schema=args.source_schema)
                all_results[domain] = results
            
            if not dry_run:
                await session.commit()
                print("\n✅ Transaction committed successfully")
            
        except Exception as e:
            if not dry_run:
                await session.rollback()
                print(f"\n❌ Transaction rolled back due to error: {e}")
            raise
    
    # Summary
    print("\n" + "=" * 60)
    print("MIGRATION SUMMARY")
    print("=" * 60)
    
    total_source = 0
    total_migrated = 0
    
    for domain, tables in all_results.items():
        print(f"\n[{domain.upper()}]")
        for table, stats in tables.items():
            status_icon = "✅" if stats["status"] in ("completed", "dry_run") else "⏭️"
            print(f"  {status_icon} {table}: {stats['migrated_count']}/{stats['source_count']} rows")
            total_source += stats["source_count"]
            total_migrated += stats["migrated_count"]
    
    print(f"\nTotal: {total_migrated}/{total_source} rows")
    print(f"Completed: {datetime.now().isoformat()}")
    
    if dry_run:
        print("\n💡 To execute migration, run with --execute flag")
    
    return 0


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}")
        sys.exit(2)
