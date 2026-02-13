"""Seed cashflow_accounts table with chart of accounts from Excel structure.

Run: python backend/scripts/seed_cashflow_accounts.py
Safe to run multiple times - skips if accounts already exist.
"""

import sqlite3
import uuid
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "portal.db"

ACCOUNTS = [
    # Revenue - Client Revenue
    ("revenue", "Revenue", "Client Revenue", "2degrees", 10, 0),
    ("revenue", "Revenue", "Client Revenue", "Multichoice", 20, 0),
    ("revenue", "Revenue", "Client Revenue", "Certn", 30, 0),
    ("revenue", "Revenue", "Client Revenue", "Nectr", 40, 0),
    ("revenue", "Revenue", "Client Revenue", "NZME", 50, 0),
    ("revenue", "Revenue", "Client Revenue", "Yonder", 60, 0),
    ("revenue", "Revenue", "Client Revenue", "Simply BB", 70, 0),
    ("revenue", "Revenue", "Client Revenue", "Keep", 80, 0),
    ("revenue", "Revenue", "Client Revenue", "Wetility", 90, 0),
    ("revenue", "Revenue", "Client Revenue", "Snap Rentals", 100, 0),
    # Revenue - Total (computed)
    ("revenue", "Revenue", None, "Total Revenue", 999, 1),
    # Expenses - Operating Expenses
    ("expense", "Expenses", "Operating Expenses", "Salaries/Wages", 10, 0),
    ("expense", "Expenses", "Operating Expenses", "Rent", 20, 0),
    ("expense", "Expenses", "Operating Expenses", "Travel International", 30, 0),
    ("expense", "Expenses", "Operating Expenses", "Travel National", 40, 0),
    ("expense", "Expenses", "Operating Expenses", "Insurance", 50, 0),
    ("expense", "Expenses", "Operating Expenses", "Legal", 60, 0),
    ("expense", "Expenses", "Operating Expenses", "Recruitment", 70, 0),
    ("expense", "Expenses", "Operating Expenses", "Computer", 80, 0),
    ("expense", "Expenses", "Operating Expenses", "Consulting", 90, 0),
    ("expense", "Expenses", "Operating Expenses", "Bank Fees", 100, 0),
    ("expense", "Expenses", "Operating Expenses", "Cleaning", 110, 0),
    ("expense", "Expenses", "Operating Expenses", "Security", 120, 0),
    ("expense", "Expenses", "Operating Expenses", "Telephone", 130, 0),
    ("expense", "Expenses", "Operating Expenses", "Training", 140, 0),
    ("expense", "Expenses", "Operating Expenses", "Advertising", 150, 0),
    ("expense", "Expenses", "Operating Expenses", "General", 160, 0),
    # Expenses - Total (computed)
    ("expense", "Expenses", None, "Total Expenses", 999, 1),
    # Summary - manual entry
    ("summary", "Summary", None, "Bank Balance", 10, 0),
    ("summary", "Summary", None, "Net Cash Movement", 20, 0),
    ("summary", "Summary", None, "Operating Profit", 30, 0),
    ("summary", "Summary", None, "Earnings Before Tax", 40, 0),
]


def seed():
    conn = sqlite3.connect(str(DB_PATH))
    c = conn.cursor()

    # Check if already seeded
    c.execute("SELECT COUNT(*) FROM cashflow_accounts")
    count = c.fetchone()[0]
    if count > 0:
        print(f"cashflow_accounts already has {count} rows, skipping seed.")
        conn.close()
        return

    inserted = 0
    for account_type, category, subcategory, line_item, order, computed in ACCOUNTS:
        account_id = str(uuid.uuid4())
        c.execute(
            """INSERT INTO cashflow_accounts
            (id, account_type, category, subcategory, line_item, display_order, is_computed, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)""",
            (account_id, account_type, category, subcategory, line_item, order, computed),
        )
        inserted += 1

    conn.commit()
    conn.close()
    print(f"Seeded {inserted} cashflow accounts.")


if __name__ == "__main__":
    seed()
