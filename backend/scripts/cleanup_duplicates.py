#!/usr/bin/env python3
"""
CLI tool for managing duplicate and inactive team leaders in Azure
"""
import asyncio
import httpx
from typing import List, Dict, Any
from datetime import datetime

# Azure API configuration
AZURE_API_URL = "https://daily-update-api.azurewebsites.net"


async def fetch_all_team_leaders() -> List[Dict[str, Any]]:
    """Fetch all team leaders from Azure"""
    print("  (This may take 30-60 seconds...)")
    async with httpx.AsyncClient(timeout=120.0) as client:  # Increased timeout to 2 minutes
        try:
            response = await client.get(f"{AZURE_API_URL}/api/team-leaders", params={"active_only": False})
            response.raise_for_status()
            data = response.json()

            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and "items" in data:
                return data["items"]
            return []
        except httpx.TimeoutException:
            print("\n❌ Error: Azure API request timed out after 2 minutes.")
            print("\nThis could mean:")
            print("  1. The Azure API is experiencing issues")
            print("  2. Network connectivity problems")
            print("\nTry using the Web API instead:")
            print(f"  1. Open http://localhost:8004/docs")
            print(f"  2. Navigate to 'Admin Cleanup' section")
            print(f"  3. Use GET /api/admin/cleanup/team-leaders/duplicates")
            raise
        except httpx.HTTPError as e:
            print(f"\n❌ Error connecting to Azure API: {str(e)}")
            print("\nTry using the Web API instead (see CLEANUP_GUIDE.md)")
            raise


def find_duplicates(team_leaders: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """Group team leaders by email to find duplicates"""
    email_groups = {}

    for tl in team_leaders:
        email = tl.get("email", "").strip().lower()
        if not email:
            continue

        if email not in email_groups:
            email_groups[email] = []
        email_groups[email].append(tl)

    # Filter to only duplicates
    return {email: tls for email, tls in email_groups.items() if len(tls) > 1}


async def delete_team_leader(team_leader_id: str) -> bool:
    """Delete a team leader from Azure"""
    async with httpx.AsyncClient(timeout=120.0) as client:  # Increased timeout
        try:
            response = await client.delete(f"{AZURE_API_URL}/api/team-leaders/{team_leader_id}")
            return response.status_code in [200, 204]
        except httpx.TimeoutException:
            print(f"\n  ⚠️  Timeout deleting {team_leader_id}")
            return False


async def main():
    print("=" * 80)
    print("CoSauce Portal - Duplicate Team Leader Cleanup Tool")
    print("=" * 80)
    print()

    # Fetch all team leaders
    print("Fetching team leaders from Azure...")
    team_leaders = await fetch_all_team_leaders()
    print(f"✓ Found {len(team_leaders)} total team leaders")
    print()

    # Count active/inactive
    active = [tl for tl in team_leaders if tl.get("is_active", True)]
    inactive = [tl for tl in team_leaders if not tl.get("is_active", True)]

    print(f"Active: {len(active)}")
    print(f"Inactive: {len(inactive)}")
    print()

    # Find duplicates
    duplicates = find_duplicates(team_leaders)

    if not duplicates:
        print("✓ No duplicate emails found!")
        print()
        if inactive:
            print(f"However, there are {len(inactive)} inactive team leaders:")
            print()
            for i, tl in enumerate(inactive, 1):
                print(f"{i}. {tl.get('name', 'Unknown')} ({tl.get('email', 'no email')})")
                print(f"   ID: {tl['id']}")
                print(f"   Status: {tl.get('status', 'N/A')}")
                if tl.get('account_names'):
                    print(f"   Accounts: {', '.join(tl['account_names'])}")
                print()
        return

    print(f"⚠️  Found {len(duplicates)} duplicate email(s):")
    print()

    # Display duplicates
    for email, tls in sorted(duplicates.items()):
        print(f"Email: {email} ({len(tls)} instances)")
        print("-" * 80)

        for i, tl in enumerate(tls, 1):
            print(f"  {i}. Name: {tl.get('name', 'Unknown')}")
            print(f"     ID: {tl['id']}")
            print(f"     Active: {tl.get('is_active', True)}")
            print(f"     Status: {tl.get('status', 'N/A')}")

            if tl.get('account_names'):
                print(f"     Accounts: {', '.join(tl['account_names'])}")
            else:
                print(f"     Accounts: None")

            if tl.get('created_at'):
                print(f"     Created: {tl['created_at']}")

            print()
        print()

    # Interactive cleanup
    print("=" * 80)
    print("Cleanup Options:")
    print("=" * 80)
    print()
    print("This tool can help you delete inactive/duplicate team leaders.")
    print("⚠️  WARNING: Deletions are permanent and cannot be undone!")
    print()

    response = input("Would you like to view deletion options? (yes/no): ").strip().lower()

    if response != "yes":
        print("Exiting without making changes.")
        return

    print()
    print("Suggested deletions (inactive duplicates):")
    print("-" * 80)

    suggested = []
    for email, tls in duplicates.items():
        # Keep the active one, suggest deleting inactive ones
        inactive_dups = [tl for tl in tls if not tl.get("is_active", True)]

        if inactive_dups:
            print(f"\nEmail: {email}")
            for tl in inactive_dups:
                suggested.append(tl)
                print(f"  ✗ DELETE: {tl.get('name')} (ID: {tl['id']}, Status: {tl.get('status')})")

    if not suggested:
        print("\n✓ No obvious inactive duplicates to delete.")
        return

    print()
    print(f"Total suggested deletions: {len(suggested)}")
    print()

    confirm = input("Delete these inactive duplicates? Type 'DELETE' to confirm: ").strip()

    if confirm != "DELETE":
        print("Cancelled. No changes made.")
        return

    print()
    print("Deleting...")
    deleted = 0
    failed = 0

    for tl in suggested:
        try:
            success = await delete_team_leader(tl['id'])
            if success:
                deleted += 1
                print(f"  ✓ Deleted: {tl.get('name')} ({tl['id']})")
            else:
                failed += 1
                print(f"  ✗ Failed: {tl.get('name')} ({tl['id']})")
        except Exception as e:
            failed += 1
            print(f"  ✗ Error deleting {tl.get('name')}: {str(e)}")

    print()
    print("=" * 80)
    print("Cleanup Complete!")
    print("=" * 80)
    print(f"Deleted: {deleted}")
    print(f"Failed: {failed}")
    print()


if __name__ == "__main__":
    asyncio.run(main())
