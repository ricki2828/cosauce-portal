# Quick Start: Frontend Testing

## Before Declaring Anything "Ready"

**Always run this first**:
```bash
cd /home13/ricki28/cosauce-portal/frontend
./validate-browser.sh http://169.150.243.5:5173/priorities
```

Replace `/priorities` with whatever page you're working on.

## What It Does (in 10 seconds)

✅ Checks TypeScript compilation
✅ Checks module imports (catches 90% of React errors)
✅ Checks Vite server logs
✅ Checks for module resolution errors
✅ Inspects page HTML for runtime errors

## If It Passes

1. Open the page in your browser
2. Test your specific change
3. Check browser console (F12) for any errors
4. Done ✅

## If It Fails

The error message will tell you exactly what's wrong:
- TypeScript error → Fix type issues
- Module import error → Fix import paths or export statements
- Build error → Check the error log

Then re-run the script.

## Example Workflow

```bash
# 1. Make code changes
vim src/pages/Priorities.tsx

# 2. Run validation
./validate-browser.sh http://169.150.243.5:5173/priorities

# 3. If it passes, manually test in browser
# Open http://169.150.243.5:5173/priorities
# Click around, verify it works

# 4. Commit
git add . && git commit -m "Add priorities feature"
```

## Optional: Production Build Test

For major changes, test production build too:
```bash
./validate-browser.sh http://169.150.243.5:5173/priorities --full
```

This runs all checks + production build (slower but thorough).

## Files

- `validate-browser.sh` - Main validation script (run this)
- `check-ssr-errors.mjs` - Module checker (used by validate-browser.sh)
- `TESTING-STRATEGY.md` - Why we do it this way
- `VALIDATION-APPROACH.md` - Technical details

## Bottom Line

**Run `./validate-browser.sh` before saying anything is "ready"**

It takes 10 seconds and catches 90%+ of errors automatically.
