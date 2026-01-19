-- Migration: Redesign Onboarding Checklist System
-- Remove template dependency and add default checklist with multi-stage items

BEGIN TRANSACTION;

-- Drop old template-based tables
DROP TABLE IF EXISTS onboarding_templates;

-- Clean up old checklist tables
DROP TABLE IF EXISTS onboarding_checklist_items;
DROP TABLE IF EXISTS onboarding_progress;

-- Create new onboarding checklist items table
CREATE TABLE IF NOT EXISTS onboarding_checklist_items (
    id TEXT PRIMARY KEY,
    team_member_id TEXT NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Create stages table for multi-stage checkboxes
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
);

-- Create default checklist template table
CREATE TABLE IF NOT EXISTS default_onboarding_checklist (
    id TEXT PRIMARY KEY,
    item_name TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    stages_json TEXT NOT NULL
);

-- Seed default checklist (9 items)
INSERT INTO default_onboarding_checklist (id, item_name, order_index, stages_json) VALUES
('chk-1', 'Resume', 1, '[{"label":"Received","category":"HR"},{"label":"Verified","category":"HR"},{"label":"Approved","category":"Approval"}]'),
('chk-2', 'Reference Check Form', 2, '[{"label":"Completed","category":"HR"},{"label":"Verified","category":"HR"},{"label":"Approved","category":"Approval"}]'),
('chk-3', 'Background Check (Educational/Criminal/Credit as applicable)', 3, '[{"label":"Pending","category":"HR"},{"label":"Verified","category":"HR"},{"label":"Approved","category":"Approval"}]'),
('chk-4', 'Additional Qualifications (If required)', 4, '[{"label":"Received","category":"HR"},{"label":"Verified","category":"HR"},{"label":"Approved","category":"Approval"}]'),
('chk-5', 'EEA1 Form', 5, '[{"label":"Pending","category":"HR"},{"label":"Received","category":"HR"},{"label":"Approved","category":"Approval"}]'),
('chk-6', 'Residence Proof', 6, '[{"label":"Received","category":"HR"},{"label":"Verified (if required)","category":"HR"},{"label":"Approved","category":"Approval"}]'),
('chk-7', 'ID Document', 7, '[{"label":"Received","category":"HR"},{"label":"Verified","category":"HR"},{"label":"Approved","category":"Approval"}]'),
('chk-8', 'Bank Details', 8, '[{"label":"Captured","category":"HR"},{"label":"Verified","category":"HR"},{"label":"Approved","category":"Approval"}]'),
('chk-9', 'Statutory Registrations (e.g., SARS/Tax, etc.)', 9, '[{"label":"Registered","category":"HR"},{"label":"Numbers verified","category":"HR"},{"label":"Approved","category":"Approval"}]');

COMMIT;
