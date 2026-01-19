"""
Add Business Updates tables for daily metrics tracking and shift compliance.
Implements full Accounts → Team Leaders → Agents hierarchy.
"""
import aiosqlite
import asyncio
from pathlib import Path

# Database path - go up from app/database/ to backend/
DB_PATH = Path(__file__).parent.parent.parent / "data" / "portal.db"
SCHEMA_PATH = Path(__file__).parent / "schema_business_updates.sql"


async def migrate():
    """Run Business Updates schema migration."""
    async with aiosqlite.connect(DB_PATH) as db:
        # Read and execute the schema SQL
        schema_sql = SCHEMA_PATH.read_text()

        # Split by semicolon and execute each statement
        statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip()]

        for statement in statements:
            if statement:
                await db.execute(statement)

        await db.commit()

        # Verify tables were created
        cursor = await db.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name LIKE 'bu_%'
            ORDER BY name
        """)
        tables = await cursor.fetchall()

        print("✓ Business Updates schema migration complete!")
        print(f"✓ Created {len(tables)} tables:")
        for table in tables:
            print(f"  - {table[0]}")


async def main():
    print("Running migration: Business Updates")
    print("")
    await migrate()
    print("")
    print("Migration complete!")


if __name__ == "__main__":
    asyncio.run(main())
