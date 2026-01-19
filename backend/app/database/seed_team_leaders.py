"""
Seed team_leaders table with sample data including duplicates for testing.
"""
import aiosqlite
import asyncio
import uuid
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent.parent.parent / "data" / "portal.db"


async def seed():
    """Add sample team leaders with duplicates."""
    async with aiosqlite.connect(DB_PATH) as db:
        # Sample team leaders - includes duplicates
        team_leaders = [
            # Active team leaders
            {
                "id": str(uuid.uuid4()),
                "name": "Sarah Johnson",
                "email": "sarah.johnson@cosauce.co",
                "teams_user_id": "29:1AbCdEfG123",
                "teams_conversation_id": "19:abc123@thread.tacv2",
                "shift_start": "09:00",
                "shift_end": "17:00",
                "timezone": "America/Toronto",
                "whatsapp_number": "+1-416-555-0101",
                "is_active": 1
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Michael Chen",
                "email": "michael.chen@cosauce.co",
                "teams_user_id": "29:2XyZaBc456",
                "teams_conversation_id": "19:xyz456@thread.tacv2",
                "shift_start": "08:00",
                "shift_end": "16:00",
                "timezone": "America/Vancouver",
                "whatsapp_number": "+1-604-555-0102",
                "is_active": 1
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Emily Rodriguez",
                "email": "emily.rodriguez@cosauce.co",
                "teams_user_id": "29:3LmNoPq789",
                "teams_conversation_id": "19:lmn789@thread.tacv2",
                "shift_start": "10:00",
                "shift_end": "18:00",
                "timezone": "America/New_York",
                "whatsapp_number": "+1-212-555-0103",
                "is_active": 1
            },
            # Duplicate 1 - Sarah Johnson with different ID (older account)
            {
                "id": str(uuid.uuid4()),
                "name": "Sarah M. Johnson",
                "email": "sarah.johnson@cosauce.co",  # DUPLICATE EMAIL
                "teams_user_id": "29:4OlDaCc999",
                "teams_conversation_id": "19:old999@thread.tacv2",
                "shift_start": "09:00",
                "shift_end": "17:00",
                "timezone": "America/Toronto",
                "whatsapp_number": "+1-416-555-9999",
                "is_active": 0  # Inactive - likely old account
            },
            # Duplicate 2 - Michael Chen (typo in name)
            {
                "id": str(uuid.uuid4()),
                "name": "Mike Chen",
                "email": "michael.chen@cosauce.co",  # DUPLICATE EMAIL
                "teams_user_id": "29:5TeSt888",
                "teams_conversation_id": "19:test888@thread.tacv2",
                "shift_start": "08:00",
                "shift_end": "16:00",
                "timezone": "America/Vancouver",
                "whatsapp_number": None,
                "is_active": 1
            },
            # More active team leaders
            {
                "id": str(uuid.uuid4()),
                "name": "David Park",
                "email": "david.park@cosauce.co",
                "teams_user_id": "29:6DvDpRk321",
                "teams_conversation_id": "19:dvd321@thread.tacv2",
                "shift_start": "07:00",
                "shift_end": "15:00",
                "timezone": "America/Chicago",
                "whatsapp_number": "+1-312-555-0104",
                "is_active": 1
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Lisa Thompson",
                "email": "lisa.thompson@cosauce.co",
                "teams_user_id": "29:7LsThmp654",
                "teams_conversation_id": "19:lst654@thread.tacv2",
                "shift_start": "09:30",
                "shift_end": "17:30",
                "timezone": "America/Los_Angeles",
                "whatsapp_number": "+1-310-555-0105",
                "is_active": 1
            },
            # Inactive team leader (offboarded)
            {
                "id": str(uuid.uuid4()),
                "name": "John Smith",
                "email": "john.smith@cosauce.co",
                "teams_user_id": "29:8JhnSmt000",
                "teams_conversation_id": "19:jhn000@thread.tacv2",
                "shift_start": "09:00",
                "shift_end": "17:00",
                "timezone": "America/Toronto",
                "whatsapp_number": "+1-416-555-0000",
                "is_active": 0  # Inactive - offboarded
            },
            # Triple duplicate - test case
            {
                "id": str(uuid.uuid4()),
                "name": "Amanda Williams",
                "email": "amanda.williams@cosauce.co",
                "teams_user_id": "29:9AmWil111",
                "teams_conversation_id": "19:amw111@thread.tacv2",
                "shift_start": "08:30",
                "shift_end": "16:30",
                "timezone": "America/Toronto",
                "whatsapp_number": "+1-647-555-0106",
                "is_active": 1
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Amanda K Williams",
                "email": "amanda.williams@cosauce.co",  # DUPLICATE EMAIL
                "teams_user_id": "29:9AmWil222",
                "teams_conversation_id": "19:amw222@thread.tacv2",
                "shift_start": "08:30",
                "shift_end": "16:30",
                "timezone": "America/Toronto",
                "whatsapp_number": "+1-647-555-0107",
                "is_active": 1
            },
            {
                "id": str(uuid.uuid4()),
                "name": "A. Williams",
                "email": "amanda.williams@cosauce.co",  # DUPLICATE EMAIL
                "teams_user_id": None,
                "teams_conversation_id": None,
                "shift_start": None,
                "shift_end": None,
                "timezone": "UTC",
                "whatsapp_number": None,
                "is_active": 0  # Inactive - likely test account
            },
        ]

        # Insert all team leaders
        for tl in team_leaders:
            await db.execute(
                """
                INSERT INTO team_leaders (
                    id, name, email, teams_user_id, teams_conversation_id,
                    manager_id, shift_start, shift_end, timezone, whatsapp_number, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    tl["id"],
                    tl["name"],
                    tl["email"],
                    tl["teams_user_id"],
                    tl["teams_conversation_id"],
                    None,  # manager_id
                    tl["shift_start"],
                    tl["shift_end"],
                    tl["timezone"],
                    tl["whatsapp_number"],
                    tl["is_active"]
                )
            )

        await db.commit()

        # Print summary
        cursor = await db.execute("SELECT COUNT(*) FROM team_leaders")
        total = (await cursor.fetchone())[0]

        cursor = await db.execute("SELECT COUNT(*) FROM team_leaders WHERE is_active = 1")
        active = (await cursor.fetchone())[0]

        cursor = await db.execute("SELECT COUNT(*) FROM team_leaders WHERE is_active = 0")
        inactive = (await cursor.fetchone())[0]

        print(f"✓ Added {len(team_leaders)} sample team leaders")
        print(f"  Total: {total}")
        print(f"  Active: {active}")
        print(f"  Inactive: {inactive}")
        print("")
        print("Duplicate emails for testing:")
        print("  - sarah.johnson@cosauce.co (2 records)")
        print("  - michael.chen@cosauce.co (2 records)")
        print("  - amanda.williams@cosauce.co (3 records)")


async def main():
    print("Seeding team_leaders table...")
    print("")
    await seed()
    print("")
    print("Seed complete!")


if __name__ == "__main__":
    asyncio.run(main())
