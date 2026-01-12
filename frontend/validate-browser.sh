#!/bin/bash
#
# Browser Validation Script
# Must pass BEFORE declaring any frontend changes "ready"
#
# Usage: ./validate-browser.sh <url>
# Example: ./validate-browser.sh http://169.150.243.5:5173/priorities

set -e

URL="${1:-http://169.150.243.5:5173}"
TIMEOUT=10

echo "╔════════════════════════════════════════════╗"
echo "║   BROWSER VALIDATION - MANDATORY CHECK    ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "URL: $URL"
echo "Timeout: ${TIMEOUT}s"
echo ""

# 1. Check if frontend is running
echo "1. Checking if frontend is accessible..."
if ! curl -s -f "$URL" > /dev/null; then
    echo "   ❌ FAILED: Frontend not responding at $URL"
    exit 1
fi
echo "   ✅ Frontend accessible"
echo ""

# 2. Check for TypeScript compilation errors
echo "2. Checking TypeScript compilation..."
cd /home13/ricki28/cosauce-portal/frontend
npx tsc --noEmit > /tmp/tsc-errors.log 2>&1
if [ $? -ne 0 ]; then
    echo "   ❌ FAILED: TypeScript compilation errors detected"
    cat /tmp/tsc-errors.log
    exit 1
fi
echo "   ✅ No TypeScript errors"
echo ""

# 3. Check module imports via SSR (catches runtime import errors)
echo "3. Checking module imports (SSR)..."
if ! node check-ssr-errors.mjs > /tmp/ssr-check.log 2>&1; then
    echo "   ❌ FAILED: Module import errors detected"
    cat /tmp/ssr-check.log
    exit 1
fi
echo "   ✅ All modules import successfully"
echo ""

# 4. Check Vite logs for errors
echo "4. Checking Vite dev server logs..."
if grep -i "error" /tmp/cosauce-frontend.log | grep -v "chrome-extension" | tail -5 | grep -q "error"; then
    echo "   ⚠️  WARNING: Errors found in Vite logs:"
    grep -i "error" /tmp/cosauce-frontend.log | grep -v "chrome-extension" | tail -5
fi
echo "   ✅ Vite server running"
echo ""

# 5. Check for module resolution errors in logs
echo "5. Checking for module resolution errors..."
if tail -100 /tmp/cosauce-frontend.log | grep -q "does not provide an export\|Failed to resolve import"; then
    echo "   ❌ FAILED: Module resolution errors detected in logs"
    tail -100 /tmp/cosauce-frontend.log | grep "does not provide an export\|Failed to resolve import" | tail -5
    exit 1
fi
echo "   ✅ No module resolution errors in logs"
echo ""

# 6. Check page HTML for runtime module errors
echo "6. Checking page HTML for module errors..."
PAGE_HTML=$(curl -s "$URL")
if echo "$PAGE_HTML" | grep -qi "does not provide an export\|SyntaxError.*module"; then
    echo "   ❌ FAILED: Module errors found in page HTML"
    echo "$PAGE_HTML" | grep -i "does not provide an export\|SyntaxError.*module"
    exit 1
fi
echo "   ✅ No module errors in page HTML"
echo ""

# 7. Build test (optional - can be slow)
if [ "$2" == "--full" ]; then
    echo "7. Running production build test..."
    if ! npm run build > /tmp/build-test.log 2>&1; then
        echo "   ❌ FAILED: Production build failed"
        tail -30 /tmp/build-test.log
        exit 1
    fi
    echo "   ✅ Production build successful"
    echo ""
fi

echo "╔════════════════════════════════════════════╗"
echo "║         ✅ VALIDATION PASSED               ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "1. Manually test in browser at: $URL"
echo "2. Open DevTools Console (F12) and check for runtime errors"
echo "3. Test all user workflows"
echo "4. Only then declare 'ready'"
echo ""
