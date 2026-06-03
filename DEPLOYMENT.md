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
  - gRPC / REST concepts (helpful but not required)
  - MongoDB basics

### Database
- A **MongoDB** database and its connection string. Render does not offer a
  managed MongoDB, so create one (a free [MongoDB Atlas](https://www.mongodb.com/atlas)
  cluster works well) before deploying.

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
│                  │ HTTPS (REST / JSON)              │
│                  ▼                                  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Backend (Docker Container)                  │  │
│  │  Choose ONE:                                 │  │
│  │  ┌──────────────┬──────────────────────────┐ │  │
│  │  │   Python     │        Node.js           │ │  │
│  │  │ REST + gRPC  │      REST + gRPC         │ │  │
│  │  └──────────────┴──────────────────────────┘ │  │
│  │  • REST API (8080) + gRPC (50051)           │  │
│  │  • Auto-restart on crash                    │  │
│  │  • Health check: /health                    │  │
│  └───────────────┬──────────────────────────────┘  │
│                  │                                  │
└──────────────────┼──────────────────────────────────┘
                   │ MongoDB wire protocol (TLS)
                   ▼
        ┌──────────────────────────┐
        │  MongoDB (e.g. Atlas)    │
        │  • External to Render    │
        │  • Indexes auto-created  │
        │  • Sample data seeded    │
        └──────────────────────────┘
```

### Service Dependencies
1. **Database** (external, created first)
   - A MongoDB cluster (e.g. Atlas) you provision yourself
   - Its connection string is set as `MONGODB_URI` on the backend

2. **Backend** (depends on database)
   - Connects to MongoDB on startup
   - Creates indexes if missing
   - Inserts sample data on an empty database
   - Exposes REST + gRPC endpoints

3. **Frontend** (depends on backend)
   - Receives `REACT_APP_BACKEND_URL` from backend service
   - Builds static site with backend URL embedded
   - Serves via Render CDN

---

## Backend Selection

You must choose **ONE** backend implementation. Both expose an identical
REST + gRPC surface over the same MongoDB collections.

### Decision Matrix

| Criteria | Python | Node.js |
|----------|--------|---------|
| **Image Size** | ~500MB | ~200MB |
| **Learning Curve** | Easy | Easy |
| **Status** | Deployed default | Drop-in alternative |

### Recommendations

**Choose Python if:**
- ✅ Your team knows Python
- ✅ You want quick iteration/debugging
- ✅ Code readability is priority

**Choose Node.js if:**
- ✅ Your frontend team is JavaScript-focused
- ✅ You want a unified JS/TS stack
- ✅ You have Node.js expertise

### How to Switch Backends

1. **Edit `render.yaml`**: comment out the Python backend service and uncomment
   the Node.js backend service.

2. **Update Frontend Environment Variable**:
   ```yaml
   # In the frontend section, change fromService name
   - key: REACT_APP_BACKEND_URL
     fromService:
       name: domunity-backend-nodejs  # Match your backend
   ```

3. **Commit and Push**:
   ```bash
   git add render.yaml
   git commit -m "Switch to Node.js backend"
   git push
   ```

Render will automatically redeploy with the new backend.

---

## Database Setup

### MongoDB (external — e.g. MongoDB Atlas)

Render does not provide a managed MongoDB, so create a database yourself:

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a database user and allow network access (`0.0.0.0/0` for a quick start, or Render's egress IPs).
3. Copy the connection string and set it as the `MONGODB_URI` secret on the backend service.

```
mongodb+srv://<user>:<password>@<cluster>/domunity
```

> Backends also accept `DATABASE_URL` if its value begins with `mongodb`.

### Index & Sample-Data Initialization

On startup each backend creates indexes and, if the database is empty, seeds
sample data.

**Collections:**
1. `users` - Authentication credentials + `role`
2. `user_profiles` - Extended user information
3. `buildings` - Property details
4. `apartments` - Unit information (`(building_id, number)` unique)
5. `payments` - Per-period charges and status
6. `maintenance_records` - Building maintenance log
7. `financial_records` - Detailed billing breakdown
8. `events` - Community announcements
9. `contact_requests` - Form & password-reset submissions

**Sample Data (seeded on an empty DB):**
- 4 sample users (password: `test123`), one with `role: admin` (`admin@domunity.bg`)
- 1 sample building in Sofia with apartments
- Sample payments, events, and maintenance records

### Manual Database Access

**Connect with mongosh:**
```bash
mongosh "mongodb+srv://<user>:<password>@<cluster>/domunity"
```

**Common Queries:**
```js
// List all users
db.users.find({}, { email: 1, full_name: 1, role: 1 })

// Check building data
db.buildings.find({})

// Outstanding debt per user
db.payments.aggregate([
  { $match: { status: { $in: ["pending", "overdue"] } } },
  { $group: { _id: "$user_id", debt: { $sum: "$amount" } } }
])
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
grpcio
grpcio-tools
pymongo
bcrypt
PyJWT
```

**Build Time**: ~3-4 minutes  
**Image Size**: ~500MB

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
    "mongodb": "^6.3.0",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "grpc-tools": "^1.12.4",
    "jest": "^29.7.0"
  }
}
```

**Build Time**: ~3-4 minutes  
**Image Size**: ~200MB (Alpine Node)

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
MONGODB_URI=mongodb+srv://user:pass@cluster/domunity
JWT_SECRET=<your-32-char-random-string>
GRPC_PORT=50051
HTTP_PORT=8080  # REST API + health checks
PORT=8080       # Render injects PORT; used as HTTP port fallback
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

3. **MongoDB connection** (set as a secret, never committed):
   ```yaml
   envVars:
     - key: MONGODB_URI
       sync: false  # Prompted/edited in the Render dashboard
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
DOMUNITY gRPC + REST API SERVER
================================================================================
MongoDB URI (obscured): mongodb+srv://user:****@cluster/domunity
✓ Database connection established successfully to: domunity
✓ Database indexes initialized successfully
✓ Sample data inserted successfully into MongoDB
================================================================================
✓ SERVERS STARTED SUCCESSFULLY
================================================================================
gRPC Server: 0.0.0.0:50051
HTTP REST API: 0.0.0.0:8080/api/*
Health Check: 0.0.0.0:8080/health
Registered gRPC Services:
  • domunity.AuthService
  • domunity.UserService
  • domunity.BuildingService
  • domunity.FinancialService
  • domunity.EventService
  • domunity.ContactService
  • domunity.HealthService
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
✗ MONGODB_URI environment variable not set!
# or
MongoServerError: bad auth : authentication failed
```

**Solutions:**
1. **Check MONGODB_URI**: In Render Dashboard → Backend Service → Environment,
   confirm it is set and looks like
   `mongodb+srv://user:pass@cluster.mongodb.net/domunity`.

2. **Verify Atlas network access**: the cluster's IP Access List must allow
   Render's egress (use `0.0.0.0/0` for a quick test).

3. **Verify the database user** exists and the password in the URI is correct
   (URL-encode special characters).

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

**Database operation failed**
```
Error: <operation> error: <details>
```
**Fix**: Confirm the backend connected to MongoDB and seeded indexes/sample data.
Check logs for:
```
✗ Index initialization failed: <error details>
```
Restart the backend to retry. On an empty database, sample data is seeded on
first start.

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
- [ ] Use a MongoDB connection string with TLS (Atlas `mongodb+srv://` enables it)
- [ ] Restrict the MongoDB IP access list to known egress IPs

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
Indexes are created automatically on startup (see each backend's DB module),
including a unique index on `users.email` and a unique `(building_id, number)`
index on `apartments`. MongoDB drivers pool connections by default.

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
Scale the MongoDB tier in your provider (e.g. MongoDB Atlas M0 free → M10+
dedicated) independently of Render.

**Frontend CDN:**
Already optimized with Render's global CDN. No action needed.

### Backups

Backups are managed by your MongoDB provider. MongoDB Atlas offers automated
backups on dedicated tiers; the free M0 tier does not.

**Manual Backup:**
```bash
# Export database
mongodump --uri "$MONGODB_URI" --out backup-$(date +%Y%m%d)

# Restore
mongorestore --uri "$MONGODB_URI" backup-20240115
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
- Frontend: $0 (static sites are free)
- Database: separate (MongoDB Atlas free M0, or paid dedicated tier)
- **Total**: ~$7/month + your MongoDB plan

**Cost-Saving Tips:**
1. Use only one backend (Python or Node.js)
2. Optimize Docker images (use Alpine)
3. Enable gzip compression
4. Use Render's free static sites for frontend
5. Monitor MongoDB storage usage

---

## Post-Deployment Checklist

- [ ] All services show "Live" status (green)
- [ ] MongoDB cluster reachable from the backend (check logs)
- [ ] Frontend loads at `https://domunity-frontend.onrender.com`
- [ ] Can log in with sample credentials (`admin@domunity.bg` / `test123`)
- [ ] Health endpoint returns 200: `curl https://backend.onrender.com/health`
- [ ] Logs show no errors
- [ ] Sample data visible in the database
- [ ] JWT tokens work (login/refresh)
- [ ] CORS restricted to your domain
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
1. Database connection issues → Check `MONGODB_URI` and the MongoDB IP access list
2. Build failures → Review build logs for specific errors
3. Service sleeping → Upgrade to paid plan or use cron-job to keep warm
4. CORS errors → Configure Access-Control headers in backend

---

**Deployment Complete!** 🎉

Your DomUnity platform is now live and ready to serve your building community.
