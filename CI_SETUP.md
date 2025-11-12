# Continuous Integration (CI) Setup

This document describes the CI/CD pipeline for the DomUnity-WebApp project.

## Overview

The GitHub Actions CI pipeline automatically runs on every pull request and push to `main` or `develop` branches. It includes:

1. **Unit Tests** - Test individual functions and components
2. **Integration Tests** - Test database operations and service interactions
3. **Docker Build Tests** - Verify Docker images build correctly
4. **Frontend Build Tests** - Ensure frontend compiles successfully
5. **Configuration Validation** - Validate `render.yaml` configuration
6. **Security Scanning** - Check for vulnerabilities in dependencies

## CI Workflow Jobs

### 1. Backend Tests (Python, Node.js, Go)

Each backend implementation has its own test suite:

#### Python Backend
- **Location**: `backend-python/`
- **Test Files**: 
  - `test_unit.py` - Unit tests for utilities and functions
  - `test_integration.py` - Integration tests with PostgreSQL
- **Run Locally**:
  ```bash
  cd backend-python
  pip install -r requirements.txt
  pytest test_unit.py -v
  pytest test_integration.py -v  # Requires PostgreSQL
  ```

#### Node.js Backend
- **Location**: `backend-nodejs/`
- **Test Files**:
  - `test/unit.test.js` - Unit tests
  - `test/integration.test.js` - Integration tests
- **Run Locally**:
  ```bash
  cd backend-nodejs
  npm install
  npm test
  ```

#### Go Backend
- **Location**: `backend-go/`
- **Test Files**:
  - `main_test.go` - Unit tests
  - `integration_test.go` - Integration tests
- **Run Locally**:
  ```bash
  cd backend-go
  go test -v ./...
  ```

### 2. Docker Build Tests

Validates that all Docker images build successfully without errors:
- Python backend image
- Node.js backend image
- Go backend image

**Run Locally**:
```bash
# Python
docker build -t domunity-backend-python:test ./backend-python

# Node.js
docker build -t domunity-backend-nodejs:test ./backend-nodejs

# Go
docker build -t domunity-backend-go:test ./backend-go
```

### 3. Frontend Build Test

Ensures the React frontend builds successfully.

**Run Locally**:
```bash
cd frontend
npm install
npm run build
```

### 4. Render.yaml Validation

Validates the Render.com deployment configuration:
- YAML syntax correctness
- Required fields present
- Referenced Dockerfiles exist
- Environment variables configured

### 5. Security Scanning

Uses Trivy to scan for vulnerabilities in:
- Dependencies
- Docker base images
- Application code

## Running Tests Locally

### Prerequisites

1. **Docker** (for running PostgreSQL)
2. **Python 3.11+** (for Python backend)
3. **Node.js 20+** (for Node.js backend and frontend)
4. **Go 1.21+** (for Go backend)

### Setup Test Database

```bash
# Start PostgreSQL for testing
docker run --name domunity-test-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=domunity_test \
  -p 5432:5432 \
  -d postgres:15

# Set environment variable
export TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/domunity_test
```

### Run All Tests

```bash
# Python
cd backend-python
pip install -r requirements.txt
./generate_proto.sh
pytest -v --cov

# Node.js
cd backend-nodejs
npm install
npm run generate-proto
npm test

# Go
cd backend-go
go mod download
go test -v -cover ./...

# Frontend
cd frontend
npm install
npm run build
```

## CI Status Badges

Add these to your README.md:

```markdown
![CI Status](https://github.com/YOUR_USERNAME/DomUnity-WebApp/workflows/CI%20-%20Backend%20Tests%20and%20Docker%20Build/badge.svg)
```

## What the CI Checks For

### ✅ Code Quality
- All tests pass
- No linting errors
- Code coverage reporting

### ✅ Build Verification
- Docker images build successfully
- Frontend compiles without errors
- All backends can start up

### ✅ Configuration
- `render.yaml` is valid
- All referenced files exist
- Required environment variables defined

### ✅ Security
- No critical vulnerabilities in dependencies
- Docker images scanned for security issues

## Troubleshooting

### Tests Fail Locally But Pass in CI
- Check Node.js/Python/Go versions match CI
- Ensure test database is running and accessible
- Verify environment variables are set

### Docker Build Fails
- Check Dockerfile syntax
- Ensure all COPY/ADD sources exist
- Verify base image is accessible

### Integration Tests Fail
- Ensure PostgreSQL is running on port 5432
- Check `TEST_DATABASE_URL` is set correctly
- Verify database schema is created

## Adding New Tests

### Python
```python
# Add to test_unit.py or test_integration.py
def test_new_feature(self):
    # Your test here
    pass
```

### Node.js
```javascript
// Add to test/unit.test.js or test/integration.test.js
it('should test new feature', () => {
    // Your test here
});
```

### Go
```go
// Add to main_test.go or integration_test.go
func TestNewFeature(t *testing.T) {
    // Your test here
}
```

## Coverage Reports

Coverage reports are automatically uploaded to Codecov (if configured). View them at:
- Python: `backend-python/coverage.xml`
- Node.js: `backend-nodejs/coverage/`
- Go: `backend-go/coverage.out`

## Required Secrets

No secrets are required for the CI to run. All tests use mock data and local test databases.

For Codecov integration (optional), add:
- `CODECOV_TOKEN` - Your Codecov upload token

## Best Practices

1. **Write tests for new features** - Add unit tests for new functions
2. **Test edge cases** - Include tests for error conditions
3. **Keep tests fast** - Use mocks for external dependencies in unit tests
4. **Document test setup** - Add comments explaining complex test scenarios
5. **Run tests before pushing** - Catch issues early

## CI Performance

Current CI run time (approximate):
- Python tests: ~2 minutes
- Node.js tests: ~2 minutes
- Go tests: ~2 minutes
- Docker builds: ~5 minutes (with caching)
- Total: ~10-15 minutes

## Future Improvements

- [ ] Add end-to-end tests
- [ ] Performance benchmarking
- [ ] Automated dependency updates
- [ ] Deploy preview environments
- [ ] Load testing
