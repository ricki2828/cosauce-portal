#!/usr/bin/env python3
"""
Migration script for People Module (Phase 3)
Adds requisitions table and enhances existing onboarding tables
"""

import sqlite3
import os
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent.parent.parent / "data" / "portal.db"

def run_migration():
    """Apply People Module schema additions"""

    if not DB_PATH.exists():
        print(f"❌ Database not found at {DB_PATH}")
        print("   Run init_db.py first to create the database")
        return False

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("🔄 Running People Module migration...")

    try:
        # 1. Create requisitions table
        print("  ➤ Creating requisitions table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS requisitions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                department TEXT NOT NULL,
                location TEXT,
                employment_type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'open',
                headcount INTEGER DEFAULT 1,
                priority TEXT,
                description TEXT,
                requirements TEXT,
                posted_date TEXT,
                target_start_date TEXT,
                filled_date TEXT,
                created_by TEXT NOT NULL REFERENCES users(id),
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)

        # 2. Add columns to onboarding_templates (gracefully handle existing columns)
        print("  ➤ Enhancing onboarding_templates...")
        for col_def in [
            ("description", "TEXT"),
            ("created_by", "TEXT REFERENCES users(id)"),
            ("updated_at", "TEXT DEFAULT (datetime('now'))")
        ]:
            try:
                cursor.execute(f"ALTER TABLE onboarding_templates ADD COLUMN {col_def[0]} {col_def[1]}")
                print(f"    ✓ Added column: {col_def[0]}")
            except sqlite3.OperationalError as e:
                if "duplicate column" in str(e).lower():
                    print(f"    ⊙ Column already exists: {col_def[0]}")
                else:
                    raise

        # 3. Add columns to onboarding_checklist_items
        print("  ➤ Enhancing onboarding_checklist_items...")
        for col_def in [
            ("category", "TEXT"),
            ("day_offset", "INTEGER DEFAULT 0"),
            ("assigned_to_role", "TEXT")
        ]:
            try:
                cursor.execute(f"ALTER TABLE onboarding_checklist_items ADD COLUMN {col_def[0]} {col_def[1]}")
                print(f"    ✓ Added column: {col_def[0]}")
            except sqlite3.OperationalError as e:
                if "duplicate column" in str(e).lower():
                    print(f"    ⊙ Column already exists: {col_def[0]}")
                else:
                    raise

        # 4. Add columns to team_members
        print("  ➤ Enhancing team_members...")
        for col_def in [
            ("onboarding_template_id", "TEXT REFERENCES onboarding_templates(id)"),
            ("department", "TEXT")
        ]:
            try:
                cursor.execute(f"ALTER TABLE team_members ADD COLUMN {col_def[0]} {col_def[1]}")
                print(f"    ✓ Added column: {col_def[0]}")
            except sqlite3.OperationalError as e:
                if "duplicate column" in str(e).lower():
                    print(f"    ⊙ Column already exists: {col_def[0]}")
                else:
                    raise

        # 5. Add columns to onboarding_progress
        print("  ➤ Enhancing onboarding_progress...")
        for col_def in [
            ("status", "TEXT DEFAULT 'pending'"),
            ("due_date", "TEXT"),
            ("task_title", "TEXT"),
            ("task_description", "TEXT"),
            ("category", "TEXT"),
            ("assigned_to", "TEXT"),
            ("order_index", "INTEGER DEFAULT 0")
        ]:
            try:
                cursor.execute(f"ALTER TABLE onboarding_progress ADD COLUMN {col_def[0]} {col_def[1]}")
                print(f"    ✓ Added column: {col_def[0]}")
            except sqlite3.OperationalError as e:
                if "duplicate column" in str(e).lower():
                    print(f"    ⊙ Column already exists: {col_def[0]}")
                else:
                    raise

        # 6. Create requisition_roles table for multi-role support
        print("  ➤ Creating requisition_roles table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS requisition_roles (
                id TEXT PRIMARY KEY,
                requisition_id TEXT NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
                role_type TEXT NOT NULL,
                requested_count INTEGER NOT NULL DEFAULT 1,
                filled_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)
        print("    ✓ Created requisition_roles table")

        # 7. Add comments column to requisitions
        print("  ➤ Adding comments to requisitions...")
        try:
            cursor.execute("ALTER TABLE requisitions ADD COLUMN comments TEXT")
            print("    ✓ Added column: comments")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print("    ⊙ Column already exists: comments")
            else:
                raise

        # 8. Create indexes
        print("  ➤ Creating indexes...")
        indexes = [
            ("idx_requisitions_status", "requisitions", "status"),
            ("idx_requisitions_department", "requisitions", "department"),
            ("idx_requisition_roles_requisition", "requisition_roles", "requisition_id"),
            ("idx_onboarding_progress_status", "onboarding_progress", "status"),
            ("idx_onboarding_progress_due_date", "onboarding_progress", "due_date"),
            ("idx_team_members_template", "team_members", "onboarding_template_id")
        ]

        for idx_name, table, column in indexes:
            cursor.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table}({column})")
            print(f"    ✓ Created index: {idx_name}")

        # Commit all changes
        conn.commit()
        print("✅ People Module migration completed successfully")
        return True

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = run_migration()
    exit(0 if success else 1)
