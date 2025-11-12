# Deployment Guide - DomUnity

Comprehensive deployment guide for the DomUnity property management platform on Render.com.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Architecture Overview](#architecture-overview)
- [Backend Selection](#backend-selection)
- [Database Setup](#database-setup)
- [Backend Deployment](#backend-deployment)
- [Frontend Deployment](#frontend-deployment)
- [Environment Variables](#environment-variables)
- [Monitoring & Logging](#monitoring--logging)
- [Troubleshooting](#troubleshooting)
- [Production Considerations](#production-considerations)

---

## Prerequisites

### Required Accounts
- ✅ **GitHub Account**: For repository hosting
- ✅ **Render.com Account**: For deployment (free tier available)

### Local Development (Optional)
- Docker Desktop (for local testing)
- Git
- Code editor (VS Code recommended)

### Knowledge Requirements
- Basic understanding of:
  - Git and GitHub
  - Environment variables
  - gRPC concepts (helpful but not required)
  - PostgreSQL basics

---

## Architecture Overview

### Deployment Diagram
```
┌─────────────────────────────────────────────────────┐
│              Render.com (Frankfurt)                 │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Frontend (Static Site)                      │  │
│  │  • React 18.2.0                             │  │
│  │  • Served from CDN                          │  │
│  │  • Auto-rebuild on push                     │  │
│  └───────────────┬──────────────────────────────┘  │
│                  │                                  │
│                  │ HTTPS/gRPC-Web                   │
│                  ▼                                  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Backend (Docker Container)                  │  │
│  │  Choose ONE:                                 │  │
│  │  ┌────────────┬────────────┬──────────────┐ │  │
│  │  │  Python    │    Go      │   Node.js    │ │  │
│  │  │  (50051)   │  (50051)   │   (50051)    │ │  │
│  │  └────────────┴────────────┴──────────────┘ │  │
│  │  • gRPC server                              │  │
│  │  • Auto-restart on crash                    │  │
│  │  • Health check: /health                    │  │
│  └───────────────┬──────────────────────────────┘  │
│                  │                                  │
│                  │ PostgreSQL protocol              │
│                  ▼                                  │
│  ┌──────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                         │  │
│  │  • Managed by Render                        │  │
│  │  • Auto-backups (paid plans)                │  │
│  │  • Connection pooling                       │  │
│  │  • Schema auto-init                         │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Service Dependencies
1. **Database** (must start first)
   - Creates PostgreSQL instance
   - Provides `DATABASE_URL` to backend
   
2. **Backend** (depends on database)
   - Connects to database on startup
   - Initializes schema if not exists
   - Inserts sample data
   - Exposes gRPC endpoints
   
3. **Frontend** (depends on backend)
   - Receives `REACT_APP_BACKEND_URL` from backend service
   - Builds static site with backend URL embedded
   - Serves via Render CDN

---

## Backend Selection

You must choose **ONE** backend implementation. Each has identical functionality but different characteristics.

### Decision Matrix

| Criteria | Python | Go | Node.js |
|----------|--------|-----|---------|
| **Cold Start** | ~3s | ~1s | ~2s |
| **Memory (Idle)** | ~100MB | ~20MB | ~80MB |
| **Memory (Load)** | ~200MB | ~50MB | ~150MB |
| **Docker Build** | 3-4 min | 5-6 min | 3-4 min |
| **Image Size** | ~500MB | ~50MB | ~200MB |
| **RPS (Requests/sec)** | ~500 | ~2000 | ~800 |
| **Latency (p95)** | ~50ms | ~20ms | ~30ms |
| **Community** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Learning Curve** | Easy | Medium | Easy |
| **Free Tier Fit** | Good | Excellent | Good |

### Recommendations

**Choose Python if:**
- ✅ Your team knows Python
- ✅ You want quick iteration/debugging
- ✅ You have existing Python infrastructure
- ✅ Code readability is priority
- ⚠️ You're okay with higher memory usage

**Choose Go if:**
- ✅ You need maximum performance
- ✅ You have limited resources (free tier)
- ✅ You want lowest operational costs
- ✅ You prefer compiled languages
- ⚠️ Your team can learn Go syntax

**Choose Node.js if:**
- ✅ Your frontend team is JavaScript-focused
- ✅ You want unified JS/TS stack
- ✅ You have Node.js expertise
- ✅ You need npm ecosystem access
- ⚠️ You're okay with callback/async patterns

### How to Switch Backends

1. **Edit `render.yaml`**:
   ```yaml
   # Comment out the current backend (e.g., Python)
   # backend-python/...
   #   ...
   
   # Uncomment your chosen backend (e.g., Go)
   backend-go/
     ...
   ```

2. **Update Frontend Environment Variable**:
   ```yaml
   # In frontend section, change fromService name
   - key: REACT_APP_BACKEND_URL
     fromService:
       name: domunity-backend-go  # Match your backend
   ```

3. **Commit and Push**:
   ```bash
   git add render.yaml
   git commit -m "Switch to Go backend"
   git push
   ```

Render will automatically redeploy with the new backend.

---

## Database Setup

### Render.com Managed PostgreSQL

The `render.yaml` automatically creates a PostgreSQL database with:

```yaml
databases:
  - name: domunity-db
    databaseName: domunity
    region: frankfurt  # Low latency for Bulgaria
    plan: free
```

### Database Specifications

**Free Tier:**
- 🗄️ **Storage**: 1GB
- 🔗 **Connections**: Up to 97 concurrent
- ⏱️ **Uptime**: 90 days (then expires)
- 💾 **Backups**: None
- 📊 **Version**: PostgreSQL 15

**Starter Plan ($7/month):**
- 🗄️ **Storage**: 10GB
- 🔗 **Connections**: 200 concurrent
- ⏱️ **Uptime**: Unlimited
- 💾 **Backups**: Daily automatic
- 📊 **Version**: PostgreSQL 15

### Schema Initialization

All backends automatically initialize the schema on first connection:

**Tables Created:**
1. `users` - Authentication credentials
2. `user_profiles` - Extended user information
3. `buildings` - Property details
4. `apartments` - Unit information
5. `financial_records` - Billing and payments
6. `events` - Community announcements
7. `contact_requests` - Form submissions

**Sample Data:**
- 3 sample users (passwords: `password123`)
- 1 sample building in Sofia
- 2 sample apartments
- Sample financial records
- Sample events

### Manual Database Access

**Get Connection String:**
```bash
# From Render Dashboard
Database → domunity-db → Info tab → Internal Database URL
```

**Connect with psql:**
```bash
psql "postgresql://user:pass@host:port/domunity"
```

**Common Queries:**
```sql
-- List all users
SELECT id, username, email FROM users;

-- Check building data
SELECT * FROM buildings;

-- View financial summary
SELECT 
  u.username, 
  SUM(f.amount) as total, 
  SUM(CASE WHEN f.paid THEN f.amount ELSE 0 END) as paid
FROM users u
JOIN financial_records f ON u.id = f.user_id
GROUP BY u.username;
```

---

## Backend Deployment

### Python Backend

**File Structure:**
```
backend-python/
├── server.py           # Main gRPC server
├── db.py              # Database operations
├── Dockerfile         # Container image
├── requirements.txt   # Dependencies
├── generate_proto.sh  # Proto compilation
└── .env.example       # Environment template
```

**Dockerfile Details:**
```dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Generate proto bindings
COPY proto/ proto/
RUN python -m grpc_tools.protoc \
    -I./proto \
    --python_out=. \
    --grpc_python_out=. \
    proto/domunity.proto

# Copy application
COPY backend-python/ .

# Run server
CMD ["python", "server.py"]
```

**Dependencies (requirements.txt):**
```
grpcio==1.60.0
grpcio-tools==1.60.0
psycopg2-binary==2.9.9
bcrypt==4.1.2
PyJWT==2.8.0
```

**Build Time**: ~3-4 minutes  
**Image Size**: ~500MB  
**Memory Usage**: ~100-200MB

---

### Go Backend

**File Structure:**
```
backend-go/
├── main.go            # Entry point & auth service
├── services.go        # Other gRPC services
├── Dockerfile         # Multi-stage build
├── go.mod             # Go dependencies
├── go.sum             # Dependency checksums
└── .env.example       # Environment template
```

**Dockerfile Details (Multi-stage):**
```dockerfile
# Stage 1: Build
FROM golang:1.21 AS builder
WORKDIR /app

# Install protoc
RUN apt-get update && apt-get install -y protobuf-compiler

# Install Go proto plugins
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Generate proto bindings
COPY proto/ proto/
RUN protoc --go_out=. --go-grpc_out=. proto/domunity.proto

# Build application
COPY backend-go/ .
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server .

# Stage 2: Runtime
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/server .
CMD ["./server"]
```

**Dependencies (go.mod):**
```go
module github.com/yourusername/domunity-backend-go

go 1.21

require (
    github.com/golang-jwt/jwt/v5 v5.2.0
    github.com/lib/pq v1.10.9
    golang.org/x/crypto v0.18.0
    google.golang.org/grpc v1.60.1
    google.golang.org/protobuf v1.32.0
)
```

**Build Time**: ~5-6 minutes (includes proto compilation)  
**Image Size**: ~50MB (Alpine-based)  
**Memory Usage**: ~20-50MB

---

### Node.js Backend

**File Structure:**
```
backend-nodejs/
├── server.js          # Main gRPC server
├── db.js             # Database operations
├── Dockerfile        # Container image
├── package.json      # Dependencies
└── .env.example      # Environment template
```

**Dockerfile Details:**
```dockerfile
FROM node:20-alpine

# Install protoc
RUN apk add --no-cache protobuf-dev

# Install dependencies
WORKDIR /app
COPY backend-nodejs/package*.json ./
RUN npm ci --only=production

# Generate proto bindings
COPY proto/ proto/
RUN npx grpc_tools_node_protoc \
    --js_out=import_style=commonjs,binary:. \
    --grpc_out=grpc_js:. \
    --plugin=protoc-gen-grpc=./node_modules/.bin/grpc_tools_node_protoc_plugin \
    proto/domunity.proto

# Copy application
COPY backend-nodejs/ .

# Run server
CMD ["node", "server.js"]
```

**Dependencies (package.json):**
```json
{
  "dependencies": {
    "@grpc/grpc-js": "^1.9.14",
    "@grpc/proto-loader": "^0.7.10",
    "pg": "^8.11.3",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "grpc-tools": "^1.12.4"
  }
}
```

**Build Time**: ~3-4 minutes  
**Image Size**: ~200MB (Alpine Node)  
**Memory Usage**: ~80-150MB

---

## Frontend Deployment

### Build Process

**File Structure:**
```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── App.js
│   ├── components/
│   └── pages/
├── package.json
└── [build output]
```

**Build Command:**
```bash
cd frontend && npm ci && npm run build
```

**Build Output:**
```
frontend/build/
├── index.html
├── static/
│   ├── css/
│   ├── js/
│   └── media/
└── manifest.json
```

**Render Configuration:**
```yaml
- type: web
  name: domunity-frontend
  runtime: static
  buildCommand: cd frontend && npm ci && npm run build
  staticPublishPath: ./frontend/build
```

### Environment Variables

**Injected at Build Time:**
```javascript
// Accessible in React via process.env
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
```

**Set by Render:**
```yaml
envVars:
  - key: REACT_APP_BACKEND_URL
    fromService:
      type: web
      name: domunity-backend-python  # Your chosen backend
      property: host
```

⚠️ **Important**: `property: host` returns only the hostname (e.g., `domunity-backend-python-hegi`), not the full URL. You may need to append `.onrender.com` in your frontend code.

### CDN & Caching

Render automatically serves static sites via CDN:
- **Cache Headers**: `max-age=31536000` for assets
- **Compression**: Gzip/Brotli automatic
- **HTTPS**: Free SSL certificate
- **Global CDN**: CloudFlare-backed

---

## Environment Variables

### Backend Variables

**Required:**
```bash
DATABASE_URL=postgresql://user:pass@host:port/domunity
JWT_SECRET=<your-32-char-random-string>
GRPC_PORT=50051
HTTP_PORT=8080  # For HTTP/1.1 health checks
```

**How to Set:**

1. **Via Render Dashboard**:
   ```
   Service → Environment tab → Add Environment Variable
   ```

2. **Via render.yaml** (for JWT_SECRET):
   ```yaml
   envVars:
     - key: JWT_SECRET
       generateValue: true  # Render auto-generates
       # OR
     - key: JWT_SECRET
       value: your-secret-here  # Manual value
   ```

3. **From Database** (DATABASE_URL automatic):
   ```yaml
   envVars:
     - key: DATABASE_URL
       fromDatabase:
         name: domunity-db
         property: connectionString
   ```

### Frontend Variables

**Required:**
```bash
REACT_APP_BACKEND_URL=https://your-backend.onrender.com
```

**How to Set:**
```yaml
envVars:
  - key: REACT_APP_BACKEND_URL
    fromService:
      type: web
      name: domunity-backend-python
      property: host
```

⚠️ **Known Issue**: `property: host` returns incomplete URL. Workaround in code:
```javascript
const backendUrl = process.env.REACT_APP_BACKEND_URL.includes('.')
  ? process.env.REACT_APP_BACKEND_URL
  : `${process.env.REACT_APP_BACKEND_URL}.onrender.com`;
```

---

## Monitoring & Logging

### Log Access

**Render Dashboard:**
```
Service → Logs tab
```

**Real-time logs:**
```bash
# Not supported directly, but you can:
# 1. Use Render Dashboard live view
# 2. Integrate with external logging (LogDNA, Papertrail)
```

### Log Format

All backends use structured logging:

```
================================================================================
STARTING DOMUNITY GRPC SERVER
================================================================================
[2024-01-15 10:30:45] Connecting to database: postgresql://user:***@host:5432/domunity
[2024-01-15 10:30:46] Database connection established
[2024-01-15 10:30:46] Initializing database schema...
[2024-01-15 10:30:47] Schema initialized successfully
[2024-01-15 10:30:47] Inserting sample data...
[2024-01-15 10:30:48] Sample data inserted successfully
================================================================================
gRPC Server Configuration
================================================================================
Port: 50051
Health Check: http://0.0.0.0:8080/health
Services:
  - AuthService
  - UserService
  - BuildingService
  - FinancialService
  - EventService
  - ContactService
  - HealthService
================================================================================
[2024-01-15 10:30:48] gRPC server started successfully
[2024-01-15 10:30:48] Listening on 0.0.0.0:50051
================================================================================
```

### Health Checks

**Endpoint:**
```
GET http://your-backend.onrender.com/health
```

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T10:30:45Z",
  "service": "domunity-backend-python",
  "version": "1.0.0"
}
```

**Render Configuration:**
```yaml
healthCheckPath: /health
```

Render pings this HTTP/1.1 endpoint every 30 seconds. If it fails 3 times, the service restarts automatically.

**Important**: The health check uses a standard HTTP/1.1 REST endpoint (not gRPC) to ensure compatibility with Render.com's monitoring infrastructure. Each backend runs two servers:
- **gRPC Server**: Port 50051 (for application traffic)
- **HTTP Server**: Port 8080 (for health checks only)

### Metrics

**Free Tier Metrics:**
- CPU usage (% of allocated)
- Memory usage (MB)
- Request count (HTTP only)
- Response time (p50, p95, p99)

**Access:**
```
Service → Metrics tab
```

### Alerts

**Free Tier**: No alerts  
**Starter Plan**: Email alerts for:
- Service crashes
- High memory usage
- Failed deploys
- Health check failures

---

## Troubleshooting

### Database Connection Issues

**Symptom:**
```
Error: Could not connect to database
FATAL: password authentication failed
```

**Solutions:**
1. **Check DATABASE_URL**:
   ```bash
   # In Render Dashboard → Backend Service → Environment
   echo $DATABASE_URL
   ```
   Should look like: `postgresql://user:pass@host.oregon-postgres.render.com:5432/dbname`

2. **Verify Database is Running**:
   ```
   Dashboard → domunity-db → Should show "Available"
   ```

3. **Check Connection Limits**:
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   -- Free tier max: 97 connections
   ```

4. **Restart Backend**:
   ```
   Service → Manual Deploy → Clear build cache & deploy
   ```

---

### Backend Build Failures

**Python: Protobuf Compilation Error**
```
Error: protoc: command not found
```
**Fix**: Ensure Dockerfile installs `protobuf-compiler`:
```dockerfile
RUN apt-get update && apt-get install -y protobuf-compiler
```

**Go: Proto Generation Failed**
```
Error: protoc-gen-go: program not found
```
**Fix**: Install Go plugins in Dockerfile:
```dockerfile
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

**Node.js: Module Not Found**
```
Error: Cannot find module '@grpc/grpc-js'
```
**Fix**: Use `npm ci` instead of `npm install` in Dockerfile:
```dockerfile
RUN npm ci --only=production
```

---

### Frontend Build Failures

**Missing Environment Variable**
```
Error: REACT_APP_BACKEND_URL is not defined
```
**Fix**: Check `render.yaml` frontend section:
```yaml
envVars:
  - key: REACT_APP_BACKEND_URL
    fromService:
      name: domunity-backend-python  # Must match backend name
```

**Build Timeout**
```
Error: Build exceeded time limit
```
**Fix**: Optimize `package.json`:
```json
{
  "scripts": {
    "build": "GENERATE_SOURCEMAP=false react-scripts build"
  }
}
```

---

### Runtime Errors

**gRPC Service Unavailable**
```
Error: 14 UNAVAILABLE: Service temporarily unavailable
```
**Causes:**
1. **Free Tier Sleep**: Service slept after 15 minutes inactivity
   - **Fix**: Wait 30 seconds for wake-up
   - **Prevention**: Use [cron-job.org](https://cron-job.org) to ping every 14 minutes

2. **Backend Crashed**: Check logs for errors
   - **Fix**: Review logs, fix code, redeploy

3. **Database Down**: Check database status
   - **Fix**: Restart database from dashboard

**JWT Token Expired**
```
Error: Token has expired
```
**Fix**: Call `RefreshToken` service to get new token. Tokens expire after 24 hours.

**SQL Query Failed**
```
Error: relation "users" does not exist
```
**Fix**: Schema not initialized. Check backend logs:
```
[ERROR] Failed to initialize schema: <error details>
```
Restart backend to retry schema creation.

---

## Production Considerations

### Security

**Must Do:**
- [x] Change sample user passwords
- [ ] Configure CORS for your domain
- [ ] Use environment-specific JWT secrets
- [ ] Enable Render's DDoS protection
- [ ] Set up custom domain with SSL
- [ ] Implement rate limiting (nginx/middleware)
- [ ] Rotate JWT secrets periodically
- [ ] Use PostgreSQL SSL connections

**CORS Configuration:**
```python
# Python backend (server.py)
@app.route('/api/some-endpoint', methods=['POST'])
def some_endpoint():
    response.headers.add('Access-Control-Allow-Origin', 'https://yourdomain.com')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
```

### Performance

**Database Optimization:**
```sql
-- Add indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_financial_user_month ON financial_records(user_id, month, year);
CREATE INDEX idx_events_building_date ON events(building_id, event_date DESC);
```

**Connection Pooling:**
All backends already configured:
- Python: `psycopg2.pool.SimpleConnectionPool(minconn=1, maxconn=10)`
- Go: `db.SetMaxOpenConns(10)`
- Node.js: `pg.Pool({ max: 10 })`

**Caching:**
Consider adding Redis for:
- Session storage
- JWT token blacklist
- Frequently accessed data (building info)

### Scaling

**Horizontal Scaling:**
```yaml
# render.yaml - Paid plans only
services:
  - name: domunity-backend-python
    scaling:
      minInstances: 2
      maxInstances: 10
      targetCPU: 70  # Scale up at 70% CPU
```

**Database Scaling:**
- Free tier: 1GB storage, 97 connections
- Starter: 10GB, 200 connections
- Standard: 50GB, 400 connections
- Pro: 500GB, 500 connections

**Frontend CDN:**
Already optimized with Render's global CDN. No action needed.

### Backups

**Free Tier**: ❌ No backups

**Starter Plan ($7/month)**: 
- ✅ Daily automatic backups (7-day retention)
- ✅ Point-in-time recovery
- ✅ Manual backup on-demand

**Manual Backup (Free Tier):**
```bash
# Export database
pg_dump "$(echo $DATABASE_URL)" > backup-$(date +%Y%m%d).sql

# Restore
psql "$(echo $DATABASE_URL)" < backup-20240115.sql
```

### Monitoring

**Recommended Tools:**
- **Uptime Monitoring**: UptimeRobot (free)
- **Error Tracking**: Sentry (free tier: 5k events/month)
- **Logs**: Papertrail (free tier: 50MB/month)
- **APM**: New Relic (free tier available)

**Integration Example (Sentry):**
```python
# Python backend
import sentry_sdk

sentry_sdk.init(
    dsn="https://your-sentry-dsn",
    traces_sample_rate=1.0,
)
```

### Cost Optimization

**Free Tier Limits:**
- 750 hours/month across all services
- Services sleep after 15 minutes
- 1GB database storage

**Estimated Monthly Cost (Starter Plan):**
- Backend: $7/month (always-on)
- Database: $7/month (10GB)
- Frontend: $0 (static sites are free)
- **Total**: ~$14/month

**Cost-Saving Tips:**
1. Use only one backend (not all three)
2. Optimize Docker images (use Alpine)
3. Enable gzip compression
4. Use Render's free static sites for frontend
5. Monitor database storage usage

---

## Post-Deployment Checklist

- [ ] All services show "Live" status (green)
- [ ] Database shows "Available"
- [ ] Frontend loads at `https://domunity-frontend.onrender.com`
- [ ] Can log in with sample credentials
- [ ] Health endpoint returns 200: `curl https://backend.onrender.com/health`
- [ ] Logs show no errors
- [ ] Sample data visible in database
- [ ] JWT tokens work (login/refresh)
- [ ] CORS configured for your domain
- [ ] Sample passwords changed
- [ ] Custom domain configured (optional)
- [ ] Monitoring/alerts set up (optional)
- [ ] Backup strategy in place (paid plans)

---

## Getting Help

**Resources:**
- 📖 [Render Docs](https://render.com/docs)
- 💬 [Render Community](https://community.render.com/)
- 🐛 [GitHub Issues](https://github.com/yourusername/domunity/issues)

**Common Support Topics:**
1. Database connection issues → Check DATABASE_URL and database status
2. Build failures → Review build logs for specific errors
3. Service sleeping → Upgrade to paid plan or use cron-job to keep warm
4. CORS errors → Configure Access-Control headers in backend

---

**Deployment Complete!** 🎉

Your DomUnity platform is now live and ready to serve your building community.
