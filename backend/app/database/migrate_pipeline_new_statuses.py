#!/usr/bin/env python3
"""
Migration script for Pipeline Opportunities - Update to New Status Names
Migrates status values to match new pipeline stages:
- 'evaluation' → 'assessing'
- 'design_implementation' → 'implementation'
- 'new' and 'meeting' remain unchanged
"""

import sqlite3
import os
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent.parent.parent / "data" / "portal.db"

def run_migration():
    """Update pipeline opportunity status values to new names"""

    if not DB_PATH.exists():
        print(f"❌ Database not found at {DB_PATH}")
        return False

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("🔄 Running Pipeline Status migration (New Names)...")

    try:
        # Check if table exists
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='pipeline_opportunities'
        """)
        if not cursor.fetchone():
            print("  ℹ️  No pipeline_opportunities table found - skipping migration")
            return True

        # Update 'evaluation' → 'assessing'
        print("  ➤ Updating 'evaluation' → 'assessing'...")
        cursor.execute("""
            UPDATE pipeline_opportunities
            SET status = 'assessing', updated_at = datetime('now')
            WHERE status = 'evaluation'
        """)
        evaluation_count = cursor.rowcount

        # Update 'design_implementation' → 'implementation'
        print("  ➤ Updating 'design_implementation' → 'implementation'...")
        cursor.execute("""
            UPDATE pipeline_opportunities
            SET status = 'implementation', updated_at = datetime('now')
            WHERE status = 'design_implementation'
        """)
        design_count = cursor.rowcount

        conn.commit()

        print(f"✅ Pipeline Status migration completed successfully!")
        print(f"   Updated {evaluation_count} records from 'evaluation' to 'assessing'")
        print(f"   Updated {design_count} records from 'design_implementation' to 'implementation'")
        return True

    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        return False

    finally:
        conn.close()

if __name__ == "__main__":
    success = run_migration()
    exit(0 if success else 1)
