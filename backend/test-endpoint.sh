#!/bin/bash
# Quick endpoint testing script
# Usage: ./test-endpoint.sh /api/shift/updates [token]

ENDPOINT=$1
TOKEN=${2:-""}

if [ -z "$ENDPOINT" ]; then
    echo "Usage: $0 <endpoint> [token]"
    echo "Example: $0 /api/shift/updates"
    exit 1
fi

echo "========================================"
echo "Testing Endpoint: $ENDPOINT"
echo "========================================"
echo ""

echo "1. Without Authentication (expect 401 or 403):"
echo "--------------------------------------------"
curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:8004$ENDPOINT | head -20
echo ""

if [ -n "$TOKEN" ]; then
    echo "2. With Authentication (expect 200):"
    echo "--------------------------------------------"
    curl -s -w "\nHTTP Status: %{http_code}\n" \
         -H "Authorization: Bearer $TOKEN" \
         http://localhost:8004$ENDPOINT | jq . 2>/dev/null || cat
    echo ""

    echo "3. Production Check (expect 200):"
    echo "--------------------------------------------"
    curl -s -w "\nHTTP Status: %{http_code}\n" \
         -H "Authorization: Bearer $TOKEN" \
         https://cosauce.taiaroa.xyz$ENDPOINT | jq . 2>/dev/null || cat
    echo ""
else
    echo "⚠ No token provided. Skipping authenticated tests."
    echo "  Provide token as second argument to test authentication."
    echo ""
fi

echo "========================================"
echo "Test Complete"
echo "========================================"
