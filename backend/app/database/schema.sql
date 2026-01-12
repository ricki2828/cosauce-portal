-- =============================================
-- CoSauce Portal Executive Dashboard Schema
-- Database: backend/data/portal.db
-- =============================================

-- Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'viewer',  -- admin, director, viewer
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_login TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    token_hash TEXT NOT NULL,  -- SHA256 of JWT
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT
);

-- Key Priorities
CREATE TABLE IF NOT EXISTS priorities (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    owner_id TEXT REFERENCES users(id),
    status TEXT DEFAULT 'active',  -- active, completed, deferred
    due_date TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS priority_updates (
    id TEXT PRIMARY KEY,
    priority_id TEXT NOT NULL REFERENCES priorities(id) ON DELETE CASCADE,
    author_id TEXT REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Sales Pipeline (5 configurable stages)
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL,
    color TEXT DEFAULT '#3B82F6',  -- Tailwind blue-500
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pipeline_deals (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    description TEXT,
    probability INTEGER DEFAULT 0,  -- 0-100%
    stage_id TEXT REFERENCES pipeline_stages(id),
    resource_requirements TEXT,  -- JSON: {"team_leaders": 1, "csa": 2}
    expected_value REAL,
    expected_close_date TEXT,
    owner_id TEXT REFERENCES users(id),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deal_history (
    id TEXT PRIMARY KEY,
    deal_id TEXT NOT NULL REFERENCES pipeline_deals(id) ON DELETE CASCADE,
    field_changed TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by TEXT REFERENCES users(id),
    changed_at TEXT DEFAULT (datetime('now'))
);

-- Campaign Performance (Local commentary for daily-business-update data)
CREATE TABLE IF NOT EXISTS campaign_commentary (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,  -- YYYY-MM-DD
    account_id TEXT,  -- References daily-update account (UUID stored as text)
    account_name TEXT,
    commentary TEXT,
    author_id TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(date, account_id)
);

-- People & Onboarding
CREATE TABLE IF NOT EXISTS team_members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT,  -- Team Leader, CSA, Manager
    account_id TEXT,  -- Which client account they work on
    start_date TEXT,
    status TEXT DEFAULT 'pending',  -- pending, onboarding, active, offboarded
    manager_id TEXT REFERENCES team_members(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS onboarding_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role_type TEXT,  -- Team Leader, CSA, etc.
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS onboarding_checklist_items (
    id TEXT PRIMARY KEY,
    template_id TEXT REFERENCES onboarding_templates(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_required INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS onboarding_progress (
    id TEXT PRIMARY KEY,
    team_member_id TEXT NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    checklist_item_id TEXT NOT NULL REFERENCES onboarding_checklist_items(id),
    completed INTEGER DEFAULT 0,
    completed_at TEXT,
    completed_by TEXT REFERENCES users(id),
    notes TEXT,
    UNIQUE(team_member_id, checklist_item_id)
);

-- Payables Workflow
CREATE TABLE IF NOT EXISTS payment_requests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    vendor_name TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'SGD',
    invoice_path TEXT,  -- Local file path
    invoice_filename TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending',  -- pending, approved, rejected, paid
    requested_by TEXT REFERENCES users(id),
    approved_by TEXT REFERENCES users(id),
    approved_at TEXT,
    rejection_reason TEXT,
    payment_date TEXT,
    payment_reference TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payment_comments (
    id TEXT PRIMARY KEY,
    payment_request_id TEXT NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,
    author_id TEXT REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Audit Log (for all executive dashboard actions)
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,  -- JSON
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_priorities_status ON priorities(status);
CREATE INDEX IF NOT EXISTS idx_priority_updates_priority ON priority_updates(priority_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON pipeline_deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deal_history_deal ON deal_history(deal_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_comments_request ON payment_comments(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_member ON onboarding_progress(team_member_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
