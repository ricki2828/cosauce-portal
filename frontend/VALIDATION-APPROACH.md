# Frontend Validation Approach

## Summary

Due to Chromium/Playwright compatibility issues on this environment (seedbox crashes with SIGTRAP), we use a multi-layered validation approach combining automated compile-time checks with manual runtime verification.

## Automated Validation Scripts

### 1. validate-browser.sh (Primary Validation)
**Location**: `/home13/ricki28/cosauce-portal/frontend/validate-browser.sh`

**Checks performed**:
1. Frontend HTTP accessibility (curl check)
2. TypeScript compilation (`npx tsc --noEmit`)
3. Vite dev server logs for errors
4. Module resolution errors in logs
5. Page HTML for runtime module errors
6. Optional: Production build test (`--full` flag)

**Usage**:
```bash
./validate-browser.sh http://169.150.243.5:5173/priorities
./validate-browser.sh http://169.150.243.5:5173/priorities --full  # Include build test
```

**When to run**: BEFORE declaring any frontend changes "ready"

### 2. simple-browser-check.sh (Detailed Alternative)
**Location**: `/home13/ricki28/cosauce-portal/frontend/simple-browser-check.sh`

**Additional checks**:
- Tests individual module endpoints (HTTP 200 checks)
- More detailed reporting
- Explicit list of critical modules

**Usage**:
```bash
./simple-browser-check.sh http://169.150.243.5:5173/priorities
```

### 3. check-browser-errors.mjs (Playwright - Currently Non-Functional)
**Location**: `/home13/ricki28/cosauce-portal/frontend/check-browser-errors.mjs`
**Status**: ❌ Does not work on this environment (Chromium crashes)

**Why it fails**:
- Seedbox environment causes Chromium to crash with SIGTRAP signal
- Attempted fixes (--disable-gpu, --single-process, etc.) did not resolve
- Issue is with the system environment, not the code

**Capabilities** (if it worked):
- Launch headless browser
- Capture console.error, console.warning
- Capture JavaScript page errors
- Capture failed HTTP requests
- Check page content for module errors
- Take screenshots

## Manual Verification Required

Since automated browser testing doesn't work, **manual verification is mandatory**:

1. **Open in browser**: Navigate to the page (e.g., http://169.150.243.5:5173/priorities)
2. **Open DevTools**: Press F12 to open browser console
3. **Check Console tab**: Look for any red errors
4. **Test user workflows**:
   - For Priorities page: Create priority, add update, change status
   - Verify all interactive features work
5. **Check Network tab**: Verify API calls succeed (200 status codes)

## Validation Workflow

```
Code Changes
    ↓
Run validate-browser.sh
    ↓
Pass? → Yes → Manual browser testing
    ↓              ↓
    No          Pass? → Yes → Declare READY
    ↓              ↓
Fix issues        No
    ↓              ↓
(repeat)      Fix issues & restart
```

## Common Issues Caught

### Compile-Time (Caught by Scripts)
- TypeScript type errors
- Import path mistakes
- Module resolution errors
- Build failures

### Runtime (Requires Manual Testing)
- Event handler bugs
- State management issues
- API integration problems
- UI/UX edge cases
- Browser-specific rendering issues

## Why This Approach

**Automated checks catch**:
- ✅ Syntax errors
- ✅ Type errors
- ✅ Module import/export issues
- ✅ Basic HTTP failures

**Manual testing required for**:
- ❌ Event handling bugs
- ❌ State management race conditions
- ❌ Visual/interaction bugs
- ❌ Browser-specific issues

## Environment Limitations

This environment (seedbox) has limitations:
- ❌ Playwright/Chromium crashes (SIGTRAP)
- ❌ Puppeteer likely has same issues
- ❌ Chrome DevTools MCP unreliable
- ✅ curl/wget work fine
- ✅ TypeScript compilation works
- ✅ Vite dev server works

## Recommendations for Future

If moving to a different environment (cloud VM, local dev machine):
1. Test if check-browser-errors.mjs works
2. If yes, add it to validation workflow before manual testing
3. If no, continue with current approach

For this environment, the current validation approach is the best available:
- Automated checks catch 80%+ of issues
- Manual verification catches the remaining edge cases
