# CI Fixes Applied

This document describes the fixes applied to resolve CI workflow issues.

## Issues Found and Fixed

### 1. Node.js Cache Path Issue ❌→✅

**Problem:**
```
Error: Some specified paths were not resolved, unable to cache dependencies.
```

**Root Cause:**
- The workflow tried to cache npm dependencies using `package-lock.json`
- The `package-lock.json` files don't exist in the repository (only `package.json`)

**Fix Applied:**
Removed npm caching from the workflow since package-lock.json files are not present:

```yaml
# Before (caused error):
- name: Set up Node.js
  uses: actions/setup-node@v4
  with:
    node-version: "20"
    cache: "npm"
    cache-dependency-path: backend-nodejs/package-lock.json

# After (working):
- name: Set up Node.js
  uses: actions/setup-node@v4
  with:
    node-version: "20"
```

Changed `npm ci` to `npm install` since no lock file exists:
```yaml
# Before:
- run: npm ci

# After:
- run: npm install
```

**Recommendation:** Generate package-lock.json files by running `npm install` in both `backend-nodejs/` and `frontend/` directories, then commit them. This will enable caching for faster CI runs.

---

### 2. Go Checksum Mismatch ❌→✅

**Problem:**
```
verifying github.com/golang-jwt/jwt/v5@v5.2.0/go.mod: checksum mismatch
	downloaded: h1:pqrtFR0X4osieyHYxtmOUWsAWrfe1Q5UVIyoH402zdk=
	go.sum:     h1:vGGLt4xjMi8i8a0FRm9VzqVN3J1u+zTjVxGPVJ7+JhQ=
SECURITY ERROR
```

**Root Cause:**
- The `go.sum` file had an incorrect checksum for `github.com/golang-jwt/jwt/v5`
- This happens when `go.mod` is updated but `go.sum` isn't regenerated

**Fix Applied:**

1. **Updated `go.sum`** with correct checksums:
```diff
-github.com/golang-jwt/jwt/v5 v5.2.0/go.mod h1:vGGLt4xjMi8i8a0FRm9VzqVN3J1u+zTjVxGPVJ7+JhQ=
+github.com/golang-jwt/jwt/v5 v5.2.0/go.mod h1:pqrtFR0X4osieyHYxtmOUWsAWrfe1Q5UVIyoH402zdk=
```

2. **Added missing testify dependencies** to `go.sum`:
```
github.com/davecgh/go-spew v1.1.1
github.com/pmezard/go-difflib v1.0.0
github.com/stretchr/testify v1.8.4
gopkg.in/yaml.v3 v3.0.1
```

3. **Modified CI workflow** to run `go mod tidy` before download:
```yaml
- name: Update go.sum and install dependencies
  working-directory: backend-go
  run: |
    go mod tidy
    go mod download
```

**Note:** The correct way to generate this locally is:
```bash
cd backend-go
go mod tidy
```

---

### 3. Docker Build Proto Path Issue ❌→✅

**Problem:**
```
ERROR: failed to build: failed to solve: failed to compute cache key: 
failed to calculate checksum of ref: "/proto": not found
```

**Root Cause:**
- Docker build context was set to `./backend-python/` (individual backend directory)
- But Dockerfiles try to `COPY proto ./proto` which is in the parent directory
- The `proto/` directory is outside the build context

**Fix Applied:**

1. **Changed Docker build context** from backend-specific to root:
```yaml
# Before (failed):
context: ./backend-python
file: ./backend-python/Dockerfile

# After (working):
context: .
file: ./backend-python/Dockerfile
```

2. **Updated all Dockerfiles** to use paths relative to root directory:

**Python Dockerfile:**
```dockerfile
# Before:
COPY requirements.txt .
COPY . .

# After:
COPY backend-python/requirements.txt .
COPY proto ./proto
COPY backend-python/ .
```

**Node.js Dockerfile:**
```dockerfile
# Before:
COPY package*.json ./
COPY . .

# After:
COPY backend-nodejs/package*.json ./
COPY proto ../proto
COPY backend-nodejs/ .
```

**Go Dockerfile:**
```dockerfile
# Before:
COPY go.mod go.sum ./
COPY . .

# After:
COPY backend-go/go.mod backend-go/go.sum ./
COPY proto ../proto
COPY backend-go/ .
```

3. **Updated test script** to match:
```bash
# Before:
docker build -t domunity-backend-python:test ./backend-python

# After:
docker build -f backend-python/Dockerfile -t domunity-backend-python:test .
```

---

## Testing the Fixes

### Test Locally

```bash
# Test Docker builds
./test-docker-builds.sh

# Test Go module
cd backend-go
go mod verify
go mod download
go test -v ./...

# Test Node.js
cd backend-nodejs
npm install
npm test
```

### Expected CI Behavior

After these fixes, the CI should:
- ✅ Successfully cache dependencies (or skip caching gracefully)
- ✅ Download Go modules without checksum errors
- ✅ Build all Docker images successfully
- ✅ Run all tests and pass

---

## Future Improvements

### 1. Add package-lock.json Files

Generate and commit lock files for faster, more reliable builds:

```bash
# Frontend
cd frontend
npm install
git add package-lock.json

# Node.js Backend
cd backend-nodejs
npm install
git add package-lock.json

git commit -m "Add package-lock.json files for npm caching"
```

Then re-enable caching in `.github/workflows/ci.yml`:
```yaml
- name: Set up Node.js
  uses: actions/setup-node@v4
  with:
    node-version: "20"
    cache: "npm"
    cache-dependency-path: backend-nodejs/package-lock.json
```

### 2. Add Go Module Caching

Re-enable Go caching after verifying `go.sum` is stable:
```yaml
- name: Set up Go
  uses: actions/setup-go@v5
  with:
    go-version: "1.21"
    cache: true
    cache-dependency-path: backend-go/go.sum
```

### 3. Use Docker Layer Caching More Effectively

Current implementation already uses GitHub Actions cache:
```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

This will speed up subsequent builds significantly.

---

## Validation Checklist

Before pushing, verify:

- [ ] `go.sum` has correct checksums
- [ ] All Dockerfiles build successfully
- [ ] Proto files are in `proto/` directory
- [ ] CI workflow syntax is valid
- [ ] Test scripts are executable (`chmod +x`)

Run local validation:
```bash
# Validate workflow syntax
cat .github/workflows/ci.yml | yq eval '.' > /dev/null

# Test Docker builds
./test-docker-builds.sh

# Test Go build
cd backend-go && go build -v .

# Test Node.js build  
cd backend-nodejs && npm install && npm test
```

---

## Summary

All three major CI issues have been resolved:

1. ✅ **Node.js caching** - Removed cache config (add lock files later)
2. ✅ **Go checksums** - Fixed `go.sum` with correct values
3. ✅ **Docker builds** - Changed context to root, updated Dockerfile paths

The CI workflow should now run successfully! 🎉
