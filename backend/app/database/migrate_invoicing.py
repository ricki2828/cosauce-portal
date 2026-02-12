"""
Database migration script for invoice tracking feature.

Creates three tables:
- invoices: one per client per month
- invoice_roles: line items (role name, rate, quantity)
- invoice_comments: comments on invoices
"""

import sqlite3
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent.parent.parent / "data" / "portal.db"


def run_migration():
    """Run the invoicing database migration."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        print("Creating invoices table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS invoices (
                id TEXT PRIMARY KEY,
                client_name TEXT NOT NULL,
                period_month INTEGER NOT NULL,
                period_year INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'gathering_data',
                currency TEXT DEFAULT 'NZD',
                notes TEXT,
                created_by TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                UNIQUE(client_name, period_month, period_year),
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        """)

        print("Creating invoice_roles table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS invoice_roles (
                id TEXT PRIMARY KEY,
                invoice_id TEXT NOT NULL,
                role_name TEXT NOT NULL,
                rate REAL NOT NULL DEFAULT 0,
                quantity REAL NOT NULL DEFAULT 0,
                sort_order INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
            )
        """)

        print("Creating invoice_comments table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS invoice_comments (
                id TEXT PRIMARY KEY,
                invoice_id TEXT NOT NULL,
                author_id TEXT,
                author_name TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
                FOREIGN KEY (author_id) REFERENCES users(id)
            )
        """)

        print("Creating indexes...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_invoices_period
            ON invoices(period_month, period_year)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_invoice_roles_invoice_id
            ON invoice_roles(invoice_id)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_invoice_comments_invoice_id
            ON invoice_comments(invoice_id)
        """)

        conn.commit()
        print("✓ Migration completed successfully!")
        print("Created tables: invoices, invoice_roles, invoice_comments")
        print("Created 3 indexes")

    except Exception as e:
        print(f"✗ Migration failed: {e}")
        conn.rollback()
        raise

    finally:
        conn.close()


if __name__ == "__main__":
    run_migration()
