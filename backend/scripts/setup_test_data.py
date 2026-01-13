#!/usr/bin/env python3
"""
Setup test data for team leader direct submission testing.
Creates test team leader, account, and metrics in Azure database.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from uuid import uuid4

# Azure database URL
DATABASE_URL = "postgresql+asyncpg://dbadmin:DailyUpdate2025!@daily-update-db.postgres.database.azure.com:5432/dailyupdate?ssl=require"


async def main():
    """Setup test data in Azure database."""

    print("🔄 Connecting to Azure database...")
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        print("\n📊 Checking existing data...")

        # Check for existing accounts
        result = await session.execute(text("SELECT id, name, code FROM accounts ORDER BY created_at LIMIT 5"))
        accounts = result.fetchall()

        if accounts:
            print(f"\n✅ Found {len(accounts)} accounts:")
            for acc in accounts:
                print(f"   - {acc[1]} ({acc[2]}): {acc[0]}")
        else:
            print("   ⚠️  No accounts found")

        # Check for existing team leaders
        result = await session.execute(text("SELECT id, name, email FROM team_leaders ORDER BY created_at LIMIT 5"))
        team_leaders = result.fetchall()

        if team_leaders:
            print(f"\n✅ Found {len(team_leaders)} team leaders:")
            for tl in team_leaders:
                print(f"   - {tl[1]} ({tl[2]}): {tl[0]}")
        else:
            print("   ⚠️  No team leaders found")

        # Check for existing metrics
        if accounts:
            account_id = accounts[0][0]
            result = await session.execute(
                text("SELECT id, name, data_type FROM metric_definitions WHERE account_id = :account_id LIMIT 5"),
                {"account_id": account_id}
            )
            metrics = result.fetchall()

            if metrics:
                print(f"\n✅ Found {len(metrics)} metrics for account {accounts[0][1]}:")
                for m in metrics:
                    print(f"   - {m[1]} ({m[2]}): {m[0]}")
            else:
                print(f"   ⚠️  No metrics found for account {accounts[0][1]}")

        # Check for test team leader with specific email
        test_email = "test.teamleader@cosauce.co"
        result = await session.execute(
            text("SELECT id, name, email FROM team_leaders WHERE email = :email"),
            {"email": test_email}
        )
        test_tl = result.fetchone()

        if test_tl:
            print(f"\n✅ Test team leader exists: {test_tl[1]} ({test_tl[2]})")
            test_tl_id = test_tl[0]

            # Check account assignments
            result = await session.execute(
                text("""
                    SELECT a.id, a.name, a.code
                    FROM accounts a
                    JOIN team_leader_accounts tla ON a.id = tla.account_id
                    WHERE tla.team_leader_id = :tl_id
                """),
                {"tl_id": test_tl_id}
            )
            assigned_accounts = result.fetchall()

            if assigned_accounts:
                print(f"   ✅ Assigned to {len(assigned_accounts)} accounts:")
                for acc in assigned_accounts:
                    print(f"      - {acc[1]} ({acc[2]}): {acc[0]}")
            else:
                print("   ⚠️  Not assigned to any accounts")
        else:
            print(f"\n⚠️  Test team leader not found: {test_email}")
            print("   You can create one using the admin panel or API")

        print("\n" + "="*60)
        print("📋 Summary for Testing:")
        print("="*60)

        if test_tl and assigned_accounts and metrics:
            print("\n✅ Test data is ready!")
            print(f"\nTest Team Leader:")
            print(f"  - ID: {test_tl_id}")
            print(f"  - Email: {test_email}")
            print(f"  - Name: {test_tl[1]}")
            print(f"\nAssigned Account:")
            print(f"  - ID: {assigned_accounts[0][0]}")
            print(f"  - Name: {assigned_accounts[0][1]}")
            print(f"  - Code: {assigned_accounts[0][2]}")
            print(f"\nMetrics available: {len(metrics)}")

            print("\n📝 Next steps:")
            print("1. Create portal user with:")
            print(f"   - Email: {test_email}")
            print(f"   - Role: team_leader")
            print(f"   - Password: [set a password]")
            print("2. Run end-to-end tests following the testing guide")
        else:
            print("\n⚠️  Test data setup needed:")
            if not test_tl:
                print("   - Create test team leader via admin panel or API")
            if test_tl and not assigned_accounts:
                print("   - Assign test team leader to at least one account")
            if accounts and not metrics:
                print("   - Create metric definitions for the account")

    await engine.dispose()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
