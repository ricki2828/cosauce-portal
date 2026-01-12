-- =============================================
-- Requisition Roles Migration
-- Adds support for multiple role types per requisition
-- =============================================

-- 1. Create requisition_roles table for role lines
CREATE TABLE IF NOT EXISTS requisition_roles (
    id TEXT PRIMARY KEY,
    requisition_id TEXT NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
    role_type TEXT NOT NULL,           -- e.g., "Team Leader", "Agent", "Senior Agent"
    requested_count INTEGER NOT NULL DEFAULT 1,  -- How many requested
    filled_count INTEGER NOT NULL DEFAULT 0,     -- How many filled/hired
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_requisition_roles_requisition ON requisition_roles(requisition_id);

-- 2. Add comments field to requisitions
ALTER TABLE requisitions ADD COLUMN comments TEXT;

-- 3. Rename posted_date to requested_date for clarity (optional - we can use created_at)
-- We'll use created_at as "date requested" instead

-- 4. Migration: Convert existing requisitions to use role lines
-- This will move the title/headcount into a role line
-- Run this ONCE to migrate existing data:
-- INSERT INTO requisition_roles (id, requisition_id, role_type, requested_count, filled_count)
-- SELECT
--     lower(hex(randomblob(16))),
--     id,
--     title,
--     headcount,
--     CASE WHEN status = 'filled' THEN headcount ELSE 0 END
-- FROM requisitions
-- WHERE NOT EXISTS (SELECT 1 FROM requisition_roles WHERE requisition_id = requisitions.id);
