"""
Clean up all dummy/test Business Updates data.
This will delete all accounts, agents, metrics, submissions, and shift data.
"""
import aiosqlite
import asyncio
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent.parent.parent / "data" / "portal.db"


async def cleanup():
    """Delete all Business Updates test data."""
    async with aiosqlite.connect(DB_PATH) as db:
        print("=" * 60)
        print("Cleaning Up Business Updates Dummy Data")
        print("=" * 60)
        print("")

        # Get counts before deletion
        print("Current data counts:")
        print("-" * 60)

        tables = [
            ("bu_accounts", "Accounts"),
            ("bu_account_team_leaders", "Account-TeamLeader Links"),
            ("bu_agents", "Agents"),
            ("bu_metric_definitions", "Metric Definitions"),
            ("bu_daily_submissions", "Daily Submissions"),
            ("bu_submission_metrics", "Submission Metrics"),
            ("bu_shift_updates", "Shift Updates"),
            ("bu_eod_reports", "EOD Reports"),
            ("bu_shift_settings", "Shift Settings")
        ]

        counts_before = {}
        for table, name in tables:
            cursor = await db.execute(f"SELECT COUNT(*) as count FROM {table}")
            row = await cursor.fetchone()
            count = row[0] if row else 0
            counts_before[table] = count
            print(f"  {name}: {count}")

        print("")
        print("Deleting all data...")
        print("-" * 60)

        # Delete in correct order (children first due to foreign keys)
        # Even though we have ON DELETE CASCADE, explicit order is clearer

        # 1. Delete submission metrics (child of submissions)
        await db.execute("DELETE FROM bu_submission_metrics")
        print("✓ Deleted submission metrics")

        # 2. Delete daily submissions (child of agents, accounts, team leaders)
        await db.execute("DELETE FROM bu_daily_submissions")
        print("✓ Deleted daily submissions")

        # 3. Delete EOD reports
        await db.execute("DELETE FROM bu_eod_reports")
        print("✓ Deleted EOD reports")

        # 4. Delete shift updates
        await db.execute("DELETE FROM bu_shift_updates")
        print("✓ Deleted shift updates")

        # 5. Delete shift settings
        await db.execute("DELETE FROM bu_shift_settings")
        print("✓ Deleted shift settings")

        # 6. Delete metric definitions (child of accounts)
        await db.execute("DELETE FROM bu_metric_definitions")
        print("✓ Deleted metric definitions")

        # 7. Delete agents (child of team leaders)
        await db.execute("DELETE FROM bu_agents")
        print("✓ Deleted agents")

        # 8. Delete account-team leader links
        await db.execute("DELETE FROM bu_account_team_leaders")
        print("✓ Deleted account-team leader links")

        # 9. Delete accounts (parent table)
        await db.execute("DELETE FROM bu_accounts")
        print("✓ Deleted accounts")

        await db.commit()

        print("")
        print("Verifying cleanup...")
        print("-" * 60)

        # Verify all tables are empty
        all_clean = True
        for table, name in tables:
            cursor = await db.execute(f"SELECT COUNT(*) as count FROM {table}")
            row = await cursor.fetchone()
            count = row[0] if row else 0
            status = "✓" if count == 0 else "✗"
            print(f"  {status} {name}: {count}")
            if count > 0:
                all_clean = False

        print("")
        print("=" * 60)
        if all_clean:
            print("✓ Cleanup Complete! All dummy data removed.")
        else:
            print("⚠ Warning: Some tables still have data")
        print("=" * 60)
        print("")

        # Summary
        total_deleted = sum(counts_before.values())
        print(f"Total records deleted: {total_deleted}")
        print("")


async def main():
    print("")
    await cleanup()
    print("You can now start fresh with Business Updates!")
    print("")


if __name__ == "__main__":
    asyncio.run(main())
