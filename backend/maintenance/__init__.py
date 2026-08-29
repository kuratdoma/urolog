# Migration Engine & Verification Tools
# Part of Epic 1: Safe Migration & Integrity Verification

"""
This package contains tools for safe data migration:

- verify_integrity.py: SHA-256 row hashing for data fidelity verification
- db_import_sharded.py: Migration script for sharded schema population (TBD)

Usage:
    python -m maintenance.verify_integrity --mode legacy
    python -m maintenance.verify_integrity --mode sharded
    python -m maintenance.verify_integrity --mode compare
"""
