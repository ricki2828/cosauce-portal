#!/usr/bin/env python3
"""
Run SQL migration using built-in sqlite3 module
"""
import sqlite3
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent
SQL_FILE = BASE_DIR / "app" / "database" / "migrate_onboarding_checklist.sql"
DB_FILE = BASE_DIR / "data" / "portal.db"

def run_migration():
    print(f"🔄 Running migration from: {SQL_FILE}")
    print(f"📦 Database: {DB_FILE}")

    # Read SQL file
    with open(SQL_FILE, 'r') as f:
        sql_script = f.read()

    # Connect and execute
    conn = sqlite3.connect(DB_FILE)
    try:
        cursor = conn.cursor()
        cursor.executescript(sql_script)
        conn.commit()
        print("✅ Migration completed successfully!")

        # Verify default checklist was created
        cursor.execute("SELECT COUNT(*) FROM default_onboarding_checklist")
        count = cursor.fetchone()[0]
        print(f"✅ Default checklist items seeded: {count}")

        # Show the items
        cursor.execute("SELECT item_name FROM default_onboarding_checklist ORDER BY order_index")
        items = cursor.fetchall()
        print("\nDefault checklist items:")
        for idx, (name,) in enumerate(items, 1):
            print(f"  {idx}. {name}")

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
