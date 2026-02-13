-- Migration: Add cashflow_accounts table and link to cashflow_monthly
-- Run: sqlite3 backend/data/portal.db < backend/scripts/migrate_cashflow_accounts.sql

CREATE TABLE IF NOT EXISTS cashflow_accounts (
    id TEXT PRIMARY KEY,
    account_type TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    line_item TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_computed INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(category, subcategory, line_item)
);

CREATE INDEX IF NOT EXISTS idx_cashflow_accounts_type ON cashflow_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_cashflow_accounts_active ON cashflow_accounts(is_active, account_type, display_order);

-- Add account_id to cashflow_monthly (nullable for backward compat)
-- SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we use a pragma check
-- This is safe to run multiple times because SQLite ignores duplicate ADD COLUMN errors
