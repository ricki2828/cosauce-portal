-- Finance Module Tables: Payables + Cashflow
-- Run: sqlite3 backend/data/portal.db < backend/scripts/create_finance_tables.sql

-- ==================== PAYABLES ====================

CREATE TABLE IF NOT EXISTS payables (
    id TEXT PRIMARY KEY,
    vendor_name TEXT NOT NULL,
    item_description TEXT NOT NULL,
    assigned_to TEXT,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'NZD',
    due_date TEXT,
    category TEXT,
    priority TEXT DEFAULT 'medium',
    in_budget INTEGER DEFAULT 1,
    budget_notes TEXT,
    notes TEXT,
    attachment_path TEXT,
    attachment_filename TEXT,
    status TEXT DEFAULT 'pending',
    xero_bill_id TEXT,
    submitted_by TEXT NOT NULL REFERENCES users(id),
    approved_by TEXT REFERENCES users(id),
    approved_at TEXT,
    loaded_at TEXT,
    paid_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payable_comments (
    id TEXT PRIMARY KEY,
    payable_id TEXT NOT NULL REFERENCES payables(id) ON DELETE CASCADE,
    author_id TEXT REFERENCES users(id),
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payable_status_history (
    id TEXT PRIMARY KEY,
    payable_id TEXT NOT NULL REFERENCES payables(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by TEXT NOT NULL REFERENCES users(id),
    notes TEXT,
    changed_at TEXT DEFAULT (datetime('now'))
);

-- ==================== CASHFLOW ====================

CREATE TABLE IF NOT EXISTS cashflow_monthly (
    id TEXT PRIMARY KEY,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    line_item TEXT,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'ZAR',
    is_actual INTEGER DEFAULT 1,
    notes TEXT,
    source TEXT DEFAULT 'excel_import',
    imported_at TEXT DEFAULT (datetime('now')),
    UNIQUE(year, month, category, subcategory, line_item)
);

CREATE TABLE IF NOT EXISTS cashflow_daily (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    line_item TEXT,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'ZAR',
    description TEXT,
    is_actual INTEGER DEFAULT 1,
    source TEXT DEFAULT 'manual_entry',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(date, category, line_item)
);

CREATE TABLE IF NOT EXISTS fx_rates (
    id TEXT PRIMARY KEY,
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    rate REAL NOT NULL,
    effective_date TEXT NOT NULL,
    source TEXT DEFAULT 'manual',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(from_currency, to_currency, effective_date)
);

CREATE TABLE IF NOT EXISTS cashflow_imports (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    import_type TEXT NOT NULL,
    rows_imported INTEGER,
    period_start TEXT,
    period_end TEXT,
    imported_by TEXT NOT NULL REFERENCES users(id),
    imported_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_payables_status ON payables(status);
CREATE INDEX IF NOT EXISTS idx_payables_submitted_by ON payables(submitted_by);
CREATE INDEX IF NOT EXISTS idx_payable_comments_payable_id ON payable_comments(payable_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_monthly_period ON cashflow_monthly(year, month);
CREATE INDEX IF NOT EXISTS idx_cashflow_daily_date ON cashflow_daily(date);
