"""
Add requisition_comments table and 'pending' status support
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent / "data" / "portal.db"

def migrate():
    """Add requisition_comments table"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("🔄 Adding requisition comments support...")

    try:
        # Create requisition_comments table
        print("  ➤ Creating requisition_comments table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS requisition_comments (
                id TEXT PRIMARY KEY,
                requisition_id TEXT NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
                author_id TEXT REFERENCES users(id),
                author_name TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)
        print("    ✓ Created requisition_comments table")

        # Create index
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_requisition_comments_requisition
            ON requisition_comments(requisition_id)
        """)
        print("    ✓ Created index on requisition_id")

        conn.commit()
        print("✅ Migration complete!")
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        return False

    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
