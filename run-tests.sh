#!/bin/bash

# Run All Tests Script for DomUnity-WebApp
# This script runs all backend tests locally

set -e  # Exit on error

echo "=================================================="
echo "DomUnity-WebApp - Local Test Runner"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if test database is required (integration tests use MongoDB)
TEST_DB=${TEST_MONGODB_URI:-"mongodb://localhost:27017/domunity_test"}
export TEST_MONGODB_URI="$TEST_DB"

echo "📋 Test Configuration:"
echo "  Test Database (MongoDB): $TEST_DB"
echo ""

# Function to run tests for a backend
run_backend_tests() {
    local backend=$1
    local test_cmd=$2
    
    echo "=================================================="
    echo "Testing: $backend Backend"
    echo "=================================================="
    
    if [ ! -d "$backend" ]; then
        echo -e "${RED}✗ Directory $backend not found${NC}"
        return 1
    fi
    
    cd "$backend"
    
    # Run the test command
    if eval "$test_cmd"; then
        echo -e "${GREEN}✓ $backend tests passed${NC}"
        cd ..
        return 0
    else
        echo -e "${RED}✗ $backend tests failed${NC}"
        cd ..
        return 1
    fi
}

# Track results
PYTHON_RESULT=0
NODEJS_RESULT=0
FRONTEND_RESULT=0

# Test Python Backend
if [ -d "backend-python" ]; then
    run_backend_tests "backend-python" "pip install -q -r requirements.txt && pytest -v" || PYTHON_RESULT=$?
else
    echo -e "${YELLOW}⊘ Skipping Python backend (not found)${NC}"
fi

echo ""

# Test Node.js Backend
if [ -d "backend-nodejs" ]; then
    run_backend_tests "backend-nodejs" "npm install --silent && npm test" || NODEJS_RESULT=$?
else
    echo -e "${YELLOW}⊘ Skipping Node.js backend (not found)${NC}"
fi

echo ""

# Test Frontend Build
echo "=================================================="
echo "Testing: Frontend Build"
echo "=================================================="
if [ -d "frontend" ]; then
    cd frontend
    if npm install --silent && npm run build > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend build successful${NC}"
        FRONTEND_RESULT=0
    else
        echo -e "${RED}✗ Frontend build failed${NC}"
        FRONTEND_RESULT=1
    fi
    cd ..
else
    echo -e "${YELLOW}⊘ Skipping frontend (not found)${NC}"
fi

echo ""
echo "=================================================="
echo "Test Summary"
echo "=================================================="

if [ $PYTHON_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Python Backend${NC}"
else
    echo -e "${RED}✗ Python Backend${NC}"
fi

if [ $NODEJS_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Node.js Backend${NC}"
else
    echo -e "${RED}✗ Node.js Backend${NC}"
fi

if [ $FRONTEND_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend Build${NC}"
else
    echo -e "${RED}✗ Frontend Build${NC}"
fi

echo "=================================================="

# Exit with error if any test failed
TOTAL_FAILURES=$((PYTHON_RESULT + NODEJS_RESULT + FRONTEND_RESULT))

if [ $TOTAL_FAILURES -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ $TOTAL_FAILURES test suite(s) failed${NC}"
    exit 1
fi
