@echo off
REM ============================================
REM Egator Voting API - Quick Test Script (Windows)
REM ============================================
REM This script tests the main functionality of the API
REM 
REM Usage: test-api.bat
REM ============================================

set BASE_URL=http://localhost:5000/api
set TOKEN=
set ELECTION_ID=
set CANDIDATE_ID=
set VOTER_ID=

echo.
echo ============================================
echo  Egator Voting API - Quick Test Script
echo ============================================
echo.

REM Check if server is running
echo [1/8] Checking if server is running...
curl -s -o /dev/null -w "%%{http_code}" "%BASE_URL%/health" > temp_status.txt
set /p HEALTH_RESPONSE=<temp_status.txt
del temp_status.txt

if "%HEALTH_RESPONSE%" neq "200" (
    echo [ERROR] Server is not running! Start it with: npm run dev
    exit /b 1
)
echo [OK] Server is running
echo.

REM 1. Register Voter
echo [2/8] Registering new voter...
curl -s -X POST "%BASE_URL%/voters/register" ^
  -H "Content-Type: application/json" ^
  -d "{\"fullName\":\"Test User\",\"email\":\"test%RANDOM%@example.com\",\"password\":\"Password@123\",\"password2\":\"Password@123\"}" > register_response.json
type register_response.json
echo.

REM 2. Login
echo [3/8] Logging in...
curl -s -X POST "%BASE_URL%/voters/login" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\",\"password\":\"Password@123\"}" > login_response.json
type login_response.json
echo.

REM 3. Get Voter Details
echo [4/8] Getting voter details...
echo Note: Requires token from login response
echo.

REM 4. Test Rate Limiting
echo [5/8] Testing rate limiting...
for /l %%i in (1,1,6) do (
    echo Attempt %%i:
    curl -s -X POST "%BASE_URL%/voters/login" ^
      -H "Content-Type: application/json" ^
      -d "{\"email\":\"test@example.com\",\"password\":\"wrong\"}"
    echo.
)

REM 5. Test Health Endpoint
echo [6/8] Testing health endpoint...
curl -s -X GET "%BASE_URL%/health"
echo.

REM 6. Test 404
echo [7/8] Testing 404 handler...
curl -s -X GET "%BASE_URL%/nonexistent"
echo.

REM Cleanup
del register_response.json 2>nul
del login_response.json 2>nul

echo.
echo ============================================
echo [OK] Basic tests completed!
echo ============================================
echo.
echo Next steps:
echo 1. Run: npm run seed:admin
echo 2. Login as admin and save the token
echo 3. Use Postman/cURL for admin tests
echo.
echo For full testing guide, see: docs\TESTING_GUIDE.md
echo.

pause
