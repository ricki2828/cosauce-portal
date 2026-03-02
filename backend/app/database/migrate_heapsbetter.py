#!/usr/bin/env python3
"""
Migration script for Heapsbetter ATS Integration
Adds ATS columns to requisitions table and creates ats_cache table
"""

import sqlite3
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent.parent.parent / "data" / "portal.db"


def run_migration():
    """Apply Heapsbetter ATS schema additions"""

    if not DB_PATH.exists():
        print(f"Database not found at {DB_PATH}")
        print("   Run init_db.py first to create the database")
        return False

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("Running Heapsbetter ATS migration...")

    try:
        # 1. Add ATS columns to requisitions
        print("  Adding ATS columns to requisitions...")
        for col_name, col_def in [
            ("heapsbetter_job_id", "TEXT"),
            ("ats_synced_at", "TEXT"),
        ]:
            try:
                cursor.execute(f"ALTER TABLE requisitions ADD COLUMN {col_name} {col_def}")
                print(f"    Added column: {col_name}")
            except sqlite3.OperationalError as e:
                if "duplicate column" in str(e).lower():
                    print(f"    Column already exists: {col_name}")
                else:
                    raise

        # 2. Create ats_cache table
        print("  Creating ats_cache table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ats_cache (
                cache_key TEXT PRIMARY KEY,
                data TEXT,
                cached_at TEXT DEFAULT (datetime('now')),
                expires_at TEXT
            )
        """)
        print("    Created ats_cache table")

        # 3. Create index on heapsbetter_job_id
        print("  Creating index on requisitions(heapsbetter_job_id)...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_requisitions_hb_job_id
            ON requisitions(heapsbetter_job_id)
        """)
        print("    Created index: idx_requisitions_hb_job_id")

        conn.commit()
        print("Heapsbetter ATS migration completed successfully")
        return True

    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    success = run_migration()
    exit(0 if success else 1)
