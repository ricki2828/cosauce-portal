"""
Add team_leaders table for daily updates and admin cleanup functionality.
"""
import aiosqlite
import asyncio
from pathlib import Path

# Database path - go up from app/database/ to backend/
DB_PATH = Path(__file__).parent.parent.parent / "data" / "portal.db"


async def migrate():
    """Add team_leaders table."""
    async with aiosqlite.connect(DB_PATH) as db:
        # Create team_leaders table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS team_leaders (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                teams_user_id TEXT,
                teams_conversation_id TEXT,
                manager_id TEXT,
                shift_start TEXT,
                shift_end TEXT,
                timezone TEXT DEFAULT 'UTC',
                whatsapp_number TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)

        # Create index on email for duplicate detection
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_team_leaders_email
            ON team_leaders(email)
        """)

        # Create index on is_active for filtering
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_team_leaders_active
            ON team_leaders(is_active)
        """)

        await db.commit()
        print("✓ Created team_leaders table")
        print("✓ Created indexes")


async def main():
    print("Running migration: add_team_leaders")
    await migrate()
    print("Migration complete!")


if __name__ == "__main__":
    asyncio.run(main())
