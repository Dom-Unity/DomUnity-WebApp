# GitHub CI Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Pull Request Created                         │
│                    (to main or develop branch)                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    GitHub Actions CI Triggered                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
              ┌──────────────┴──────────────┐
              │   Run Jobs in Parallel      │
              └──────────────┬──────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Python Tests  │   │ Node.js Tests │   │   Go Tests    │
│               │   │               │   │               │
│ ┌───────────┐ │   │ ┌───────────┐ │   │ ┌───────────┐ │
│ │PostgreSQL │ │   │ │PostgreSQL │ │   │ │PostgreSQL │ │
│ │Service    │ │   │ │Service    │ │   │ │Service    │ │
│ └───────────┘ │   │ └───────────┘ │   │ └───────────┘ │
│               │   │               │   │               │
│ • Unit Tests  │   │ • Unit Tests  │   │ • Unit Tests  │
│ • Integration │   │ • Integration │   │ • Integration │
│ • Coverage    │   │ • Coverage    │   │ • Coverage    │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Docker Builds │   │Frontend Build │   │ Render.yaml   │
│               │   │               │   │ Validation    │
│ • Python img  │   │ • npm install │   │               │
│ • Node.js img │   │ • npm build   │   │ • YAML syntax │
│ • Go image    │   │ • Check files │   │ • Check files │
│ • Test start  │   │               │   │ • Env vars    │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Security    │
                    │   Scanning    │
                    │               │
                    │ • Trivy scan  │
                    │ • Vulns check │
                    │ • Upload SARIF│
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  CI Success   │
                    │   Summary     │
                    │               │
                    │ All checks ✓  │
                    └───────┬───────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       ✅ All CI Checks Passed                       │
│                      Ready to Merge! 🚀                             │
└─────────────────────────────────────────────────────────────────────┘
```

## Job Dependencies

```
test-python-backend ──┐
test-nodejs-backend ──┤
test-go-backend ──────┼──> ci-success
test-docker-builds ───┤    (Final Summary)
test-frontend-build ──┤
validate-render-config┘

security-scan (runs independently, can fail without blocking)
```

## Test Coverage Flow

```
Backend Tests
    │
    ├─> Run pytest/jest/go test
    │
    ├─> Generate coverage.xml/coverage.out
    │
    └─> Upload to Codecov ──> Coverage Report
                              (Branch coverage %)
```

## Docker Build Flow

```
For each backend (Python, Node.js, Go):
    │
    ├─> Set up Docker Buildx
    │
    ├─> Build image with cache
    │   (cache from: GitHub Actions cache)
    │   (cache to: GitHub Actions cache)
    │
    ├─> Test container startup
    │   • docker run with test env vars
    │   • Wait 5 seconds
    │   • Check container status
    │   • Get logs
    │
    └─> Inspect image
        • Show image details
        • Display layer history
```

## Validation Flow

```
Render.yaml Validation
    │
    ├─> Install yq tool
    │
    ├─> Validate YAML syntax
    │   • Parse with yq
    │   • Check for syntax errors
    │
    ├─> Check required fields
    │   • Verify services exist
    │   • Check service names
    │   • Validate dockerfilePath
    │
    ├─> Verify Dockerfile paths
    │   • Check each file exists
    │   • Ensure paths are correct
    │
    └─> Check environment variables
        • List all env vars
        • Verify JWT_SECRET configured
        • Check DATABASE_URL setup
```

## Security Scanning Flow

```
Security Scan (Trivy)
    │
    ├─> Scan filesystem
    │   • Dependencies
    │   • Configuration files
    │   • Docker images
    │
    ├─> Filter vulnerabilities
    │   (CRITICAL and HIGH only)
    │
    ├─> Generate SARIF report
    │
    └─> Upload to GitHub Security
        • View in Security tab
        • Automated alerts
        • Dependency insights
```

## Timing Breakdown

```
Total CI Runtime: ~10-15 minutes

┌────────────────────────────────────────┐
│ Job                     │ Time         │
├────────────────────────────────────────┤
│ Python Tests            │ ~2 min       │
│ Node.js Tests           │ ~2 min       │
│ Go Tests                │ ~2 min       │
│ Docker Builds (3 imgs)  │ ~5 min       │
│ Frontend Build          │ ~1 min       │
│ Render.yaml Validation  │ ~30 sec      │
│ Security Scan           │ ~2 min       │
│ CI Success Summary      │ ~10 sec      │
└────────────────────────────────────────┘

Note: Jobs run in parallel where possible
Actual wall-clock time: ~6-8 minutes
```

## When CI Runs

```
Triggers:
  • Pull Request to main/develop
  • Push to main/develop
  
Does NOT run on:
  • Draft PRs (optional - can be enabled)
  • Commits to other branches
  • Tag pushes (optional - can be enabled)
```

## CI Status on PR

```
GitHub PR Interface:

┌─────────────────────────────────────────┐
│ Checks                                  │
├─────────────────────────────────────────┤
│ ✅ Python Backend Tests                │
│ ✅ Node.js Backend Tests               │
│ ✅ Go Backend Tests                    │
│ ✅ Docker Build - Python               │
│ ✅ Docker Build - Node.js              │
│ ✅ Docker Build - Go                   │
│ ✅ Frontend Build                      │
│ ✅ Validate Render.yaml                │
│ ⚠️  Security Scan (optional)           │
│ ✅ All CI Checks Passed                │
└─────────────────────────────────────────┘

[Merge pull request] button enabled
```
