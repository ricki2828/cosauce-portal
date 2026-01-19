#!/usr/bin/env python3
"""Check if Business Updates tables exist in the database."""

import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).parent
DB_FILE = BASE_DIR / "data" / "portal.db"

def check_tables():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    all_tables = [row[0] for row in cursor.fetchall()]

    print("All tables in database:")
    for table in all_tables:
        print(f"  - {table}")

    print("\n" + "="*60)

    # Check for BU-specific tables
    bu_tables = [
        'bu_accounts',
        'bu_account_team_leaders',
        'bu_agents',
        'bu_metric_definitions',
        'bu_daily_submissions',
        'bu_submission_metrics',
        'bu_shift_updates',
        'bu_eod_reports',
        'bu_shift_settings'
    ]

    print("\nBusiness Updates tables status:")
    missing = []
    for table in bu_tables:
        exists = table in all_tables
        status = "✓ EXISTS" if exists else "✗ MISSING"
        print(f"  {status}: {table}")
        if not exists:
            missing.append(table)

    print("\n" + "="*60)

    # Check team_leaders table (should exist from earlier work)
    if 'team_leaders' in all_tables:
        print("\n✓ team_leaders table exists")
        cursor.execute("SELECT COUNT(*) FROM team_leaders")
        count = cursor.fetchone()[0]
        print(f"  Total team leaders: {count}")

        # Show a sample
        cursor.execute("SELECT id, name, email, is_active FROM team_leaders LIMIT 5")
        print("\n  Sample team leaders:")
        for row in cursor.fetchall():
            print(f"    ID: {row[0]}, Name: {row[1]}, Email: {row[2]}, Active: {row[3]}")
    else:
        print("\n✗ team_leaders table does not exist")

    conn.close()

    return missing

if __name__ == "__main__":
    missing = check_tables()

    if missing:
        print(f"\n⚠ Missing {len(missing)} Business Updates tables")
        print("Need to run Business Updates migration")
    else:
        print("\n✓ All Business Updates tables exist")
