# CI Fixes - Round 3: Package Conflicts & Docker Image Loading

## Issues Found and Fixed

### 1. Go Package Name Conflict ✅

**Problem:**
```
found packages proto (domunity.pb.go) and main (integration_test.go) in /app
```

**Root Cause:**
- Proto files were being generated in the root `/app` directory
- Generated files have `package proto` 
- Test files have `package main`
- Go doesn't allow multiple package names in the same directory

**Fixes Applied:**

1. **backend-go/Dockerfile**:
   - Changed proto generation to output in `proto/` subdirectory:
   ```dockerfile
   RUN mkdir -p proto && \
       protoc --go_out=./proto --go_opt=paths=source_relative \
       --go-grpc_out=./proto --go-grpc_opt=paths=source_relative \
       -I../proto ../proto/domunity.proto
   ```

2. **backend-go/.dockerignore** (NEW FILE):
   - Created to exclude test files from Docker builds:
   ```
   *_test.go
   integration_test.go
   ```

3. **.github/workflows/ci.yml**:
   - Updated proto generation to use `proto/` subdirectory:
   ```bash
   mkdir -p proto
   protoc --go_out=./proto --go_opt=paths=source_relative \
          --go-grpc_out=./proto --go-grpc_opt=paths=source_relative \
          -I ../proto ../proto/domunity.proto
   ```

### 2. Docker Images Not Available for Testing ✅

**Problem:**
```
docker: Error response from daemon: pull access denied for domunity-backend-python, 
repository does not exist or may require 'docker login'
```

**Root Cause:**
- Docker build-push-action builds images but doesn't load them into Docker daemon by default
- Without `load: true`, images remain in buildx cache only
- Subsequent `docker run` commands can't find the images

**Fix Applied:**

**.github/workflows/ci.yml**:
```yaml
- name: Build Docker image - ${{ matrix.backend }}
  uses: docker/build-push-action@v5
  with:
      load: true  # ← Added this to load image into Docker daemon
      tags: domunity-backend-${{ matrix.backend }}:test
      # ... other options
```

## Summary of Changes

### Files Created:
1. **backend-go/.dockerignore** - Excludes test files from Docker builds

### Files Modified:

1. **backend-go/Dockerfile**
   - Generate proto files in `proto/` subdirectory instead of root
   - Test files now excluded via `.dockerignore`

2. **.github/workflows/ci.yml**
   - Generate proto files in `proto/` subdirectory for Go backend tests
   - Added `load: true` to Docker build action to make images available for `docker run`

## Why These Changes?

### Proto in Subdirectory:
- **Separation of concerns**: Generated code separate from source code
- **No package conflicts**: Proto package in `proto/`, main package in root
- **Standard practice**: Common pattern in Go projects with protobuf

### .dockerignore for Tests:
- **Cleaner builds**: Test files not needed in production images
- **Smaller images**: Reduced image size by excluding test code
- **No conflicts**: Prevents package name conflicts in Docker builds

### load: true:
- **Test images**: Makes built images available in Docker daemon
- **E2E testing**: Enables running containers to verify startup
- **Validation**: Confirms images actually work, not just build

## Expected Directory Structure After Proto Generation

```
backend-go/
├── proto/                    # Generated proto files
│   ├── domunity.pb.go       # Proto messages (package proto)
│   └── domunity_grpc.pb.go  # gRPC service (package proto)
├── main.go                   # Main application (package main)
├── services.go               # Services (package main)
├── main_test.go              # Unit tests (package main) - excluded from Docker
├── integration_test.go       # Integration tests (package main) - excluded from Docker
├── go.mod
├── go.sum
├── Dockerfile
└── .dockerignore
```

## Next Steps

1. **Commit all changes**:
   ```bash
   git add .
   git commit -m "fix: Resolve Go package conflicts, exclude tests from Docker, load images for testing"
   git push
   ```

2. **Monitor CI** - All jobs should now:
   - ✅ Build Docker images successfully
   - ✅ Load images into Docker daemon
   - ✅ Run containers for startup verification
   - ✅ Pass all tests without package conflicts

## Technical Deep Dive

### Why Go Complained About Package Names:

In Go, a directory can only contain files from **one package** (excluding `_test` packages). When we generated `domunity.pb.go` with `package proto` in the same directory as `integration_test.go` with `package main`, Go couldn't determine which package the directory belongs to.

The solution is to either:
1. ✅ **Put generated files in a subdirectory** (our choice - cleanest)
2. Exclude test files during build (we do this too via `.dockerignore`)
3. Use build tags (overly complex for this use case)

### Why load: true Matters:

Docker Buildx with `docker-container` driver stores built images in a build cache by default. To make images available to the local Docker daemon (so you can `docker run` them), you need to explicitly load them with `load: true` or push them to a registry with `push: true`.

This is the warning you saw:
```
WARNING: No output specified with docker-container driver. 
Build result will only remain in the build cache.
```
