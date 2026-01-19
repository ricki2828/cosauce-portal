#!/usr/bin/env python3
"""Check Business Updates accounts and team leader relationships."""

import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).parent
DB_FILE = BASE_DIR / "data" / "portal.db"

def check_data():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Check accounts
    cursor.execute("SELECT COUNT(*) FROM bu_accounts")
    account_count = cursor.fetchone()[0]
    print(f"Total accounts: {account_count}")

    if account_count > 0:
        cursor.execute("SELECT id, account_name, timezone, is_active FROM bu_accounts LIMIT 10")
        print("\nAccounts:")
        for row in cursor.fetchall():
            print(f"  ID: {row[0]}, Name: {row[1]}, Timezone: {row[2]}, Active: {row[3]}")

    print("\n" + "="*60)

    # Check account-team leader relationships
    cursor.execute("SELECT COUNT(*) FROM bu_account_team_leaders")
    link_count = cursor.fetchone()[0]
    print(f"\nTotal account-team leader links: {link_count}")

    if link_count > 0:
        cursor.execute("""
            SELECT
                atl.account_id,
                atl.team_leader_id,
                a.account_name,
                tl.name as team_leader_name,
                tl.email,
                atl.created_at
            FROM bu_account_team_leaders atl
            LEFT JOIN bu_accounts a ON atl.account_id = a.id
            LEFT JOIN team_leaders tl ON atl.team_leader_id = tl.id
            LIMIT 20
        """)
        print("\nAccount-Team Leader Links:")
        for row in cursor.fetchall():
            print(f"  Account: {row[2]} -> Team Leader: {row[3]} ({row[4]})")
            print(f"    Account ID: {row[0]}")
            print(f"    TL ID: {row[1]}")
            print(f"    Created: {row[5]}")
            print()

    print("="*60)

    # Check for duplicate links (same account + team leader combination)
    cursor.execute("""
        SELECT account_id, team_leader_id, COUNT(*) as count
        FROM bu_account_team_leaders
        GROUP BY account_id, team_leader_id
        HAVING COUNT(*) > 1
    """)
    duplicates = cursor.fetchall()
    if duplicates:
        print("\n⚠ Found duplicate account-team leader links:")
        for row in duplicates:
            print(f"  Account ID: {row[0]}, Team Leader ID: {row[1]}, Count: {row[2]}")
    else:
        print("\n✓ No duplicate links found")

    print("\n" + "="*60)

    # Check team leaders
    cursor.execute("SELECT id, name, email, is_active FROM team_leaders")
    print("\nAll Team Leaders:")
    for row in cursor.fetchall():
        active_status = "ACTIVE" if row[3] else "INACTIVE"
        print(f"  {active_status}: {row[1]} ({row[2]}) - ID: {row[0]}")

    conn.close()

if __name__ == "__main__":
    check_data()
