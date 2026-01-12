#!/bin/bash
#
# Simple Browser Validation (for environments where Playwright doesn't work)
# Checks compilation, logs, and basic HTTP responses
#

set -e

URL="${1:-http://169.150.243.5:5173/priorities}"

echo "╔════════════════════════════════════════════╗"
echo "║   SIMPLE BROWSER VALIDATION               ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "URL: $URL"
echo ""

# 1. Check page loads
echo "1. Checking page loads..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
if [ "$HTTP_CODE" != "200" ]; then
    echo "   ❌ FAILED: Page returned HTTP $HTTP_CODE"
    exit 1
fi
echo "   ✅ Page loads (HTTP $HTTP_CODE)"
echo ""

# 2. Check for module errors in HTML
echo "2. Checking for module errors in page..."
PAGE_HTML=$(curl -s "$URL")
if echo "$PAGE_HTML" | grep -qi "does not provide an export\|SyntaxError.*module"; then
    echo "   ❌ FAILED: Module errors found in page HTML"
    echo "$PAGE_HTML" | grep -i "does not provide an export\|SyntaxError.*module"
    exit 1
fi
echo "   ✅ No module errors in page HTML"
echo ""

# 3. Check Vite scripts are present
echo "3. Checking Vite/React scripts load..."
if ! echo "$PAGE_HTML" | grep -q "/@vite/client"; then
    echo "   ❌ FAILED: Vite client script not found"
    exit 1
fi
if ! echo "$PAGE_HTML" | grep -q "/src/main.tsx"; then
    echo "   ❌ FAILED: Main React entry point not found"
    exit 1
fi
echo "   ✅ Vite and React scripts present"
echo ""

# 4. Check TypeScript compilation
echo "4. Checking TypeScript compilation..."
cd /home13/ricki28/cosauce-portal/frontend
if ! npx tsc --noEmit > /tmp/tsc-check.log 2>&1; then
    echo "   ❌ FAILED: TypeScript compilation errors"
    cat /tmp/tsc-check.log
    exit 1
fi
echo "   ✅ TypeScript compiles cleanly"
echo ""

# 5. Check Vite server logs
echo "5. Checking Vite dev server logs..."
if [ -f /tmp/cosauce-frontend.log ]; then
    if tail -100 /tmp/cosauce-frontend.log | grep -qi "error.*module\|failed to resolve import"; then
        echo "   ⚠️  WARNING: Possible errors in Vite logs"
        tail -20 /tmp/cosauce-frontend.log | grep -i error
    else
        echo "   ✅ Vite server running cleanly"
    fi
else
    echo "   ⚠️  WARNING: Vite log file not found"
fi
echo ""

# 6. Test main module endpoints
echo "6. Testing module loading (static checks)..."
MODULES_TO_CHECK=(
    "/src/pages/Priorities.tsx"
    "/src/lib/api.ts"
    "/src/lib/priorities-types.ts"
    "/src/contexts/AuthContext.tsx"
)

for module in "${MODULES_TO_CHECK[@]}"; do
    MODULE_URL="http://169.150.243.5:5173${module}"
    MODULE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$MODULE_URL")
    if [ "$MODULE_CODE" != "200" ]; then
        echo "   ❌ FAILED: Module $module returned HTTP $MODULE_CODE"
        exit 1
    fi
done
echo "   ✅ All key modules return HTTP 200"
echo ""

echo "╔════════════════════════════════════════════╗"
echo "║         ✅ VALIDATION PASSED               ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "⚠️  NOTE: This is a simplified check since headless browsers"
echo "don't work on this environment. Manually verify in browser:"
echo "  1. Open: $URL"
echo "  2. Check browser console (F12) for runtime errors"
echo "  3. Test creating/updating priorities"
echo ""
