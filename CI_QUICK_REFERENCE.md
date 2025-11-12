# CI Quick Reference Guide

## 🚀 Quick Commands

### Run All Tests Locally
```bash
./run-tests.sh
```

### Run Specific Backend Tests
```bash
# Python
cd backend-python && pytest -v

# Node.js  
cd backend-nodejs && npm test

# Go
cd backend-go && go test -v ./...
```

### Test Docker Builds
```bash
./test-docker-builds.sh
```

### Start Test Database
```bash
docker run --name domunity-test-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=domunity_test \
  -p 5432:5432 -d postgres:15

export TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/domunity_test
```

### Stop Test Database
```bash
docker stop domunity-test-db
docker rm domunity-test-db
```

## 📊 CI Status Checks

| Check | What It Does | Must Pass? |
|-------|--------------|------------|
| Python Backend Tests | Unit + integration tests | ✅ Yes |
| Node.js Backend Tests | Unit + integration tests | ✅ Yes |
| Go Backend Tests | Unit + integration tests | ✅ Yes |
| Docker Build - Python | Builds Python backend image | ✅ Yes |
| Docker Build - Node.js | Builds Node.js backend image | ✅ Yes |
| Docker Build - Go | Builds Go backend image | ✅ Yes |
| Frontend Build | Builds React app | ✅ Yes |
| Validate Render.yaml | Checks deployment config | ✅ Yes |
| Security Scan | Scans for vulnerabilities | ⚠️ Optional |
| All CI Checks Passed | Summary job | ✅ Yes |

## 🔧 Common Issues & Fixes

### ❌ Tests Fail: "Database connection refused"
**Fix:**
```bash
# Ensure PostgreSQL is running
docker ps | grep postgres

# Start if not running
docker start domunity-test-db

# Or create new one
docker run --name domunity-test-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=domunity_test \
  -p 5432:5432 -d postgres:15
```

### ❌ Docker Build Fails: "COPY failed"
**Fix:**
- Check file paths in Dockerfile
- Ensure all files exist
- Verify you're in correct directory

### ❌ Node.js Tests Fail: "Cannot find module"
**Fix:**
```bash
cd backend-nodejs
rm -rf node_modules package-lock.json
npm install
npm test
```

### ❌ Python Tests Fail: "Import error"
**Fix:**
```bash
cd backend-python
pip install -r requirements.txt
./generate_proto.sh  # Regenerate proto files
pytest -v
```

### ❌ Go Tests Fail: "Package not found"
**Fix:**
```bash
cd backend-go
go mod download
go mod tidy
go test -v ./...
```

## 📁 File Locations

### Test Files
```
backend-python/
├── test_unit.py              # Python unit tests
└── test_integration.py       # Python integration tests

backend-nodejs/
└── test/
    ├── unit.test.js          # Node.js unit tests
    └── integration.test.js   # Node.js integration tests

backend-go/
├── main_test.go              # Go unit tests
└── integration_test.go       # Go integration tests
```

### Configuration Files
```
.github/
└── workflows/
    └── ci.yml                # GitHub Actions workflow

backend-python/
├── pyproject.toml            # Pytest config
└── requirements.txt          # Python dependencies

backend-nodejs/
├── jest.config.js            # Jest config
└── package.json              # Node.js dependencies

backend-go/
└── go.mod                    # Go dependencies
```

### Documentation
```
├── CI_SETUP.md                    # Detailed CI docs
├── CI_IMPLEMENTATION.md           # Implementation summary
├── CI_WORKFLOW_DIAGRAM.md         # Visual workflow
├── CI_QUICK_REFERENCE.md          # This file
└── .github/
    └── PULL_REQUEST_TEMPLATE.md   # PR template
```

### Helper Scripts
```
├── run-tests.sh              # Run all tests
└── test-docker-builds.sh     # Test Docker builds
```

## 🎯 PR Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make Changes**
   - Write code
   - Add tests
   - Update docs

3. **Test Locally**
   ```bash
   ./run-tests.sh
   ```

4. **Commit and Push**
   ```bash
   git add .
   git commit -m "Add feature"
   git push origin feature/my-feature
   ```

5. **Create Pull Request**
   - Go to GitHub
   - Click "New Pull Request"
   - Fill in template

6. **Wait for CI**
   - CI runs automatically
   - Fix any failures
   - Get review approval

7. **Merge**
   - Click "Merge pull request"
   - Delete branch

## 🧪 Test Coverage Goals

| Backend | Current | Target |
|---------|---------|--------|
| Python  | TBD     | >80%   |
| Node.js | TBD     | >80%   |
| Go      | TBD     | >80%   |

View coverage reports:
- CI artifacts
- Codecov dashboard (if configured)
- Local: `coverage/` directories

## 🔍 Debugging CI Failures

### View CI Logs
1. Go to PR on GitHub
2. Click "Details" next to failed check
3. Expand failed step
4. Read error message

### Run CI Job Locally

**Using act (optional):**
```bash
# Install act
brew install act  # macOS
# or download from https://github.com/nektos/act

# Run workflow
act pull_request
```

**Manual simulation:**
```bash
# Same environment as CI
docker run -it --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  python:3.11 bash

# Then run test commands
pip install -r backend-python/requirements.txt
pytest backend-python/ -v
```

## 📈 Performance Tips

### Speed Up Local Tests

**Python:**
```bash
# Run only changed tests
pytest --lf  # last failed
pytest -x    # stop on first failure

# Parallel execution
pytest -n auto
```

**Node.js:**
```bash
# Watch mode
npm test -- --watch

# Run specific test
npm test -- unit.test.js
```

**Go:**
```bash
# Run specific test
go test -run TestName

# Verbose + short
go test -v -short ./...
```

### Speed Up Docker Builds

```bash
# Use BuildKit
export DOCKER_BUILDKIT=1

# Build with cache
docker build --cache-from domunity-backend-python:latest \
  -t domunity-backend-python:test ./backend-python
```

## 🎓 Best Practices

### Writing Tests
- ✅ Test one thing per test
- ✅ Use descriptive test names
- ✅ Clean up after tests (database, files)
- ✅ Mock external dependencies
- ✅ Test edge cases

### Before Submitting PR
- ✅ Run tests locally
- ✅ Check code coverage
- ✅ Update documentation
- ✅ Follow style guide
- ✅ Fill PR template

### Maintaining CI
- ✅ Keep dependencies updated
- ✅ Monitor CI run times
- ✅ Fix flaky tests immediately
- ✅ Document new tests
- ✅ Review test failures promptly

## 🆘 Getting Help

1. **Check Documentation**
   - CI_SETUP.md
   - CI_IMPLEMENTATION.md
   - DEPLOYMENT.md

2. **Review Logs**
   - GitHub Actions logs
   - Local test output
   - Docker logs

3. **Common Resources**
   - GitHub Actions docs
   - pytest docs
   - Jest docs
   - Go testing docs

4. **Debugging**
   - Add print/console.log statements
   - Run tests with -v (verbose)
   - Check environment variables
   - Verify database connection

## 📊 CI Metrics

Track these metrics:
- **Pass Rate**: % of PRs that pass CI first try
- **Run Time**: Average CI execution time
- **Coverage**: Code coverage percentage
- **Flakiness**: Tests that fail intermittently

Goal: >95% pass rate, <15 min runtime

## 🔐 Security

CI automatically scans for:
- ✅ Vulnerable dependencies
- ✅ Outdated packages
- ✅ Security issues in code
- ✅ Docker image vulnerabilities

Fix security issues immediately!

## 🎉 Success Criteria

PR is ready to merge when:
- ✅ All tests pass
- ✅ Code coverage maintained/improved
- ✅ Docker builds successful
- ✅ No security vulnerabilities
- ✅ Documentation updated
- ✅ Code reviewed and approved

---

**Quick Tip**: Bookmark this file for fast reference! 🔖
