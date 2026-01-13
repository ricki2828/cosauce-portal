#!/usr/bin/env python3
"""
Migration script for Team Leader Portal Linking
Adds azure_team_leader_id column to users table for linking portal users to Azure TeamLeader entities
"""

import sqlite3
import os
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent.parent.parent / "data" / "portal.db"

def run_migration():
    """Add azure_team_leader_id column to users table"""

    if not DB_PATH.exists():
        print(f"❌ Database not found at {DB_PATH}")
        print("   Run init_db.py first to create the database")
        return False

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("🔄 Running Team Leader Linking migration...")

    try:
        # 1. Check if column already exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'azure_team_leader_id' in columns:
            print("  ℹ️  Column azure_team_leader_id already exists, skipping")
        else:
            # 2. Add azure_team_leader_id column
            print("  ➤ Adding azure_team_leader_id column to users table...")
            cursor.execute("""
                ALTER TABLE users ADD COLUMN azure_team_leader_id TEXT
            """)

            # 3. Create index for faster lookups
            print("  ➤ Creating index on azure_team_leader_id...")
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_users_azure_tl_id
                ON users(azure_team_leader_id)
            """)

        conn.commit()
        print("✅ Migration completed successfully!")
        return True

    except sqlite3.Error as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        return False

    finally:
        conn.close()


if __name__ == "__main__":
    success = run_migration()
    exit(0 if success else 1)
