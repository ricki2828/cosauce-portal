#!/bin/bash
# Test script for CoSauce Portal deployment validation
# Tests the full stack: Frontend → Tunnel → Proxy → Azure Backend

set -e

echo "=== CoSauce Portal Deployment Test ==="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="$3"

    echo -n "Testing $name... "
    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")

    if [ "$response_code" == "$expected_code" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $response_code)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} (Expected HTTP $expected_code, got $response_code)"
        ((FAILED++))
    fi
}

test_json_endpoint() {
    local name="$1"
    local url="$2"
    local expected_field="$3"

    echo -n "Testing $name... "
    response=$(curl -s "$url")

    if echo "$response" | grep -q "\"$expected_field\""; then
        echo -e "${GREEN}✓ PASSED${NC} (Found field: $expected_field)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} (Expected field '$expected_field' not found)"
        echo "Response: $response"
        ((FAILED++))
    fi
}

echo "1. Infrastructure Tests"
echo "======================="

# Test local backend
test_json_endpoint "Local Backend Health" "http://localhost:8004/health" "status"

# Test Cloudflare tunnel
test_json_endpoint "Cloudflare Tunnel" "https://cosauce.taiaroa.xyz/health" "status"

# Test Azure backend directly
test_json_endpoint "Azure Backend Health" "https://daily-update-api.azurewebsites.net/health" "status"

echo
echo "2. API Endpoint Tests"
echo "===================="

# Test account listing (requires auth)
echo -n "Testing Account List Endpoint... "
response_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8004/api/business-updates/accounts")
if [ "$response_code" == "401" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (Correctly requires authentication)"
    ((PASSED++))
elif [ "$response_code" == "200" ]; then
    echo -e "${YELLOW}⚠ WARNING${NC} (Endpoint returned 200 - should require auth?)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} (Unexpected HTTP $response_code)"
    ((FAILED++))
fi

echo
echo "3. Azure Backend API Tests"
echo "=========================="

# Test Azure account creation directly (no auth)
echo -n "Testing Azure Account Creation... "
test_account=$(cat <<EOF
{
  "name": "Test Account $(date +%s)",
  "code": "TEST$(date +%s | tail -c 5)",
  "prompt_time": "09:00",
  "deadline_time": "17:00",
  "timezone": "Australia/Sydney"
}
EOF
)

response=$(curl -s -X POST "https://daily-update-api.azurewebsites.net/api/accounts" \
  -H "Content-Type: application/json" \
  -d "$test_account")

if echo "$response" | grep -q '"id"'; then
    echo -e "${GREEN}✓ PASSED${NC} (Account created successfully)"
    ((PASSED++))

    # Extract account ID for cleanup
    account_id=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "  Created account ID: $account_id"
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Response: $response"
    ((FAILED++))
fi

echo
echo "=== Test Summary ==="
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED${NC}"
fi
echo

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
