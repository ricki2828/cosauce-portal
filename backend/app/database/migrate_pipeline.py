#!/usr/bin/env python3
"""
Migration script for Pipeline Opportunities
Adds pipeline_opportunities table for manual opportunity tracking
"""

import sqlite3
import os
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent.parent.parent / "data" / "portal.db"

def run_migration():
    """Apply Pipeline Opportunities schema"""

    if not DB_PATH.exists():
        print(f"❌ Database not found at {DB_PATH}")
        print("   Run init_db.py first to create the database")
        return False

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("🔄 Running Pipeline Opportunities migration...")

    try:
        # Create pipeline_opportunities table
        print("  ➤ Creating pipeline_opportunities table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pipeline_opportunities (
                id TEXT PRIMARY KEY,
                client_name TEXT NOT NULL,
                size TEXT,
                likelihood TEXT NOT NULL DEFAULT 'medium',
                status TEXT NOT NULL DEFAULT 'new',
                target_date TEXT,
                notes TEXT,
                created_by TEXT NOT NULL REFERENCES users(id),
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)

        # Create index on status for faster filtering
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_pipeline_status
            ON pipeline_opportunities(status)
        """)

        conn.commit()
        print("✅ Pipeline Opportunities migration completed successfully!")
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
