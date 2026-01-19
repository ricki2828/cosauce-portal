# Production Data Migration Guide

## Overview
This script exports data (comments, requisitions, etc.) from the production backend at `https://cosauce.taiaroa.xyz` and imports it into the Hetzner database.

## Prerequisites
- Valid production login credentials (email and password)
- Production API must be accessible

## Usage

### Test Connection (Dry Run)
First, test that you can connect and see what data will be migrated:

```bash
cd /home/ricki28/cosauce-portal/backend
./venv/bin/python migrate_production_data.py \
  --email your@email.com \
  --password yourpassword \
  --dry-run
```

### Full Migration
Once you've verified the dry run works, run the full migration:

```bash
cd /home/ricki28/cosauce-portal/backend
./venv/bin/python migrate_production_data.py \
  --email your@email.com \
  --password yourpassword
```

## What It Does

1. Logs into production API (https://cosauce.taiaroa.xyz)
2. Fetches all requisitions and their comments
3. Imports comments into local Hetzner database (`data/portal.db`)
4. Skips duplicates automatically
5. Verifies the import

## Notes

- Comments will only be imported if the corresponding requisition exists in the local database
- Duplicate comments (same content, requisition, and author) are automatically skipped
- The script preserves original comment IDs, authors, and timestamps
- Safe to run multiple times

## After Migration

1. Restart backend if needed
2. Verify comments appear in the frontend
3. Update frontend to permanently use Hetzner backend (already done via .env)
