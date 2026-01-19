#!/usr/bin/env python3
"""
Script to check for duplicate emails in CoSauce Portal database
"""
import asyncio
import aiosqlite
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "portal.db"

async def check_duplicates():
    print("=" * 80)
    print("CoSauce Portal - Duplicate Email Analysis")
    print("=" * 80)
    print()

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # Check duplicate emails in team_members
        print("1. DUPLICATE EMAILS IN TEAM_MEMBERS TABLE")
        print("-" * 80)
        cursor = await db.execute("""
            SELECT email, COUNT(*) as count, GROUP_CONCAT(id) as ids,
                   GROUP_CONCAT(name) as names,
                   GROUP_CONCAT(account_id) as accounts,
                   GROUP_CONCAT(status) as statuses
            FROM team_members
            WHERE email IS NOT NULL AND email != ''
            GROUP BY LOWER(email)
            HAVING count > 1
            ORDER BY count DESC
        """)
        duplicates = await cursor.fetchall()

        if duplicates:
            for row in duplicates:
                print(f"\nEmail: {row['email']}")
                print(f"  Count: {row['count']}")
                print(f"  Names: {row['names']}")
                print(f"  Accounts: {row['accounts']}")
                print(f"  Statuses: {row['statuses']}")
                print(f"  IDs: {row['ids']}")
        else:
            print("✓ No duplicate emails found in team_members")

        print()
        print("2. ALL TEAM_MEMBERS WITH STATUS")
        print("-" * 80)
        cursor = await db.execute("""
            SELECT id, name, email, role, account_id, status, start_date
            FROM team_members
            ORDER BY email, status
        """)
        members = await cursor.fetchall()

        print(f"Total team members: {len(members)}")
        print()

        # Group by status
        status_counts = {}
        inactive_members = []

        for member in members:
            status = member['status'] or 'null'
            status_counts[status] = status_counts.get(status, 0) + 1

            if status in ['offboarded', 'inactive', 'cancelled']:
                inactive_members.append(member)

        print("Status breakdown:")
        for status, count in sorted(status_counts.items()):
            print(f"  {status}: {count}")

        print()
        print("3. INACTIVE/OFFBOARDED TEAM MEMBERS")
        print("-" * 80)
        if inactive_members:
            for member in inactive_members:
                print(f"\nID: {member['id']}")
                print(f"  Name: {member['name']}")
                print(f"  Email: {member['email']}")
                print(f"  Role: {member['role']}")
                print(f"  Account: {member['account_id']}")
                print(f"  Status: {member['status']}")
        else:
            print("✓ No inactive/offboarded members found")

        print()
        print("4. DUPLICATE EMAILS IN USERS TABLE")
        print("-" * 80)
        cursor = await db.execute("""
            SELECT email, COUNT(*) as count, GROUP_CONCAT(id) as ids,
                   GROUP_CONCAT(name) as names,
                   GROUP_CONCAT(is_active) as active_flags
            FROM users
            GROUP BY LOWER(email)
            HAVING count > 1
        """)
        user_dups = await cursor.fetchall()

        if user_dups:
            for row in user_dups:
                print(f"\nEmail: {row['email']}")
                print(f"  Count: {row['count']}")
                print(f"  Names: {row['names']}")
                print(f"  Active Flags: {row['active_flags']}")
                print(f"  IDs: {row['ids']}")
        else:
            print("✓ No duplicate emails found in users table")

        print()
        print("5. INACTIVE USERS (is_active = 0)")
        print("-" * 80)
        cursor = await db.execute("""
            SELECT id, name, email, role, is_active
            FROM users
            WHERE is_active = 0
            ORDER BY email
        """)
        inactive_users = await cursor.fetchall()

        if inactive_users:
            for user in inactive_users:
                print(f"\nID: {user['id']}")
                print(f"  Name: {user['name']}")
                print(f"  Email: {user['email']}")
                print(f"  Role: {user['role']}")
        else:
            print("✓ No inactive users found")

        print()
        print("=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"Team Members Duplicates: {len(duplicates)}")
        print(f"User Duplicates: {len(user_dups)}")
        print(f"Inactive Team Members: {len(inactive_members)}")
        print(f"Inactive Users: {len(inactive_users)}")
        print()

if __name__ == "__main__":
    asyncio.run(check_duplicates())
