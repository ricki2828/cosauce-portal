-- =============================================
-- People Module Schema Additions
-- Phase 3: Requisitions + Enhanced Onboarding
-- =============================================

-- Requisitions (new table for tracking open job positions)
CREATE TABLE IF NOT EXISTS requisitions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,              -- e.g., "Senior Developer"
    department TEXT NOT NULL,          -- e.g., "Engineering", "Sales"
    location TEXT,                     -- e.g., "Remote", "Singapore"
    employment_type TEXT NOT NULL,     -- full_time, part_time, contract
    status TEXT NOT NULL DEFAULT 'open', -- open, interviewing, offer_made, filled, cancelled
    headcount INTEGER DEFAULT 1,       -- Number of positions
    priority TEXT,                     -- low, medium, high, urgent
    description TEXT,                  -- Job description
    requirements TEXT,                 -- Key requirements (text or JSON array)
    posted_date TEXT,                  -- ISO date
    target_start_date TEXT,            -- ISO date
    filled_date TEXT,                  -- ISO date
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_requisitions_status ON requisitions(status);
CREATE INDEX IF NOT EXISTS idx_requisitions_department ON requisitions(department);

-- Enhancements to existing team_members table (for new hire tracking)
-- Note: team_members table already exists, we'll add columns via ALTER TABLE if needed
-- New fields needed: onboarding_template_id, full_name (currently just 'name')

-- Enhancements to existing onboarding_templates table
-- Note: Already has id, name, role_type, created_at
-- Need to add: description, created_by

-- Enhancements to existing onboarding_checklist_items table
-- Note: Already has id, template_id, title, description, sort_order
-- Need to add: category, day_offset, assigned_to_role, order_index (map to sort_order)

-- Enhancements to existing onboarding_progress table
-- Note: Already has id, team_member_id, checklist_item_id, completed, completed_at, completed_by, notes
-- Need to add: status (pending/in_progress/completed/blocked), due_date

-- Add missing columns to existing tables
-- (Run these ALTER TABLEs if columns don't exist)

-- 1. Add columns to onboarding_templates
ALTER TABLE onboarding_templates ADD COLUMN description TEXT;
ALTER TABLE onboarding_templates ADD COLUMN created_by TEXT REFERENCES users(id);
ALTER TABLE onboarding_templates ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));

-- 2. Add columns to onboarding_checklist_items
ALTER TABLE onboarding_checklist_items ADD COLUMN category TEXT;
ALTER TABLE onboarding_checklist_items ADD COLUMN day_offset INTEGER DEFAULT 0; -- Days after hire date
ALTER TABLE onboarding_checklist_items ADD COLUMN assigned_to_role TEXT; -- manager, hr, it, buddy

-- 3. Add columns to team_members (new hire tracking)
ALTER TABLE team_members ADD COLUMN onboarding_template_id TEXT REFERENCES onboarding_templates(id);
ALTER TABLE team_members ADD COLUMN department TEXT;

-- 4. Add columns to onboarding_progress
ALTER TABLE onboarding_progress ADD COLUMN status TEXT DEFAULT 'pending'; -- pending, in_progress, completed, blocked
ALTER TABLE onboarding_progress ADD COLUMN due_date TEXT; -- Calculated from start_date + day_offset
ALTER TABLE onboarding_progress ADD COLUMN task_title TEXT; -- Denormalized for easier querying
ALTER TABLE onboarding_progress ADD COLUMN task_description TEXT;
ALTER TABLE onboarding_progress ADD COLUMN category TEXT;
ALTER TABLE onboarding_progress ADD COLUMN assigned_to TEXT; -- User ID or role
ALTER TABLE onboarding_progress ADD COLUMN order_index INTEGER DEFAULT 0;

-- Update existing status values to match our spec
-- team_members.status: pending -> pending, onboarding -> active, active -> active, offboarded -> completed
-- Note: Migration will need to handle this

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_status ON onboarding_progress(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_due_date ON onboarding_progress(due_date);
CREATE INDEX IF NOT EXISTS idx_team_members_template ON team_members(onboarding_template_id);
