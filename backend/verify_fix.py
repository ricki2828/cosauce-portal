#!/usr/bin/env python3
"""Verify team leader account linking fix."""

import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).parent
DB_FILE = BASE_DIR / "data" / "portal.db"

def verify():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    print("="*60)
    print("VERIFICATION: Team Leader Account Linking")
    print("="*60)

    # Check accounts
    cursor.execute("SELECT id, name FROM bu_accounts ORDER BY name")
    accounts = cursor.fetchall()
    print(f"\nAccounts ({len(accounts)} total):")
    for acc_id, name in accounts:
        print(f"  - {name} (ID: {acc_id[:8]}...)")

    # Check team leaders
    cursor.execute("SELECT id, name, email FROM team_leaders ORDER BY name")
    team_leaders = cursor.fetchall()
    print(f"\nTeam Leaders ({len(team_leaders)} total):")
    for tl_id, name, email in team_leaders:
        print(f"  - {name} ({email}) - ID: {tl_id[:8]}...")

    # Check links
    cursor.execute("SELECT COUNT(*) FROM bu_account_team_leaders")
    link_count = cursor.fetchone()[0]
    print(f"\nAccount-Team Leader Links: {link_count}")

    if link_count > 0:
        cursor.execute("""
            SELECT
                atl.id,
                a.name as account_name,
                tl.name as team_leader_name,
                atl.created_at
            FROM bu_account_team_leaders atl
            JOIN bu_accounts a ON atl.account_id = a.id
            JOIN team_leaders tl ON atl.team_leader_id = tl.id
            ORDER BY atl.created_at DESC
        """)
        links = cursor.fetchall()
        print("\nExisting Links:")
        for link_id, acc_name, tl_name, created_at in links:
            print(f"  {acc_name} → {tl_name} (created: {created_at})")
    else:
        print("\n⚠ NO LINKS FOUND - Junction table is empty")
        print("\nTo test the fix:")
        print("1. Go to the frontend Business Updates > Team Leaders")
        print("2. Click 'Add Team Leader' or edit an existing one")
        print("3. Select one or more accounts")
        print("4. Save the team leader")
        print("5. Run this script again to see if links were created")

    print("\n" + "="*60)

    conn.close()

if __name__ == "__main__":
    verify()
