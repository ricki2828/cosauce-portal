# CoSauce Portal - Development Workflow

## ⚠️ CRITICAL: Claude Executes, User Doesn't

**Claude should run all commands, scripts, and deployments automatically.**

- ✅ DO: Run tests, deploy changes, restart services automatically
- ❌ DON'T: Give user commands to copy/paste
- ❌ DON'T: Ask "Would you like me to deploy?"
- ❌ DON'T: Say "Please run this script"

**Exception**: Only ask permission for potentially destructive actions (deleting production data, irreversible changes).

---

## Problem Statement

We've been experiencing repeated issues:
- Endpoints implemented but not tested before declaring them "done"
- Path mismatches between frontend expectations and backend routes
- Missing error handling that causes frontend crashes
- Changes deployed without validation

## Solution: 4-Phase Development Workflow

---

## Phase 1: PLAN (Before Writing Code)

### 1.1 Understand the Requirement
- [ ] What is the user asking for?
- [ ] What frontend component needs this?
- [ ] What data does it need?

### 1.2 Check Frontend Expectations
```bash
# Search frontend for the API call
cd frontend/src
grep -r "api.get\|api.post\|api.put\|api.delete" . | grep "<feature>"
```

**Capture**:
- Exact endpoint path (e.g., `/api/shift/updates`)
- Expected response format
- Query parameters
- Authentication requirements

### 1.3 Check Backend Current State
```bash
# Check if endpoint exists
curl -H "Authorization: Bearer <token>" http://localhost:8004/api/<endpoint>

# Check route registration in main.py
grep -A 5 "include_router" backend/app/main.py
```

### 1.4 Write Implementation Plan
Create a checklist:
```markdown
## Implementation Plan: <Feature Name>

### Backend Changes
- [ ] Create/modify endpoint at `app/api/<file>.py`
- [ ] Register router in `main.py` (if new)
- [ ] Add Pydantic models in `app/models/` (if needed)
- [ ] Update database schema (if needed)

### Testing Checklist
- [ ] Test endpoint locally with curl
- [ ] Test with valid auth token
- [ ] Test error cases (404, 401, 400)
- [ ] Test response format matches frontend expectations
- [ ] Test in browser console

### Frontend Changes (if any)
- [ ] Update API calls
- [ ] Update TypeScript types
- [ ] Test in browser

### Documentation
- [ ] Update API docs
- [ ] Update README if architecture changed
```

---

## Phase 2: IMPLEMENT

### 2.1 Write Code Following Plan
- Implement exactly what was planned
- Add error handling for all edge cases
- Include try/catch blocks for database operations
- Return proper error responses (not crashes)

### 2.2 Code Review Yourself
Before moving to testing:
- [ ] Does the endpoint path match frontend expectations?
- [ ] Does the response format match what frontend expects?
- [ ] Are all query parameters handled?
- [ ] Is authentication/authorization correct?
- [ ] Are database queries safe from SQL injection?
- [ ] Are errors caught and returned properly?

---

## Phase 3: TEST (Before Restart)

### 3.1 Syntax Check
```bash
cd backend
source venv/bin/activate
python -c "from app.main import app; print('✓ App imports successfully')"
```
**If this fails, DO NOT restart the service yet.**

### 3.2 Local Endpoint Test (After Restart)
```bash
# Get a valid token first
TOKEN="<your-actual-token>"

# Test the new endpoint
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8004/api/<endpoint>

# Expected: Valid JSON response (even if empty array [])
# NOT expected: 404, 500, HTML error page
```

### 3.3 Frontend Integration Test
```bash
# 1. Open browser console
# 2. Navigate to the page that uses the endpoint
# 3. Check for errors in console
# 4. Verify data appears correctly
```

### 3.4 Error Case Testing
```bash
# Test without auth
curl http://localhost:8004/api/<endpoint>
# Expected: 401 Unauthorized

# Test with invalid ID
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8004/api/<endpoint>/invalid-id
# Expected: 404 Not Found (not a crash)

# Test with invalid data (for POST/PUT)
curl -X POST -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"invalid": "data"}' \
     http://localhost:8004/api/<endpoint>
# Expected: 400 Bad Request with helpful error message
```

---

## Phase 4: VALIDATE & DOCUMENT

### 4.1 Production Validation
```bash
# Test on actual domain
curl -H "Authorization: Bearer $TOKEN" \
     https://cosauce.taiaroa.xyz/api/<endpoint>
```

### 4.2 Update Documentation
- [ ] Add endpoint to API documentation
- [ ] Update CHANGELOG.md with new feature
- [ ] Update ClaudeMD.md if architecture changed

### 4.3 Final Checklist
- [ ] Endpoint tested and working
- [ ] Frontend tested and working
- [ ] No console errors
- [ ] Error cases handled gracefully
- [ ] Documentation updated
- [ ] Changes committed with clear message

---

## Example: Proper Implementation Flow

### ❌ What We've Been Doing (WRONG)
```
1. User: "Shift updates are 404"
2. Create endpoint at /api/business-updates/shift/updates
3. Restart backend
4. "It's done!"
5. User: "Still 404"
6. Debug... frontend expects /api/shift/updates
7. Fix and restart again
8. Repeat...
```

### ✅ What We Should Do (RIGHT)
```
1. User: "Shift updates are 404"

2. PLAN PHASE:
   - Check browser console: calls /api/shift/updates
   - Check backend: endpoint doesn't exist
   - Plan: Create endpoint at /api/shift/updates (not under business-updates)

3. IMPLEMENT:
   - Create app/api/shifts.py with /shift prefix
   - Register in main.py
   - Code review: path matches frontend expectations ✓

4. TEST:
   - python -c "from app.main import app" ✓
   - systemctl --user restart cosauce-portal ✓
   - curl http://localhost:8004/api/shift/updates (with auth) ✓
   - Returns [] (empty array - perfect!)
   - Open browser, check console: No more 404 ✓

5. VALIDATE:
   - Test on production domain ✓
   - Document in ClaudeMD.md ✓
   - Done!
```

---

## Testing Scripts

### Quick Endpoint Test
```bash
#!/bin/bash
# File: test-endpoint.sh
# Usage: ./test-endpoint.sh /api/shift/updates

ENDPOINT=$1
TOKEN="<your-token>"

echo "Testing: $ENDPOINT"
echo "===================="

echo "1. Without auth (expect 401):"
curl -s http://localhost:8004$ENDPOINT | jq .

echo -e "\n2. With auth (expect success):"
curl -s -H "Authorization: Bearer $TOKEN" \
     http://localhost:8004$ENDPOINT | jq .

echo -e "\n3. Production (expect success):"
curl -s -H "Authorization: Bearer $TOKEN" \
     https://cosauce.taiaroa.xyz$ENDPOINT | jq .
```

### Backend Health Check
```bash
#!/bin/bash
# File: backend-health-check.sh

echo "Backend Health Check"
echo "===================="

echo "1. Import check:"
cd /home/ricki28/cosauce-portal/backend
source venv/bin/activate
python -c "from app.main import app; print('✓ OK')" || echo "✗ FAILED"

echo -e "\n2. Service status:"
systemctl --user status cosauce-portal --no-pager | head -5

echo -e "\n3. Health endpoint:"
curl -s http://localhost:8004/health | jq .

echo -e "\n4. Recent logs:"
journalctl --user -u cosauce-portal -n 10 --no-pager
```

---

## Common Mistakes & How to Avoid Them

### Mistake #1: Path Mismatch
**Problem**: Backend has `/api/business-updates/shift/updates`, frontend calls `/api/shift/updates`

**Prevention**: Always check frontend code FIRST to see what path it expects

```bash
grep -r "api.*shift" frontend/src/
```

### Mistake #2: Missing Error Handling
**Problem**: Database query fails, backend crashes with 500 error

**Prevention**: Wrap all database operations in try/catch

```python
try:
    cursor = await db.execute(query, params)
    result = await cursor.fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Not found")
    return dict(result)
except aiosqlite.Error as e:
    raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
```

### Mistake #3: Wrong Response Format
**Problem**: Frontend expects `{ items: [...] }`, backend returns `[...]`

**Prevention**: Check TypeScript interfaces in frontend

```typescript
// frontend/src/types.ts
interface ShiftUpdatesResponse {
    items: ShiftUpdate[];
    total: number;
}
```

### Mistake #4: Not Testing Before Declaring Done
**Problem**: Implement feature, restart backend, tell user "it's done" without testing

**Prevention**: Always run through Phase 3 (TEST) before saying it's complete

---

## When to Use This Workflow

### Always Use For:
- New API endpoints
- Modifying existing endpoints
- Database schema changes
- Frontend-backend integration
- Bug fixes that affect APIs

### Can Skip For:
- Documentation updates
- Frontend-only changes (no API changes)
- Configuration tweaks
- Dependency updates

---

## Emergency Hotfix Process

If something is broken in production:

1. **Identify**: What's the error?
2. **Quick Plan**: What's the minimal fix?
3. **Implement**: Fix it
4. **Test**: curl test locally
5. **Deploy**: Restart backend
6. **Validate**: Test in production
7. **Document**: Add to CHANGELOG what was fixed

Even for hotfixes, skip testing at your own risk.

---

## Success Metrics

You'll know this is working when:
- ✅ No more "it's done" followed by "still broken"
- ✅ No more path mismatch errors
- ✅ No more frontend crashes from missing endpoints
- ✅ First-time deployments work
- ✅ Less debugging, more building

---

## Next Steps

1. Create testing scripts (test-endpoint.sh, backend-health-check.sh)
2. Create endpoint testing checklist template
3. Add pre-commit hooks for syntax checking
4. Document all existing endpoints in ClaudeMD.md
