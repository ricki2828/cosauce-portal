#!/usr/bin/env python3
"""Check schema of Business Updates tables."""

import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).parent
DB_FILE = BASE_DIR / "data" / "portal.db"

def check_schema():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    tables = [
        'bu_accounts',
        'bu_account_team_leaders',
        'team_leaders'
    ]

    for table in tables:
        print(f"\n{'='*60}")
        print(f"Schema for: {table}")
        print('='*60)
        cursor.execute(f"PRAGMA table_info({table})")
        columns = cursor.fetchall()
        for col in columns:
            col_id, name, col_type, not_null, default_val, pk = col
            pk_marker = " PRIMARY KEY" if pk else ""
            nullable = " NOT NULL" if not_null else " NULL"
            default = f" DEFAULT {default_val}" if default_val else ""
            print(f"  {name} {col_type}{pk_marker}{nullable}{default}")

        # Show sample data
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"\nTotal rows: {count}")

        if count > 0:
            cursor.execute(f"SELECT * FROM {table} LIMIT 3")
            rows = cursor.fetchall()
            if rows:
                print("\nSample data:")
                for row in rows:
                    print(f"  {row}")

    conn.close()

if __name__ == "__main__":
    check_schema()
