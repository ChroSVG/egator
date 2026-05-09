#!/bin/bash

# ============================================
# Egator Voting API - Quick Test Script
# ============================================
# This script tests the main functionality of the API
# 
# Usage: ./test-api.sh
# ============================================

BASE_URL="http://localhost:5000/api"
TOKEN=""
ELECTION_ID=""
CANDIDATE_ID=""
VOTER_ID=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
print_test() {
    echo -e "\n${YELLOW}🧪 Testing: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if server is running
print_test "Checking if server is running..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")

if [ "$HEALTH_RESPONSE" != "200" ]; then
    print_error "Server is not running! Start it with: npm run dev"
    exit 1
fi
print_success "Server is running"

# 1. Register Voter
print_test "Registering new voter..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/voters/register" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test'$(date +%s)'@example.com",
    "password": "Password@123",
    "password2": "Password@123"
  }')

echo "$REGISTER_RESPONSE" | jq .

VOTER_EMAIL=$(echo "$REGISTER_RESPONSE" | jq -r '.voter.email')
print_success "Voter registered: $VOTER_EMAIL"

# 2. Login
print_test "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/voters/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$VOTER_EMAIL\",
    \"password\": \"Password@123\"
  }")

echo "$LOGIN_RESPONSE" | jq .

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
VOTER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.voter.id')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    print_error "Login failed!"
    exit 1
fi
print_success "Logged in successfully"

# 3. Get Voter Details
print_test "Getting voter details..."
curl -s -X GET "$BASE_URL/voters/$VOTER_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .

# 4. Try to create election (should fail - not admin)
print_test "Creating election (should fail - not admin)..."
CREATE_ELECTION_RESPONSE=$(curl -s -X POST "$BASE_URL/elections" \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Test Election" \
  -F "description=Test Description")

echo "$CREATE_ELECTION_RESPONSE" | jq .

if echo "$CREATE_ELECTION_RESPONSE" | jq -e '.message | contains("not authorized")' > /dev/null; then
    print_success "Correctly rejected non-admin user"
else
    print_error "Should have rejected non-admin user!"
fi

# Note: For remaining tests, you need an admin token
# Run npm run seed:admin first, then login as admin

print_test "=== Admin Tests Require Admin Token ==="
echo "To test admin features:"
echo "1. Run: npm run seed:admin"
echo "2. Login as admin"
echo "3. Set TOKEN variable with admin token"
echo ""

# 5. Test Rate Limiting
print_test "Testing rate limiting (5 failed logins)..."
for i in {1..6}; do
    echo "Attempt $i:"
    curl -s -X POST "$BASE_URL/voters/login" \
      -H "Content-Type: application/json" \
      -d '{"email":"test@example.com","password":"wrong"}' | jq '.message'
done

# 6. Test Health Endpoint
print_test "Testing health endpoint..."
curl -s -X GET "$BASE_URL/health" | jq .

# 7. Test 404
print_test "Testing 404 handler..."
curl -s -X GET "$BASE_URL/nonexistent" | jq .

echo ""
echo "============================================"
echo -e "${GREEN}✅ Basic tests completed!${NC}"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Run 'npm run seed:admin' to create admin user"
echo "2. Login as admin and save the token"
echo "3. Update TOKEN variable and re-run this script for admin tests"
echo ""
echo "For full testing, see: docs/TESTING_GUIDE.md"

pause