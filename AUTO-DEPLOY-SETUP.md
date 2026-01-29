# Automatic Deployment Setup for Vercel

This guide shows you how to enable automatic deployments to Vercel whenever you push changes to GitHub.

## Current Status

✅ Vercel project exists: `cosauce-portal`
✅ GitHub repository connected: `ricki2828/cosauce-portal`
✅ Vercel configuration file exists: `vercel.json`
✅ GitHub Actions workflow created: `.github/workflows/deploy.yml`
❌ GitHub secret needs to be added: `VERCEL_TOKEN`

---

## Quick Setup (2 Minutes)

### Step 1: Add Vercel Token to GitHub Secrets

1. **Go to your GitHub repository:**
   ```
   https://github.com/ricki2828/cosauce-portal/settings/secrets/actions
   ```

2. **Click "New repository secret"**

3. **Add the secret:**
   - Name: `VERCEL_TOKEN`
   - Value: `0qfv8ZdrVxHsnO8kbHNdubBM`

4. **Click "Add secret"**

### Step 2: Commit and Push Changes

```bash
cd ~/cosauce-portal
git add .github/workflows/deploy.yml
git add AUTO-DEPLOY-SETUP.md
git add setup-auto-deploy.sh
git commit -m "Add automatic Vercel deployment via GitHub Actions"
git push origin main
```

### Step 3: Verify Deployment

1. **Check GitHub Actions:**
   ```
   https://github.com/ricki2828/cosauce-portal/actions
   ```

2. **You should see a workflow run** called "Deploy to Vercel"

3. **Once complete, visit your site:**
   ```
   https://cosauce-portal.vercel.app
   ```

---

## How It Works

### Automatic Deployments

Every time you push to `main` branch:
1. GitHub Actions triggers automatically
2. Workflow builds your frontend
3. Deploys to Vercel production
4. Takes ~2-3 minutes total

### What Triggers Deployment

**Production (main branch):**
- Any push to `main` branch
- Changes in `frontend/` directory
- Changes to `vercel.json`

**Preview (pull requests):**
- Pull requests to `main` branch
- Creates a preview deployment URL
- Perfect for testing before merging

### Monitored Paths

The workflow only triggers when these paths change:
- `frontend/**` (any file in frontend directory)
- `vercel.json` (Vercel configuration)
- `.github/workflows/deploy.yml` (the workflow itself)

This means backend changes won't trigger unnecessary frontend deployments.

---

## Manual Deployment (If Needed)

You can still deploy manually anytime:

```bash
cd ~/cosauce-portal
vercel --prod
# or
~/.npm-global/bin/vercel --prod
```

---

## Testing the Setup

### Test 1: Make a Small Change

```bash
cd ~/cosauce-portal/frontend
echo "// Test deployment" >> src/App.tsx
git add .
git commit -m "Test automatic deployment"
git push origin main
```

Check: https://github.com/ricki2828/cosauce-portal/actions

### Test 2: Verify Deployment

After the workflow completes (2-3 minutes):
```bash
curl -I https://cosauce-portal.vercel.app
```

You should see a `200 OK` response with fresh deployment.

---

## Troubleshooting

### Workflow fails with "unauthorized"

**Fix:** Make sure you added the `VERCEL_TOKEN` secret to GitHub:
1. Go to: https://github.com/ricki2828/cosauce-portal/settings/secrets/actions
2. Check if `VERCEL_TOKEN` exists
3. If not, add it with value: `0qfv8ZdrVxHsnO8kbHNdubBM`

### Workflow doesn't trigger

**Fix:** Make sure you pushed the workflow file:
```bash
git push origin main
```

Check that `.github/workflows/deploy.yml` exists in GitHub.

### Build fails

**Fix:** Check the workflow logs:
1. Go to: https://github.com/ricki2828/cosauce-portal/actions
2. Click on the failed workflow
3. Check the error message
4. Usually it's a build error in the frontend

---

## Alternative: Vercel GitHub App (Optional)

If you prefer using Vercel's GitHub app integration instead of GitHub Actions:

1. **Install Vercel GitHub App:**
   ```
   https://github.com/apps/vercel
   ```

2. **Configure access** to `cosauce-portal` repository

3. **Connect in Vercel Dashboard:**
   ```
   https://vercel.com/rickis-projects-e03243a5/cosauce-portal/settings/git
   ```

4. **Select production branch:** `main`

**Note:** GitHub Actions approach is recommended because:
- More control over deployment process
- Can add tests before deployment
- Can customize build steps
- Works even if Vercel GitHub app is down

---

## Deployment Logs

### GitHub Actions Logs
```
https://github.com/ricki2828/cosauce-portal/actions
```

### Vercel Deployment Logs
```
https://vercel.com/rickis-projects-e03243a5/cosauce-portal/deployments
```

---

## Environment Variables

The following environment variables are already configured in Vercel:
- `VITE_API_URL`: https://cosauce.taiaroa.xyz
- `VITE_PERFORMANCE_PORTAL_API_URL`: http://91.98.79.241:8005
- `VITE_PERFORMANCE_PORTAL_API_KEY`: dev-external-api-key-change-in-production

These are automatically available during builds.

---

## Summary

**Before:** Manual deployment via `vercel --prod` command
**After:** Automatic deployment on every `git push origin main`

**Time saved:** ~2 minutes per deployment
**Reliability:** No more forgotten deployments
**Visibility:** See deployment status in GitHub Actions

---

## Quick Reference

| Action | Command |
|--------|---------|
| Trigger deployment | `git push origin main` |
| View deployment status | https://github.com/ricki2828/cosauce-portal/actions |
| View live site | https://cosauce-portal.vercel.app |
| Manual deploy | `vercel --prod` |
| Cancel deployment | Stop workflow in GitHub Actions |

---

**Last Updated:** 2026-01-29
**Status:** Ready to enable (just add GitHub secret)
