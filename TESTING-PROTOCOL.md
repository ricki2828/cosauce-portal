# CoSauce Portal Testing Protocol

This document defines the testing protocol for CoSauce Portal to catch errors before deployment.

## Test Levels

### 1. Unit Tests (Backend)
Located in: `/backend/tests/`

```bash
cd ~/cosauce-portal/backend
source venv/bin/activate
pytest -v
```

**Coverage**: Individual functions, API endpoints, data models

### 2. Integration Tests (Full Stack)
Test the complete flow: Frontend → Cloudflare Tunnel → Backend → Azure API

#### Prerequisites
- Backend running on port 8004
- Cloudflare tunnel running (personal-os tunnel)
- Azure backend healthy

#### Manual Test Commands

```bash
# 1. Test local backend
curl http://localhost:8004/health
# Expected: {"status":"healthy","service":"cosauce-platform"}

# 2. Test through Cloudflare tunnel
curl https://cosauce.taiaroa.xyz/health
# Expected: {"status":"healthy","service":"cosauce-platform"}

# 3. Test Azure backend
curl https://daily-update-api.azurewebsites.net/health
# Expected: {"status":"healthy","version":"1.0.0"}

# 4. Test account creation (Azure direct)
curl -X POST "https://daily-update-api.azurewebsites.net/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Account",
    "code": "TEST123",
    "prompt_time": "09:00",
    "deadline_time": "17:00",
    "timezone": "Australia/Sydney"
  }'
# Expected: HTTP 201 with account JSON

# 5. Test duplicate prevention
# (Re-run same command from #4)
# Expected: HTTP 400 with error: "Account with code 'TEST123' already exists"
```

### 3. Pre-Deployment Checklist

**Before deploying ANY backend changes:**

- [ ] Run unit tests: `pytest -v`
- [ ] Test local health endpoint: `curl http://localhost:8004/health`
- [ ] Test Cloudflare tunnel: `curl https://cosauce.taiaroa.xyz/health`
- [ ] Test Azure backend: `curl https://daily-update-api.azurewebsites.net/health`
- [ ] Test account creation (Azure direct)
- [ ] Test account listing (Azure direct)
- [ ] Verify backend logs have no errors: `tail -50 /tmp/cosauce-backend.log`

**After deploying backend changes to Azure:**

- [ ] Wait 60 seconds for deployment to complete
- [ ] Test Azure health: `curl https://daily-update-api.azurewebsites.net/health`
- [ ] Test account creation through Azure
- [ ] Check Azure logs: `az webapp log tail --name daily-update-api --resource-group daily-update-rg`
- [ ] Test from frontend UI (logged in as test user)

### 4. Common Error Scenarios

| Error | Symptom | Diagnosis | Fix |
|-------|---------|-----------|-----|
| **500 Internal Server Error** | Account creation fails | Check Azure logs for Python traceback | Fix syntax error, redeploy |
| **401 Unauthorized** | API returns "Not authenticated" | User not logged in | Login first OR test Azure direct |
| **400 Duplicate** | "Account already exists" | Trying to create account with existing code | Use different code OR delete old account |
| **Tunnel Not Working** | cosauce.taiaroa.xyz returns timeout | Cloudflare tunnel not running | Start tunnel: `~/bin/cloudflared tunnel run personal-os` |
| **Backend Not Running** | localhost:8004 refuses connection | CoSauce backend stopped | Start: `cd ~/cosauce-portal/backend && source venv/bin/activate && nohup python run.py > /tmp/cosauce-backend.log 2>&1 &` |
| **Schema Mismatch** | AttributeError in Azure logs | Code accessing non-existent model attribute | Check model relationships, use junction tables for many-to-many |

### 5. Debugging Workflow

When a user reports an error:

1. **Ask for specifics**:
   - What error message did you see?
   - Were you logged in?
   - What data did you enter?

2. **Check logs** (in order):
   ```bash
   # Frontend (if local dev)
   # Check browser console

   # CoSauce Portal backend
   tail -100 /tmp/cosauce-backend.log

   # Azure backend
   az webapp log tail --name daily-update-api --resource-group daily-update-rg
   ```

3. **Reproduce the issue**:
   - Test Azure endpoint directly (bypasses auth)
   - Test through proxy (requires auth)
   - Test from frontend UI

4. **Fix and validate**:
   - Make the fix
   - Run pre-deployment checklist
   - Deploy
   - Run post-deployment checklist

### 6. Automated Test Script

Location: `/home13/ricki28/cosauce-portal/backend/test_deployment.sh`

```bash
# Run full deployment validation
cd ~/cosauce-portal/backend
./test_deployment.sh
```

This script tests:
- ✓ Local backend health
- ✓ Cloudflare tunnel connectivity
- ✓ Azure backend health
- ✓ Account creation endpoint
- ✓ Authentication requirements

### 7. SQLAlchemy Syntax Validation

**CRITICAL**: When modifying database queries, always check:

```python
# ❌ WRONG - causes 500 error
select(Model).where(
    Model.field1 == value1,
    Model.field2 == value2
)

# ✅ CORRECT - must use and_()
from sqlalchemy import and_

select(Model).where(
    and_(
        Model.field1 == value1,
        Model.field2 == value2
    )
)
```

**Testing**: After any SQLAlchemy query changes:
1. Start local backend
2. Test the endpoint: `curl -X POST http://localhost:8004/api/...`
3. Check for 500 errors in logs
4. Fix syntax before deploying to Azure

### 8. Quick Reference

**Start all services**:
```bash
# CoSauce Portal backend
cd ~/cosauce-portal/backend && source venv/bin/activate && nohup python run.py > /tmp/cosauce-backend.log 2>&1 &

# Cloudflare tunnel (if not running)
nohup ~/bin/cloudflared tunnel run personal-os > /tmp/tunnel.log 2>&1 &
```

**Check service status**:
```bash
# Backend
curl -s http://localhost:8004/health | jq

# Tunnel
curl -s https://cosauce.taiaroa.xyz/health | jq

# Azure
curl -s https://daily-update-api.azurewebsites.net/health | jq
```

**View logs**:
```bash
# Local backend
tail -f /tmp/cosauce-backend.log

# Azure backend (live tail)
az webapp log tail --name daily-update-api --resource-group daily-update-rg

# Azure backend (download)
az webapp log download --name daily-update-api --resource-group daily-update-rg --log-file /tmp/azure-logs.zip
```

## Next Steps

After this incident (500 error on account creation):

1. **Root cause**: SQLAlchemy syntax error - missing `and_()` wrapper
2. **Fix applied**: Added `and_()` import and wrapped conditions
3. **Deployed**: 2026-01-11 03:36 UTC
4. **Validated**: Account creation working on Azure

**Lessons learned**:
- Always test SQLAlchemy query syntax locally before deploying
- Use `and_()` for multiple conditions in `.where()`
- Follow the pre-deployment checklist
- Check Azure logs for Python tracebacks on 500 errors

## Incident 2: Schema Mismatch - 2026-01-11 05:39 UTC

1. **Root cause**: Code trying to access `TeamLeader.account_id` which doesn't exist (many-to-many relationship via junction table)
2. **Error**: `AttributeError: type object 'TeamLeader' has no attribute 'account_id'`
3. **Impact**: Dashboard endpoint returning 500, cascading failures
4. **Fix applied**: Changed to use junction table queries in 3 files (analytics.py, updates.py, proactive.py)
5. **Deployed**: 2026-01-11 05:39 UTC
6. **Validated**: Dashboard and account creation working

**Lessons learned**:
- Verify database schema relationships before querying
- Many-to-many relationships MUST use junction tables
- Test ALL endpoints after schema changes
- Check Python application logs in `/tmp/LogFiles/*_default_docker.log` for actual tracebacks

## Incident 3: Duplicate Code Validation - 2026-01-11 05:42 UTC

1. **Root cause**: Duplicate code check only validated against ACTIVE accounts, but database constraint applies to ALL accounts (active and inactive)
2. **Error**: `UniqueViolationError: duplicate key value violates unique constraint "accounts_code_key"` for code "NZME"
3. **Impact**: Users got HTTP 500 errors when trying to create accounts with codes that existed as inactive accounts
4. **Fix applied**:
   - Removed `is_active == True` filter from duplicate code validation
   - Added try/except to catch IntegrityError and convert to proper HTTP 400 response
   - File: `/home13/ricki28/ai-workspace/projects/active/daily-business-update/backend/app/api/accounts.py`
5. **Deployed**: 2026-01-11 06:00 UTC
6. **Validated**:
   - Duplicate code returns HTTP 400 with clear error message
   - New account creation returns HTTP 201

**Lessons learned**:
- Duplicate validation must match database constraints exactly
- If DB has unique constraint on a field, pre-validation must check ALL rows, not subset
- Always add exception handling for database constraint violations
- IntegrityError should be caught and converted to proper HTTP 4xx responses, not 500
