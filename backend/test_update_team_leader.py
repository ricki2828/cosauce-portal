#!/usr/bin/env python3
"""Test team leader update with account linking."""

import sqlite3
import uuid
from pathlib import Path

BASE_DIR = Path(__file__).parent
DB_FILE = BASE_DIR / "data" / "portal.db"

def test_update():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Get first team leader
    cursor.execute("SELECT id, name, email FROM team_leaders LIMIT 1")
    tl = cursor.fetchone()
    if not tl:
        print("No team leaders found")
        return

    tl_id, tl_name, tl_email = tl
    print(f"\nTesting with Team Leader: {tl_name} ({tl_email})")
    print(f"Team Leader ID: {tl_id}")

    # Get first two accounts
    cursor.execute("SELECT id, name FROM bu_accounts LIMIT 2")
    accounts = cursor.fetchall()
    if len(accounts) < 2:
        print("Need at least 2 accounts for testing")
        return

    acc1_id, acc1_name = accounts[0]
    acc2_id, acc2_name = accounts[1]

    print(f"\nAccounts to link:")
    print(f"  1. {acc1_name} ({acc1_id[:8]}...)")
    print(f"  2. {acc2_name} ({acc2_id[:8]}...)")

    # Clear existing links for this team leader
    cursor.execute("DELETE FROM bu_account_team_leaders WHERE team_leader_id = ?", (tl_id,))
    print(f"\nCleared existing links for {tl_name}")

    # Create new links
    link1_id = str(uuid.uuid4())
    link2_id = str(uuid.uuid4())

    cursor.execute(
        "INSERT INTO bu_account_team_leaders (id, account_id, team_leader_id) VALUES (?, ?, ?)",
        (link1_id, acc1_id, tl_id)
    )
    cursor.execute(
        "INSERT INTO bu_account_team_leaders (id, account_id, team_leader_id) VALUES (?, ?, ?)",
        (link2_id, acc2_id, tl_id)
    )

    conn.commit()
    print(f"✓ Created 2 new links")

    # Verify
    cursor.execute("""
        SELECT a.name
        FROM bu_accounts a
        JOIN bu_account_team_leaders atl ON a.id = atl.account_id
        WHERE atl.team_leader_id = ?
    """, (tl_id,))
    linked_accounts = cursor.fetchall()

    print(f"\nVerification - {tl_name} is now linked to:")
    for acc in linked_accounts:
        print(f"  - {acc[0]}")

    # Check total links in table
    cursor.execute("SELECT COUNT(*) FROM bu_account_team_leaders")
    total_links = cursor.fetchone()[0]
    print(f"\nTotal links in bu_account_team_leaders: {total_links}")

    conn.close()

if __name__ == "__main__":
    test_update()
