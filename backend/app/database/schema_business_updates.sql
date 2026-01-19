-- =============================================
-- Business Updates Schema
-- Daily metrics tracking and shift compliance system
-- =============================================

-- Accounts (Client Organizations)
CREATE TABLE IF NOT EXISTS bu_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    timezone TEXT DEFAULT 'UTC',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Junction table for Account-TeamLeader Many-to-Many relationship
CREATE TABLE IF NOT EXISTS bu_account_team_leaders (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES bu_accounts(id) ON DELETE CASCADE,
    team_leader_id TEXT NOT NULL REFERENCES team_leaders(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(account_id, team_leader_id)
);

-- Agents (Individual workers under team leaders)
CREATE TABLE IF NOT EXISTS bu_agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    account_id TEXT REFERENCES bu_accounts(id) ON DELETE CASCADE,
    team_leader_id TEXT NOT NULL REFERENCES team_leaders(id) ON DELETE CASCADE,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Configurable Metrics per Account
CREATE TABLE IF NOT EXISTS bu_metric_definitions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES bu_accounts(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    metric_type TEXT NOT NULL,  -- number, percentage, boolean, text
    description TEXT,
    is_required INTEGER DEFAULT 1,
    default_value TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(account_id, metric_name)
);

-- Daily Submissions (from team leaders)
CREATE TABLE IF NOT EXISTS bu_daily_submissions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES bu_accounts(id) ON DELETE CASCADE,
    team_leader_id TEXT NOT NULL REFERENCES team_leaders(id) ON DELETE CASCADE,
    agent_id TEXT REFERENCES bu_agents(id) ON DELETE SET NULL,  -- NULL for team-level, set for agent-level
    submission_date TEXT NOT NULL,  -- YYYY-MM-DD
    submission_level TEXT NOT NULL,  -- 'team' or 'agent'
    notes TEXT,
    submitted_at TEXT DEFAULT (datetime('now')),
    submitted_by TEXT REFERENCES users(id),  -- Portal user who submitted
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(account_id, team_leader_id, agent_id, submission_date)
);

-- Metric Values per Submission
CREATE TABLE IF NOT EXISTS bu_submission_metrics (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL REFERENCES bu_daily_submissions(id) ON DELETE CASCADE,
    metric_definition_id TEXT NOT NULL REFERENCES bu_metric_definitions(id) ON DELETE CASCADE,
    metric_value TEXT NOT NULL,  -- Store all values as text, convert based on metric_type
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(submission_id, metric_definition_id)
);

-- Shift Updates (SOS/EOS compliance tracking)
CREATE TABLE IF NOT EXISTS bu_shift_updates (
    id TEXT PRIMARY KEY,
    team_leader_id TEXT NOT NULL REFERENCES team_leaders(id) ON DELETE CASCADE,
    shift_type TEXT NOT NULL,  -- 'SOS' or 'EOS'
    shift_date TEXT NOT NULL,  -- YYYY-MM-DD
    submitted_at TEXT DEFAULT (datetime('now')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(team_leader_id, shift_type, shift_date)
);

-- End-of-Day Reports (aggregated summaries)
CREATE TABLE IF NOT EXISTS bu_eod_reports (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES bu_accounts(id) ON DELETE CASCADE,
    report_date TEXT NOT NULL,  -- YYYY-MM-DD
    total_agents INTEGER DEFAULT 0,
    total_submitted INTEGER DEFAULT 0,
    submission_rate REAL DEFAULT 0.0,
    summary_metrics TEXT,  -- JSON with aggregated metrics
    generated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(account_id, report_date)
);

-- Global Shift Settings
CREATE TABLE IF NOT EXISTS bu_shift_settings (
    id TEXT PRIMARY KEY,
    setting_name TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bu_account_team_leaders_account ON bu_account_team_leaders(account_id);
CREATE INDEX IF NOT EXISTS idx_bu_account_team_leaders_tl ON bu_account_team_leaders(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_bu_agents_team_leader ON bu_agents(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_bu_agents_active ON bu_agents(is_active);
CREATE INDEX IF NOT EXISTS idx_bu_metric_defs_account ON bu_metric_definitions(account_id);
CREATE INDEX IF NOT EXISTS idx_bu_metric_defs_active ON bu_metric_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_bu_submissions_account ON bu_daily_submissions(account_id);
CREATE INDEX IF NOT EXISTS idx_bu_submissions_team_leader ON bu_daily_submissions(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_bu_submissions_agent ON bu_daily_submissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_bu_submissions_date ON bu_daily_submissions(submission_date);
CREATE INDEX IF NOT EXISTS idx_bu_submissions_level ON bu_daily_submissions(submission_level);
CREATE INDEX IF NOT EXISTS idx_bu_submission_metrics_submission ON bu_submission_metrics(submission_id);
CREATE INDEX IF NOT EXISTS idx_bu_submission_metrics_definition ON bu_submission_metrics(metric_definition_id);
CREATE INDEX IF NOT EXISTS idx_bu_shift_updates_team_leader ON bu_shift_updates(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_bu_shift_updates_date ON bu_shift_updates(shift_date);
CREATE INDEX IF NOT EXISTS idx_bu_eod_reports_account ON bu_eod_reports(account_id);
CREATE INDEX IF NOT EXISTS idx_bu_eod_reports_date ON bu_eod_reports(report_date);
