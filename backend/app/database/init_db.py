"""
Database initialization script for CoSauce Portal.
Creates portal.db and initializes schema with default data.
"""

import aiosqlite
import os
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent / "data" / "portal.db"
SCHEMA_PATH = Path(__file__).parent / "schema.sql"


async def init_database():
    """Initialize the database with schema and default data."""

    # Ensure data directory exists
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    # Create database and run schema
    async with aiosqlite.connect(DB_PATH) as db:
        # Read and execute schema
        schema_sql = SCHEMA_PATH.read_text()
        await db.executescript(schema_sql)

        # Insert default pipeline stages
        default_stages = [
            ('stage-1', 'Prospecting', 'Initial contact and lead qualification', 1, '#6366F1'),
            ('stage-2', 'Qualification', 'Needs assessment and fit validation', 2, '#8B5CF6'),
            ('stage-3', 'Proposal', 'Solution presentation and proposal delivery', 3, '#EC4899'),
            ('stage-4', 'Negotiation', 'Contract terms and pricing discussion', 4, '#F59E0B'),
            ('stage-5', 'Closed Won', 'Deal signed and won', 5, '#10B981'),
        ]

        for stage_id, name, description, sort_order, color in default_stages:
            await db.execute(
                """
                INSERT OR IGNORE INTO pipeline_stages (id, name, description, sort_order, color)
                VALUES (?, ?, ?, ?, ?)
                """,
                (stage_id, name, description, sort_order, color)
            )

        await db.commit()

    print(f"✅ Database initialized at {DB_PATH}")
    print(f"✅ Default pipeline stages created")


async def reset_database():
    """WARNING: Drops all tables and recreates from scratch."""
    if DB_PATH.exists():
        os.remove(DB_PATH)
        print(f"🗑️  Deleted existing database at {DB_PATH}")

    await init_database()


if __name__ == "__main__":
    import asyncio

    # Run initialization
    asyncio.run(init_database())
