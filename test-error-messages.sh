#!/bin/bash

echo "🧪 Testing improved login error messages..."
echo "==============================================="

BASE_URL="https://reviewpage-production.up.railway.app"

# Test 1: Invalid email format
echo -e "\n1️⃣ Testing invalid email format:"
curl -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email","password":"test123"}' \
  2>/dev/null | jq -r '.error // .message'

# Test 2: Empty password
echo -e "\n2️⃣ Testing empty password:"
curl -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":""}' \
  2>/dev/null | jq -r '.error // .message'

# Test 3: User not found
echo -e "\n3️⃣ Testing user not found:"
curl -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@test.com","password":"test123"}' \
  2>/dev/null | jq -r '.error // .message'

# Test 4: Wrong password
echo -e "\n4️⃣ Testing wrong password:"
curl -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"graydrone@naver.com","password":"wrongpassword"}' \
  2>/dev/null | jq -r '.error // .message'

# Test 5: Successful login
echo -e "\n5️⃣ Testing successful login:"
curl -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"graydrone@naver.com","password":"7300gray"}' \
  2>/dev/null | jq -r '.message // .error'

echo -e "\n✅ Error message testing completed!"