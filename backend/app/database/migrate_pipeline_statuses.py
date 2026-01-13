#!/usr/bin/env python3
"""
Migration script for Pipeline Opportunities - Update Status Values
Migrates old status values to new ones:
- 'target' → 'evaluation'
- 'contacted' → 'design_implementation'
- 'new' and 'meeting' remain unchanged
"""

import sqlite3
import os
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent.parent.parent / "data" / "portal.db"

def run_migration():
    """Update pipeline opportunity status values"""

    if not DB_PATH.exists():
        print(f"❌ Database not found at {DB_PATH}")
        return False

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("🔄 Running Pipeline Status migration...")

    try:
        # Check if table exists
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='pipeline_opportunities'
        """)
        if not cursor.fetchone():
            print("  ℹ️  No pipeline_opportunities table found - skipping migration")
            return True

        # Update 'target' → 'evaluation'
        print("  ➤ Updating 'target' → 'evaluation'...")
        cursor.execute("""
            UPDATE pipeline_opportunities
            SET status = 'evaluation', updated_at = datetime('now')
            WHERE status = 'target'
        """)
        target_count = cursor.rowcount

        # Update 'contacted' → 'design_implementation'
        print("  ➤ Updating 'contacted' → 'design_implementation'...")
        cursor.execute("""
            UPDATE pipeline_opportunities
            SET status = 'design_implementation', updated_at = datetime('now')
            WHERE status = 'contacted'
        """)
        contacted_count = cursor.rowcount

        conn.commit()

        print(f"✅ Pipeline Status migration completed successfully!")
        print(f"   Updated {target_count} records from 'target' to 'evaluation'")
        print(f"   Updated {contacted_count} records from 'contacted' to 'design_implementation'")
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
