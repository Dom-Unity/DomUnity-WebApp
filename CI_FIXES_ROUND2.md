# CI Fixes - Round 2

## Issues Found and Fixed

### 1. Go Version Incompatibility ✅

**Problem:**
```
go: google.golang.org/protobuf@v1.36.10 requires go >= 1.23 (running go 1.21.13)
```

**Root Cause:**
- The Go backend Dockerfile used `golang:1.21-alpine`
- The CI workflow used Go 1.21
- Latest protobuf tools require Go 1.23+

**Fixes Applied:**

1. **backend-go/Dockerfile**:
   - Changed base image from `golang:1.21-alpine` to `golang:1.23-alpine`
   - Pinned protoc-gen-go to v1.34.2 (compatible version)
   - Pinned protoc-gen-go-grpc to v1.5.1 (compatible version)

2. **backend-go/go.mod**:
   - Updated Go version from `go 1.21` to `go 1.23`

3. **.github/workflows/ci.yml**:
   - Updated Go version from `1.21` to `1.23` in setup-go action
   - Pinned protoc-gen-go to v1.34.2
   - Pinned protoc-gen-go-grpc to v1.5.1

### 2. Missing go_package Option in Proto File ✅

**Problem:**
```
protoc-gen-go: unable to determine Go import path for "domunity.proto"
Please specify either:
  • a "go_package" option in the .proto source file, or
  • a "M" argument on the command line.
```

**Root Cause:**
- The `domunity.proto` file was missing the required `go_package` option
- This option tells protoc-gen-go what Go package path to use for generated code

**Fix Applied:**

**proto/domunity.proto**:
```protobuf
syntax = "proto3";

package domunity;

option go_package = "github.com/domunity/backend/proto";
```

### 3. npm ci Failing in Multiple Places ✅

**Problem:**
```
npm error The `npm ci` command can only install with an existing package-lock.json
```

**Root Cause:**
- No `package-lock.json` files exist in the repository
- `npm ci` requires package-lock.json but `npm install` doesn't

**Fixes Applied:**

1. **.github/workflows/ci.yml**:
   - Changed `npm ci` to `npm install` in backend-nodejs test job

2. **backend-nodejs/Dockerfile**:
   - Changed `npm ci --only=production` to `npm install --omit=dev`
   - Using `--omit=dev` instead of deprecated `--only=production`

## Summary of Changes

### Files Modified:

1. **backend-go/Dockerfile**
   - Go version: 1.21 → 1.23
   - Pinned protobuf tool versions

2. **backend-go/go.mod**
   - Go version: 1.21 → 1.23

3. **backend-nodejs/Dockerfile**
   - Changed `npm ci --only=production` to `npm install --omit=dev`

4. **.github/workflows/ci.yml**
   - Go version: 1.21 → 1.23
   - Pinned protobuf tool versions
   - npm ci → npm install (backend-nodejs)

5. **proto/domunity.proto**
   - Added `option go_package = "github.com/domunity/backend/proto";`

## Next Steps

1. **Run `go mod tidy` locally** to update go.sum with Go 1.23 dependencies:
   ```bash
   cd backend-go
   go mod tidy
   ```

2. **Commit and push changes**:
   ```bash
   git add .
   git commit -m "fix: Update Go to 1.23, add go_package option to proto, pin protobuf tool versions"
   git push
   ```

3. **Monitor CI** to verify all builds pass

## Expected CI Outcome

After these fixes:
- ✅ Go backend Docker build should succeed with Go 1.23
- ✅ Proto generation should work with go_package option
- ✅ npm install should work without package-lock.json
- ✅ All test jobs should pass
- ✅ Docker builds for all backends should succeed
- ✅ Security scans should complete
- ✅ Render config validation should pass

## Why Go 1.23?

The latest protobuf compiler tools require Go 1.23+. While we could use older versions of protoc-gen-go, it's better to:
1. Use the latest stable Go version for security and performance
2. Have access to latest protobuf features
3. Match the trend of the Go ecosystem moving forward

Go 1.23 is stable and widely supported, so this upgrade should not cause any compatibility issues.
