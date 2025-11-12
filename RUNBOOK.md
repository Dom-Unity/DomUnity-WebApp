# DomUnity-WebApp Operations Runbook

This runbook covers common operational tasks for maintaining the DomUnity-WebApp on Render.com.

## Table of Contents
1. [Environment Variables Management](#environment-variables-management)
2. [Database Operations](#database-operations)
3. [Running Migrations](#running-migrations)
4. [Rollback Procedures](#rollback-procedures)
5. [Troubleshooting](#troubleshooting)
6. [Monitoring & Logs](#monitoring--logs)
7. [Emergency Procedures](#emergency-procedures)

---

## Environment Variables Management

### Viewing Current Variables

1. Go to Render Dashboard
2. Select the service (`domunity-backend` or `domunity-frontend`)
3. Click **Environment** tab
4. All variables are listed (secrets are masked)

### Adding/Updating Variables

#### Backend Variables:
```bash
DATABASE_URL          # Auto-set from database (don't modify manually)
RUST_LOG              # Logging level: info,domunity_backend=debug
JWT_SECRET            # Secret for JWT token signing (64+ chars)
FRONTEND_URL          # Frontend origin for CORS
PORT                  # Auto-set by Render (don't modify)
```

#### Frontend Variables:
```bash
VITE_API_URL          # Backend URL: https://domunity-backend.onrender.com
```

### Update Process:

1. Navigate to service → **Environment** tab
2. Click **Edit** on the variable
3. Enter new value
4. Click **Save Changes**
5. ⚠️ **Service will automatically redeploy** (takes 2-10 minutes)
6. Monitor logs during redeploy

### Secrets Rotation

#### Rotating JWT_SECRET:

⚠️ **WARNING**: All users will be logged out!

```bash
# Generate new secret
openssl rand -hex 32

# Update in Render:
# 1. Go to domunity-backend → Environment
# 2. Edit JWT_SECRET
# 3. Paste new value
# 4. Save (triggers redeploy)
```

#### Impact:
- All active JWT tokens become invalid
- Users must log in again
- No data loss

---

## Database Operations

### Accessing the Database

#### Via Render Dashboard:

1. Go to `domunity-db` service
2. Click **Connect** (top right)
3. Copy the **Internal Connection String** or **External Connection String**

#### Via psql (locally):

```bash
# Get External Connection String from Render dashboard
psql "postgresql://domunity_user:PASSWORD@HOST/domunity"

# Common commands:
\dt                    # List tables
\d+ users              # Describe users table
SELECT COUNT(*) FROM users;
```

⚠️ **Note**: External access requires adding your IP to IP Allow List (in database settings)

### Database Backups

Render free tier includes automatic daily backups (7-day retention).

#### Manual Backup:

```bash
# Get External Connection String from Render
pg_dump "postgresql://domunity_user:PASSWORD@HOST/domunity" > backup_$(date +%Y%m%d).sql

# Compress
gzip backup_$(date +%Y%m%d).sql
```

#### Restore from Backup:

```bash
# ⚠️ WARNING: This will overwrite all data!
psql "postgresql://domunity_user:PASSWORD@HOST/domunity" < backup_YYYYMMDD.sql
```

### Checking Database Health:

```sql
-- Connection count
SELECT count(*) FROM pg_stat_activity;

-- Database size
SELECT pg_size_pretty(pg_database_size('domunity'));

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Running Migrations

### Automatic Migrations (Default)

Migrations run automatically on backend startup via `sqlx::migrate!()`.

Check backend logs for:
```
Running database migrations...
Database setup complete
```

### Manual Migration (Emergency)

If automatic migrations fail:

#### Option 1: Via Backend Container (Recommended)

```bash
# SSH into backend service (Render Shell)
# Go to: domunity-backend service → Shell tab

# Check migration status
ls -la ./migrations/

# Migrations are embedded in the binary, so they run on startup
# To force re-run, restart the service
```

#### Option 2: Local SQLx CLI

```bash
# Install sqlx-cli locally
cargo install sqlx-cli --no-default-features --features postgres

# Get database URL from Render (External Connection String)
export DATABASE_URL="postgresql://domunity_user:PASSWORD@HOST/domunity"

# Check migration status
cd backend
sqlx migrate info

# Run pending migrations
sqlx migrate run

# Revert last migration (⚠️ use with caution!)
sqlx migrate revert
```

### Adding New Migrations

1. Create new migration file:
```bash
cd backend
sqlx migrate add <descriptive_name>
# Creates: migrations/TIMESTAMP_descriptive_name.sql
```

2. Write SQL:
```sql
-- migrations/002_add_users_table.sql
CREATE TABLE new_table (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

3. Test locally:
```bash
sqlx migrate run
```

4. Commit and push:
```bash
git add backend/migrations/
git commit -m "Add new migration: descriptive_name"
git push origin main
```

5. Backend will auto-deploy and run migration

---

## Rollback Procedures

### Application Rollback (Code)

#### Method 1: Render Dashboard

1. Go to service dashboard
2. Click **Events** tab
3. Find last successful deploy (green checkmark)
4. Click **•••** (three dots) → **Rollback to this version**
5. Confirm rollback
6. Monitor logs for successful restart

#### Method 2: Git Revert

```bash
# Revert last commit
git revert HEAD
git push origin main

# Or revert specific commit
git log --oneline
git revert <commit-hash>
git push origin main
```

⏱️ **Time**: 2-10 minutes

### Database Rollback (Migrations)

⚠️ **DANGEROUS**: Can cause data loss!

#### Option 1: Revert Migration via SQLx

```bash
export DATABASE_URL="<External Connection String>"
cd backend
sqlx migrate revert  # Reverts last migration
```

#### Option 2: Restore from Backup

```bash
# Stop backend first to prevent writes
# Go to Render dashboard → domunity-backend → Settings → Suspend

# Restore database
psql "$DATABASE_URL" < backup_YYYYMMDD.sql

# Resume backend
# Go to Render dashboard → domunity-backend → Resume
```

⏱️ **Time**: 5-30 minutes depending on database size

---

## Troubleshooting

### Backend Won't Start

#### Symptoms:
- Service shows "Deploy failed" or constant restarts
- Health check failing

#### Diagnosis:

```bash
# Check logs (Render Dashboard → domunity-backend → Logs)
# Look for:
# 1. Database connection errors
# 2. Migration failures
# 3. Port binding errors
# 4. Missing environment variables
```

#### Common Fixes:

**Database connection failed:**
```bash
# Verify DATABASE_URL is set (Environment tab)
# Check database is running (domunity-db dashboard → Status)
# Verify backend and database in same region
```

**Migration failed:**
```bash
# Check migration SQL for errors
# Try reverting last migration
sqlx migrate revert

# Or fix schema manually via psql
```

**Port already in use / Bind error:**
```bash
# Render sets PORT automatically
# Don't hardcode port in code - use std::env::var("PORT")
```

### Frontend Not Loading

#### Symptoms:
- Blank page
- 404 errors
- Assets not loading

#### Diagnosis:

```bash
# Check build logs (Render Dashboard → domunity-frontend → Logs)
# Look for:
# 1. npm install failures
# 2. TypeScript errors
# 3. Build command errors
```

#### Common Fixes:

**Build failed:**
```bash
# Check package.json has all dependencies
# Verify build command: cd frontend && npm ci && npm run build
# Check Publish Directory: ./frontend/dist
```

**API calls failing (CORS):**
```bash
# Check VITE_API_URL is set in frontend environment
# Verify backend CORS allows frontend origin
# Check browser console for CORS errors
```

### Database Full (1GB Limit)

#### Symptoms:
- Writes fail
- "disk full" errors

#### Actions:

```bash
# Check size
psql "$DATABASE_URL" -c "SELECT pg_size_pretty(pg_database_size('domunity'));"

# Find largest tables
psql "$DATABASE_URL" -c "
SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname='public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Clean up old data (example)
psql "$DATABASE_URL" -c "
DELETE FROM contact_submissions WHERE created_at < NOW() - INTERVAL '90 days';"

# Vacuum to reclaim space
psql "$DATABASE_URL" -c "VACUUM FULL;"
```

---

## Monitoring & Logs

### Real-Time Logs

#### Backend:
```bash
# Render Dashboard → domunity-backend → Logs
# Filter: "error" or "ERROR"
```

#### Frontend:
```bash
# Render Dashboard → domunity-frontend → Logs
# Check build logs and deploy events
```

#### Database:
```bash
# Render Dashboard → domunity-db → Logs
# Shows connection events and queries (limited)
```

### Metrics

- **CPU/Memory**: Service dashboard → Metrics tab
- **Bandwidth**: Frontend service shows bandwidth usage
- **Response Time**: Not available on free tier

### Log Analysis

```bash
# Search for errors
# Logs tab → Filter box → "error"

# Common patterns:
# - "Connection refused" → Database down or wrong URL
# - "CORS" → Frontend/backend origin mismatch
# - "panicked at" → Rust crash (check backtrace)
# - "ENOENT" → Missing file in build
```

---

## Emergency Procedures

### Complete Service Outage

1. **Check Render Status**: https://status.render.com
2. **Check Service Health**:
   - Backend: `curl https://domunity-backend.onrender.com/`
   - Frontend: `curl https://domunity-frontend.onrender.com/`
3. **Review Recent Deploys**: Events tab - any failed deploys?
4. **Rollback** if recent deploy caused issue
5. **Suspend & Resume** to force restart:
   - Service → Settings → Suspend Service
   - Wait 10 seconds
   - Settings → Resume Service

### Data Loss Emergency

1. **Stop all services immediately**:
   - Suspend backend, frontend services
2. **Assess damage**:
   - Check database tables: `\dt` in psql
   - Check row counts: `SELECT COUNT(*) FROM users;`
3. **Restore from backup**:
   ```bash
   psql "$DATABASE_URL" < latest_backup.sql
   ```
4. **Verify data integrity**
5. **Resume services**

### Security Breach

1. **Rotate ALL secrets immediately**:
   - JWT_SECRET
   - Database password (Render dashboard → domunity-db → Reset Password)
2. **Force logout all users**: Change JWT_SECRET
3. **Review logs for suspicious activity**
4. **Check database for malicious data**:
   ```sql
   SELECT * FROM users ORDER BY created_at DESC LIMIT 100;
   ```
5. **Consider temporary service suspension** during investigation

---

## Support Contacts

- **Render Support**: https://render.com/support (free tier = community forum only)
- **GitHub Issues**: https://github.com/Dom-Unity/DomUnity-WebApp/issues
- **Emergency Contact**: [Your team's contact info]

---

## Useful Commands Cheat Sheet

```bash
# Database size
psql "$DATABASE_URL" -c "SELECT pg_size_pretty(pg_database_size('domunity'));"

# Active connections
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity;"

# Check migration status
cd backend && sqlx migrate info

# Generate JWT secret
openssl rand -hex 32

# Backup database
pg_dump "$DATABASE_URL" | gzip > backup_$(date +%Y%m%d).sql.gz

# Test backend health
curl -v https://domunity-backend.onrender.com/

# Check frontend build
curl -I https://domunity-frontend.onrender.com/
```

---

**Last Updated**: 2025-11-12
