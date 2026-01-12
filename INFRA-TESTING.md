# Infrastructure Testing Guide

This document outlines the **mandatory testing process** before deploying any infrastructure changes to CoSauce Portal.

## Testing Philosophy

**NEVER deploy to production without testing the full request flow from browser → tunnel → backend.**

curl tests are NOT enough. Browsers enforce stricter CORS, cache aggressively, and behave differently than command-line tools.

## Pre-Deployment Checklist

### 1. Backend Changes

```bash
# ✅ Backend starts without errors
cd ~/cosauce-portal/backend
source venv/bin/activate
python run.py  # Check logs for startup errors

# ✅ Health check responds
curl -s http://localhost:8004/health | jq .

# ✅ CORS origins loaded correctly
python -c "from app.config import CORS_ORIGINS; print('\n'.join(CORS_ORIGINS))"

# ✅ Test endpoint works locally
curl -X POST http://localhost:8004/api/sales/bulk/analyze-bpo \
  -H "Content-Type: application/json" \
  -d '{"company_ids": []}'
```

### 2. Cloudflare Tunnel Changes

```bash
# ✅ Tunnel config is valid
cat ~/.cloudflared/config.yml

# ✅ Tunnel is running
ps aux | grep "cloudflared tunnel run" | grep -v grep

# ✅ Health check through tunnel
curl -s https://cosauce.taiaroa.xyz/health | jq .

# ✅ CORS preflight works through tunnel
curl -i -X OPTIONS https://cosauce.taiaroa.xyz/api/sales/bulk/analyze-bpo \
  -H "Origin: https://cosauce-portal.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  | grep -E "^HTTP|access-control"

# ✅ POST request works through tunnel
curl -X POST https://cosauce.taiaroa.xyz/api/sales/bulk/analyze-bpo \
  -H "Origin: https://cosauce-portal.vercel.app" \
  -H "Content-Type: application/json" \
  -d '{"company_ids": []}' \
  | jq .
```

### 3. Frontend Changes

```bash
# ✅ API URL is correct in code
cd ~/cosauce-portal/frontend
grep -n "API_BASE_URL" src/lib/api.ts

# ✅ Build succeeds (or skip if deploying directly to Vercel)
# npm run build  # Skip if memory limited

# ✅ Deploy to Vercel
npx vercel --prod --yes

# ✅ Update production alias
npx vercel alias <deployment-url> cosauce-portal.vercel.app
```

### 4. Browser Testing (CRITICAL)

**Run automated test script:**
```bash
~/bin/test-cosauce-infra.sh
```

**OR manual browser test:**
1. Open https://cosauce-portal.vercel.app in **incognito/private window**
2. Open DevTools → Network tab
3. Navigate to Sales page
4. Click "Analyze BPO" on a company
5. Check Network tab for:
   - ✅ Request to `https://cosauce.taiaroa.xyz/api/sales/bulk/analyze-bpo`
   - ✅ Status: 200 OK
   - ✅ Response Headers include `access-control-allow-origin: https://cosauce-portal.vercel.app`
   - ❌ NO CORS errors in Console

**Why incognito?** Clears all cached API responses and service workers.

## Common Issues

### Issue: "Network Error" in browser

**Diagnosis:**
```bash
# Check if tunnel is running
ps aux | grep "cloudflared tunnel run"

# Check if backend is running
ps aux | grep "python run.py" | grep 8004

# Check tunnel logs for errors
tail -50 /tmp/personal-os-tunnel.log | grep -i error

# Check backend logs for errors
tail -50 /tmp/cosauce-backend.log | grep -E "ERROR|WARN"
```

**Common causes:**
1. Tunnel routing to wrong port
2. Backend not running
3. Backend crashed (check logs)
4. CORS_ORIGINS doesn't include production frontend URL

### Issue: CORS errors

**Diagnosis:**
```bash
# Test OPTIONS preflight
curl -i -X OPTIONS https://cosauce.taiaroa.xyz/api/sales/bulk/analyze-bpo \
  -H "Origin: https://cosauce-portal.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  | grep access-control-allow-origin

# Should return: access-control-allow-origin: https://cosauce-portal.vercel.app
# If empty or different, check backend CORS_ORIGINS
```

**Fix:**
1. Update `backend/.env` CORS_ORIGINS
2. Restart backend: `pkill -f "python run.py" && cd ~/cosauce-portal/backend && nohup python run.py > /tmp/cosauce-backend.log 2>&1 &`
3. Verify: Run OPTIONS test again

### Issue: Stale frontend deployment

**Diagnosis:**
```bash
# Check current production deployment
cd ~/cosauce-portal/frontend
npx vercel alias ls | grep cosauce-portal.vercel.app

# Check API URL in latest deployment
# (Need to inspect bundle - easier to just redeploy)
```

**Fix:**
```bash
cd ~/cosauce-portal/frontend
npx vercel --prod --yes
npx vercel alias <new-deployment-url> cosauce-portal.vercel.app
```

## Automated Testing Script

See `~/bin/test-cosauce-infra.sh` for automated smoke tests.

**Usage:**
```bash
~/bin/test-cosauce-infra.sh
# Runs all checks, exits with code 0 if all pass, 1 if any fail
```

## Infrastructure Change Workflow

```
1. Make code/config changes locally
   ↓
2. Run automated tests (test-cosauce-infra.sh)
   ↓
3. Fix any failures, repeat step 2
   ↓
4. Deploy to production (backend restart + Vercel deploy)
   ↓
5. Run automated tests again
   ↓
6. Manual browser test in incognito
   ↓
7. ✅ Confirm with user that feature works
```

## Emergency Rollback

If production is broken:

```bash
# 1. Check previous working deployment
cd ~/cosauce-portal/frontend
npx vercel alias ls | head -10

# 2. Rollback to previous deployment
npx vercel alias <previous-deployment-url> cosauce-portal.vercel.app

# 3. Restart backend with old config
cd ~/cosauce-portal/backend
git checkout HEAD~1 .env  # Or manually revert .env changes
pkill -f "python run.py"
nohup python run.py > /tmp/cosauce-backend.log 2>&1 &

# 4. Verify rollback worked
curl -s https://cosauce.taiaroa.xyz/health
```

## Testing Checklist Template

Copy this checklist for each infrastructure change:

```
Infrastructure Change: [Brief description]
Date: [YYYY-MM-DD]
Changed by: Claude Code

Pre-Deployment Tests:
[ ] Backend starts locally
[ ] Health check responds (local)
[ ] CORS origins loaded correctly
[ ] Test endpoint works (local)
[ ] Tunnel config updated (if needed)
[ ] Tunnel running
[ ] Health check through tunnel
[ ] CORS preflight through tunnel
[ ] POST request through tunnel
[ ] Frontend API URL correct
[ ] Vercel build succeeds

Post-Deployment Tests:
[ ] Automated script passes (~/bin/test-cosauce-infra.sh)
[ ] Manual browser test (incognito)
[ ] No CORS errors in console
[ ] Network requests show 200 OK
[ ] Feature works end-to-end
[ ] User confirmed working

Issues Encountered:
[List any issues and how they were resolved]

Rollback Plan:
[How to revert if this change breaks production]
```
