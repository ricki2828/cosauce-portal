#!/usr/bin/env python3
"""
Script to export data from production API and import to Hetzner database.

Usage:
    python migrate_production_data.py --email your@email.com --password yourpassword
"""

import argparse
import asyncio
import aiosqlite
import httpx
from datetime import datetime
import uuid


PRODUCTION_API = "https://cosauce.taiaroa.xyz"
LOCAL_DB = "data/portal.db"


async def export_from_production(email: str, password: str):
    """Export data from production API."""
    print(f"🔐 Logging into production API ({PRODUCTION_API})...")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Login
        login_response = await client.post(
            f"{PRODUCTION_API}/api/auth/login",
            json={"email": email, "password": password}
        )

        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.text}")
            return None

        auth_data = login_response.json()
        token = auth_data.get("access_token")
        print(f"✅ Logged in successfully")

        headers = {"Authorization": f"Bearer {token}"}

        # Export requisition comments
        print(f"\n📥 Fetching requisition comments from production...")
        comments_response = await client.get(
            f"{PRODUCTION_API}/api/people/requisitions",
            headers=headers
        )

        if comments_response.status_code != 200:
            print(f"❌ Failed to fetch requisitions: {comments_response.text}")
            return None

        requisitions = comments_response.json()

        # Collect all comments
        all_comments = []
        for req in requisitions:
            req_id = req["id"]

            # Get detailed requisition with comments
            detail_response = await client.get(
                f"{PRODUCTION_API}/api/people/requisitions/{req_id}",
                headers=headers
            )

            if detail_response.status_code == 200:
                detail = detail_response.json()
                comments = detail.get("comments", [])

                if comments:
                    print(f"  Found {len(comments)} comment(s) for requisition: {req.get('title', req_id)}")
                    for comment in comments:
                        if isinstance(comment, dict):
                            comment["requisition_id"] = req_id
                            comment["requisition_title"] = req.get("title", "Unknown")
                            all_comments.append(comment)
                        else:
                            print(f"  ⚠️  Skipping non-dict comment: {type(comment)}")

        print(f"\n✅ Total comments found: {len(all_comments)}")
        return {
            "comments": all_comments,
            "requisitions": requisitions
        }


async def import_to_local(data):
    """Import data to local Hetzner database."""
    if not data or not data.get("comments"):
        print("⚠️  No comments to import")
        return

    comments = data["comments"]

    print(f"\n💾 Importing {len(comments)} comments to local database...")

    async with aiosqlite.connect(LOCAL_DB) as db:
        imported = 0
        skipped = 0

        for comment in comments:
            # Check if comment already exists (by content + requisition_id to avoid duplicates)
            cursor = await db.execute(
                """
                SELECT id FROM requisition_comments
                WHERE requisition_id = ? AND content = ? AND author_email = ?
                """,
                (
                    comment.get("requisition_id"),
                    comment.get("content"),
                    comment.get("author_email")
                )
            )
            existing = await cursor.fetchone()

            if existing:
                skipped += 1
                continue

            # Check if requisition exists in local database
            cursor = await db.execute(
                "SELECT id FROM requisitions WHERE id = ?",
                (comment.get("requisition_id"),)
            )
            req_exists = await cursor.fetchone()

            if not req_exists:
                print(f"  ⚠️  Skipping comment for non-existent requisition: {comment.get('requisition_title')}")
                skipped += 1
                continue

            # Insert comment
            comment_id = comment.get("id") or str(uuid.uuid4())

            await db.execute(
                """
                INSERT INTO requisition_comments (
                    id, requisition_id, content, author_email, author_name, created_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    comment_id,
                    comment.get("requisition_id"),
                    comment.get("content"),
                    comment.get("author_email"),
                    comment.get("author_name"),
                    comment.get("created_at") or datetime.utcnow().isoformat()
                )
            )
            imported += 1
            print(f"  ✅ Imported comment for: {comment.get('requisition_title')}")

        await db.commit()

        print(f"\n✅ Import complete!")
        print(f"   - Imported: {imported}")
        print(f"   - Skipped (duplicates/invalid): {skipped}")

        # Verify
        cursor = await db.execute("SELECT COUNT(*) FROM requisition_comments")
        total = (await cursor.fetchone())[0]
        print(f"   - Total comments in database: {total}")


async def main():
    parser = argparse.ArgumentParser(description="Migrate production data to Hetzner database")
    parser.add_argument("--email", required=True, help="Production login email")
    parser.add_argument("--password", required=True, help="Production login password")
    parser.add_argument("--dry-run", action="store_true", help="Only export, don't import")

    args = parser.parse_args()

    print("=" * 60)
    print("CoSauce Portal - Production Data Migration")
    print("=" * 60)

    # Export from production
    data = await export_from_production(args.email, args.password)

    if not data:
        print("\n❌ Export failed. Exiting.")
        return 1

    if args.dry_run:
        print("\n🔍 Dry run mode - not importing to database")
        print(f"Would import {len(data.get('comments', []))} comments")
        return 0

    # Import to local
    await import_to_local(data)

    print("\n" + "=" * 60)
    print("✅ Migration complete!")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    exit(asyncio.run(main()))
