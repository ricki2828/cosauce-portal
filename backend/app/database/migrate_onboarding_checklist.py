"""
Migration: Redesign Onboarding Checklist System
- Remove template dependency
- Add default checklist with multi-stage items
- Support per-hire customization
"""

import asyncio
import aiosqlite
from pathlib import Path
import json

DATA_DIR = Path(__file__).parent.parent.parent / "data"

DEFAULT_CHECKLIST = [
    {
        "item_name": "Resume",
        "order_index": 1,
        "stages": [
            {"label": "Received", "category": "HR"},
            {"label": "Verified", "category": "HR"},
            {"label": "Approved", "category": "Approval"}
        ]
    },
    {
        "item_name": "Reference Check Form",
        "order_index": 2,
        "stages": [
            {"label": "Completed", "category": "HR"},
            {"label": "Verified", "category": "HR"},
            {"label": "Approved", "category": "Approval"}
        ]
    },
    {
        "item_name": "Background Check (Educational/Criminal/Credit as applicable)",
        "order_index": 3,
        "stages": [
            {"label": "Pending", "category": "HR"},
            {"label": "Verified", "category": "HR"},
            {"label": "Approved", "category": "Approval"}
        ]
    },
    {
        "item_name": "Additional Qualifications (If required)",
        "order_index": 4,
        "stages": [
            {"label": "Received", "category": "HR"},
            {"label": "Verified", "category": "HR"},
            {"label": "Approved", "category": "Approval"}
        ]
    },
    {
        "item_name": "EEA1 Form",
        "order_index": 5,
        "stages": [
            {"label": "Pending", "category": "HR"},
            {"label": "Received", "category": "HR"},
            {"label": "Approved", "category": "Approval"}
        ]
    },
    {
        "item_name": "Residence Proof",
        "order_index": 6,
        "stages": [
            {"label": "Received", "category": "HR"},
            {"label": "Verified (if required)", "category": "HR"},
            {"label": "Approved", "category": "Approval"}
        ]
    },
    {
        "item_name": "ID Document",
        "order_index": 7,
        "stages": [
            {"label": "Received", "category": "HR"},
            {"label": "Verified", "category": "HR"},
            {"label": "Approved", "category": "Approval"}
        ]
    },
    {
        "item_name": "Bank Details",
        "order_index": 8,
        "stages": [
            {"label": "Captured", "category": "HR"},
            {"label": "Verified", "category": "HR"},
            {"label": "Approved", "category": "Approval"}
        ]
    },
    {
        "item_name": "Statutory Registrations (e.g., SARS/Tax, etc.)",
        "order_index": 9,
        "stages": [
            {"label": "Registered", "category": "HR"},
            {"label": "Numbers verified", "category": "HR"},
            {"label": "Approved", "category": "Approval"}
        ]
    }
]

async def migrate():
    db_path = DATA_DIR / "portal.db"

    async with aiosqlite.connect(db_path) as db:
        print("🔄 Starting onboarding checklist migration...")

        # Drop old template-based tables
        print("  - Dropping old onboarding_templates table...")
        await db.execute("DROP TABLE IF EXISTS onboarding_templates")

        # Rename old onboarding_checklist_items if it exists
        print("  - Cleaning up old checklist tables...")
        await db.execute("DROP TABLE IF EXISTS onboarding_checklist_items")
        await db.execute("DROP TABLE IF EXISTS onboarding_progress")

        # Create new onboarding checklist items table
        print("  - Creating new onboarding_checklist_items table...")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS onboarding_checklist_items (
                id TEXT PRIMARY KEY,
                team_member_id TEXT NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
                item_name TEXT NOT NULL,
                order_index INTEGER NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)

        # Create stages table for multi-stage checkboxes
        print("  - Creating onboarding_checklist_stages table...")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS onboarding_checklist_stages (
                id TEXT PRIMARY KEY,
                checklist_item_id TEXT NOT NULL REFERENCES onboarding_checklist_items(id) ON DELETE CASCADE,
                stage_label TEXT NOT NULL,
                stage_category TEXT,
                stage_order INTEGER NOT NULL,
                is_completed INTEGER DEFAULT 0,
                completed_at TEXT,
                completed_by TEXT REFERENCES users(id),
                notes TEXT
            )
        """)

        # Create default checklist template (stored as JSON for easy loading)
        print("  - Creating default_onboarding_checklist table...")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS default_onboarding_checklist (
                id TEXT PRIMARY KEY,
                item_name TEXT NOT NULL,
                order_index INTEGER NOT NULL,
                stages_json TEXT NOT NULL
            )
        """)

        # Seed default checklist
        print("  - Seeding default checklist...")
        for item in DEFAULT_CHECKLIST:
            import uuid
            item_id = str(uuid.uuid4())
            await db.execute("""
                INSERT INTO default_onboarding_checklist (id, item_name, order_index, stages_json)
                VALUES (?, ?, ?, ?)
            """, (item_id, item["item_name"], item["order_index"], json.dumps(item["stages"])))

        # Update team_members to remove onboarding_template_id if it exists
        print("  - Checking team_members table schema...")
        cursor = await db.execute("PRAGMA table_info(team_members)")
        columns = await cursor.fetchall()
        column_names = [col[1] for col in columns]

        if "onboarding_template_id" in column_names:
            print("  - Note: onboarding_template_id column exists in team_members (will be ignored)")

        await db.commit()
        print("✅ Migration completed successfully!")
        print(f"   - Default checklist: {len(DEFAULT_CHECKLIST)} items seeded")
        print("   - Ready to create onboarding entries with customizable checklists")

if __name__ == "__main__":
    asyncio.run(migrate())
