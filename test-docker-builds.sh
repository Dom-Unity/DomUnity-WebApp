#!/bin/bash

# Quick Docker Build Test Script
# Verifies all Docker images build successfully

set -e

echo "=================================================="
echo "Docker Build Verification"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

BACKENDS=("python" "nodejs" "go")

for backend in "${BACKENDS[@]}"; do
    echo "Building backend-$backend..."
    
    if docker build -f backend-$backend/Dockerfile -t domunity-backend-$backend:test .; then
        echo -e "${GREEN}✓ backend-$backend built successfully${NC}"
    else
        echo -e "${RED}✗ backend-$backend build failed${NC}"
        exit 1
    fi
    
    echo ""
done

echo "=================================================="
echo -e "${GREEN}🎉 All Docker images built successfully!${NC}"
echo "=================================================="
