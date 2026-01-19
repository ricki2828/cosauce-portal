# CoSauce Portal - Duplicate & Inactive Data Cleanup Guide

## Problem

You're getting the error: **"Failed to save team leader - email may already exist in selected accounts"**

This happens because:
1. Team leaders and accounts are stored in the **Azure Daily Business Update API** (not in the portal database)
2. Inactive/offboarded team leaders still exist in Azure with their email addresses
3. When you try to create a new team leader with an existing email, Azure rejects it
4. There's no easy way to see or delete these inactive records

## Solution

We've added **Admin Cleanup Tools** that let you:
- View all team leaders (including inactive ones)
- Find duplicate emails
- Permanently delete inactive/duplicate team leaders
- See which accounts each team leader is associated with

---

## Option 1: Web API (FastAPI Swagger UI)

### Access the Admin API

1. **Start the CoSauce Portal** (it should already be running)

2. **Open API Documentation:**
   ```
   http://localhost:8004/docs
   ```
   Or if deployed:
   ```
   https://your-domain.com/docs
   ```

3. **Authenticate as Admin:**
   - Click "Authorize" button (top right)
   - Login with your admin credentials
   - Click "Authorize" to save the token

### Available Admin Endpoints

All endpoints are under **Admin Cleanup** section:

#### 1. Get Cleanup Statistics
```
GET /api/admin/cleanup/stats
```
Shows:
- Total team leaders
- Active vs inactive count
- Number of duplicate email groups
- Total duplicate records

#### 2. Find Duplicate Emails
```
GET /api/admin/cleanup/team-leaders/duplicates
```
Returns groups of team leaders sharing the same email address.

Parameters:
- `include_inactive` (default: true) - Whether to include inactive team leaders

#### 3. List Inactive Team Leaders
```
GET /api/admin/cleanup/team-leaders/inactive
```
Shows all inactive/offboarded team leaders that are candidates for deletion.

#### 4. List ALL Team Leaders
```
GET /api/admin/cleanup/team-leaders/all
```
Shows every team leader in the system (active and inactive).

#### 5. Find Team Leaders by Email
```
GET /api/admin/cleanup/team-leaders/by-email/{email}
```
Finds all team leaders with a specific email address.

Example:
```
GET /api/admin/cleanup/team-leaders/by-email/john@example.com
```

#### 6. Permanently Delete a Team Leader
```
DELETE /api/admin/cleanup/team-leaders/{team_leader_id}?confirm=true
```

⚠️ **WARNING:** This permanently deletes the team leader and CANNOT be undone!

Parameters:
- `team_leader_id` - The ID of the team leader to delete
- `confirm` - Must be set to `true` to actually delete

#### 7. Bulk Delete Multiple Team Leaders
```
POST /api/admin/cleanup/team-leaders/bulk-delete
```

Request body:
```json
{
  "team_leader_ids": [
    "tl_abc123",
    "tl_def456",
    "tl_ghi789"
  ],
  "confirm": true
}
```

⚠️ **WARNING:** This permanently deletes multiple team leaders and CANNOT be undone!

---

## Option 2: CLI Script (Command Line)

For a more interactive experience, use the CLI cleanup script.

### Run the Cleanup Script

```bash
cd /home/ricki28/cosauce-portal/backend
source venv/bin/activate
python scripts/cleanup_duplicates.py
```

### What the Script Does

1. **Fetches all team leaders** from Azure
2. **Shows statistics** (active vs inactive)
3. **Identifies duplicates** by email address
4. **Displays details** for each duplicate group:
   - Name, ID, Active status
   - Which accounts they're associated with
   - Creation date
5. **Suggests deletions** (inactive duplicates)
6. **Interactively confirms** before deleting anything

### Example Output

```
================================================================================
CoSauce Portal - Duplicate Team Leader Cleanup Tool
================================================================================

Fetching team leaders from Azure...
✓ Found 47 total team leaders

Active: 42
Inactive: 5

⚠️  Found 2 duplicate email(s):

Email: john.doe@example.com (2 instances)
--------------------------------------------------------------------------------
  1. Name: John Doe
     ID: tl_abc123
     Active: True
     Status: active
     Accounts: ClientA, ClientB
     Created: 2024-01-15T10:30:00Z

  2. Name: John Doe (Old)
     ID: tl_xyz789
     Active: False
     Status: offboarded
     Accounts: None
     Created: 2023-06-20T14:20:00Z

================================================================================
Cleanup Options:
================================================================================

This tool can help you delete inactive/duplicate team leaders.
⚠️  WARNING: Deletions are permanent and cannot be undone!

Would you like to view deletion options? (yes/no): yes

Suggested deletions (inactive duplicates):
--------------------------------------------------------------------------------

Email: john.doe@example.com
  ✗ DELETE: John Doe (Old) (ID: tl_xyz789, Status: offboarded)

Total suggested deletions: 1

Delete these inactive duplicates? Type 'DELETE' to confirm: DELETE

Deleting...
  ✓ Deleted: John Doe (Old) (tl_xyz789)

================================================================================
Cleanup Complete!
================================================================================
Deleted: 1
Failed: 0
```

---

## Recommended Workflow

### When You Get "Email Already Exists" Error

1. **Identify the duplicate:**
   ```bash
   # Using CLI
   python scripts/cleanup_duplicates.py

   # OR using API
   GET /api/admin/cleanup/team-leaders/by-email/problematic@email.com
   ```

2. **Check which ones are inactive:**
   - Look for `is_active: False` or `status: offboarded`
   - Verify they have no current account assignments

3. **Delete the inactive duplicate:**
   ```bash
   # Using CLI (interactive)
   python scripts/cleanup_duplicates.py

   # OR using API
   DELETE /api/admin/cleanup/team-leaders/{inactive_id}?confirm=true
   ```

4. **Try creating the team leader again**

### Regular Maintenance

Run the cleanup script monthly to:
- Identify inactive team leaders
- Remove orphaned/duplicate records
- Keep the database clean

```bash
cd /home/ricki28/cosauce-portal/backend
source venv/bin/activate
python scripts/cleanup_duplicates.py
```

---

## Safety Features

✅ **Read-only by default** - All GET endpoints are safe to use

✅ **Confirmation required** - Deletions require explicit `confirm=true` parameter

✅ **Admin-only access** - Only users with admin role can access cleanup endpoints

✅ **Detailed logging** - Shows exactly what will be deleted before confirmation

✅ **Error handling** - Failed deletions don't stop the process

⚠️ **No undo** - Once deleted, team leaders cannot be recovered from Azure

---

## Troubleshooting

### "Failed to fetch team leaders from Azure"

- Check that `AZURE_DAILY_UPDATE_API_URL` is set correctly in `/home/ricki28/cosauce-portal/backend/.env`
- Verify the Azure API is running: `https://daily-update-api.azurewebsites.net/api/team-leaders`
- Check network connectivity

### "Unauthorized" Error

- Make sure you're logged in as an admin user
- Re-authenticate in the Swagger UI (/docs)
- Check that your JWT token hasn't expired

### Script Won't Run

```bash
# Make sure you're in the virtual environment
cd /home/ricki28/cosauce-portal/backend
source venv/bin/activate

# Check dependencies are installed
pip install httpx

# Run the script
python scripts/cleanup_duplicates.py
```

---

## API Response Examples

### Get Cleanup Stats

**Request:**
```
GET /api/admin/cleanup/stats
```

**Response:**
```json
{
  "total_team_leaders": 47,
  "active_team_leaders": 42,
  "inactive_team_leaders": 5,
  "duplicate_email_groups": 2,
  "total_duplicates": 2
}
```

### Find Duplicates

**Request:**
```
GET /api/admin/cleanup/team-leaders/duplicates
```

**Response:**
```json
[
  {
    "email": "john.doe@example.com",
    "count": 2,
    "team_leaders": [
      {
        "id": "tl_abc123",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "is_active": true,
        "status": "active",
        "account_names": ["ClientA", "ClientB"]
      },
      {
        "id": "tl_xyz789",
        "name": "John Doe (Old)",
        "email": "john.doe@example.com",
        "is_active": false,
        "status": "offboarded",
        "account_names": []
      }
    ]
  }
]
```

---

## Questions?

- Check the API documentation at `/docs` when the portal is running
- Review the code in `/home/ricki28/cosauce-portal/backend/app/api/admin_cleanup.py`
- Test endpoints in the Swagger UI before using in production
