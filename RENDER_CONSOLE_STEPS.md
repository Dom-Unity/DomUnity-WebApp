# Render Console Setup Steps - Quick Reference

This document provides exact click-by-click instructions for deploying DomUnity-WebApp via the Render console.

## Method 1: Blueprint Deployment (One-Click) ⭐ RECOMMENDED

### Step 1: Access Render Dashboard
1. Go to https://dashboard.render.com
2. Sign in (or create free account)
3. If first time: Connect your GitHub account
   - Click profile icon (top right) → **Account Settings**
   - Scroll to **Git Providers** → Click **Connect GitHub**
   - Authorize Render to access `Dom-Unity/DomUnity-WebApp` repository

### Step 2: Create Blueprint
1. From dashboard homepage, click **Blueprints** in left sidebar
2. Click **New Blueprint Instance** (blue button, top right)
3. Select repository:
   - Repository: `Dom-Unity/DomUnity-WebApp`
   - Branch: `main`
4. Click **Connect**

### Step 3: Review Blueprint Configuration
Render will display the services from `render.yaml`:
```
✓ domunity-backend    (Web Service, Docker)
✓ domunity-frontend   (Static Site)
✓ domunity-db        (PostgreSQL)
```

### Step 4: Customize Service Names (Optional)
- Keep default names OR
- Click "Edit" next to any service to customize:
  - Service name
  - Region (choose closest to you)
  - Instance type (keep "Free")

⚠️ **If you change names**, update URLs in Environment variables!

### Step 5: Apply Blueprint
1. Review service details
2. Click **Apply** (bottom of page)
3. Confirm: **Yes, Create Services**

### Step 6: Wait for Deployment
Watch the deployment progress:

**Database (1-2 minutes)**
- Status: Creating → Provisioning → Available ✓

**Backend (5-10 minutes)**
- Status: Building → Deploying → Live ✓
- Watch logs for:
  ```
  [Cloning repository...]
  [Building Docker image...]
  [Starting container...]
  🚀 DomUnity gRPC server starting on 0.0.0.0:XXXX
  Running database migrations...
  Database setup complete
  ```

**Frontend (2-3 minutes)**
- Status: Building → Deploying → Live ✓
- Watch logs for:
  ```
  [Installing dependencies: npm ci]
  [Building: npm run build]
  [Deploying static files]
  Deploy successful!
  ```

### Step 7: Verify Deployment
1. Click on **domunity-frontend** service
2. Copy the URL (top of page): `https://domunity-frontend.onrender.com`
3. Click to open in browser
4. Verify page loads

5. Open browser DevTools (F12)
6. Go to Network tab
7. Try to sign up / log in
8. Verify requests to: `https://domunity-backend.onrender.com`

### Step 8: Check Environment Variables
1. Click **domunity-backend** service
2. Go to **Environment** tab
3. Verify variables are set:
   - ✓ `DATABASE_URL` (from domunity-db)
   - ✓ `JWT_SECRET` (auto-generated)
   - ✓ `RUST_LOG`
   - ✓ `FRONTEND_URL`
   - ✓ `PORT` (auto-set by Render)

4. Click **domunity-frontend** service
5. Go to **Environment** tab
6. Verify:
   - ✓ `VITE_API_URL` = `https://domunity-backend.onrender.com`

---

## Method 2: Manual Setup (If Blueprint Fails)

### Part A: Create Database

1. Dashboard → Click **New +** (top right)
2. Select **PostgreSQL**
3. Fill in details:
   ```
   Name:     domunity-db
   Database: domunity
   User:     domunity_user
   Region:   [Your choice]
   Plan:     Free
   ```
4. Click **Create Database**
5. Wait for status: **Available** (1-2 min)
6. Copy **Internal Database URL**:
   - Click database name
   - Under "Connections"
   - Copy "Internal Database URL"
   - Example: `postgresql://domunity_user:XXXXX@dpg-XXXXX/domunity`

### Part B: Create Backend Service

1. Dashboard → Click **New +**
2. Select **Web Service**
3. Connect repository:
   - Click **Connect** next to `Dom-Unity/DomUnity-WebApp`
   - If not listed: Click **+ Connect account** → Authorize GitHub
4. Configure service:
   ```
   Name:              domunity-backend
   Region:            [Same as database]
   Branch:            main
   Root Directory:    [leave blank]
   Runtime:           Docker
   Dockerfile Path:   ./backend/Dockerfile
   Docker Context:    . (repository root)
   Instance Type:     Free
   ```
5. Click **Advanced** to add Environment Variables:
   
   Click **Add Environment Variable** for each:
   ```
   DATABASE_URL = [Paste Internal Database URL from Part A]
   RUST_LOG = info,domunity_backend=debug
   JWT_SECRET = [Generate: openssl rand -hex 32]
   FRONTEND_URL = https://domunity-frontend.onrender.com
   ```
   
6. Set **Health Check Path**: `/`
7. Click **Create Web Service**
8. Wait for build (5-10 minutes)

⚠️ **Note the backend URL**: `https://domunity-backend.onrender.com`

### Part C: Create Frontend Service

1. Dashboard → Click **New +**
2. Select **Static Site**
3. Connect same repository: `Dom-Unity/DomUnity-WebApp`
4. Configure service:
   ```
   Name:             domunity-frontend
   Region:           [Same as backend]
   Branch:           main
   Root Directory:   [leave blank]
   Build Command:    cd frontend && npm ci && npm run build
   Publish Dir:      ./frontend/dist
   ```
5. Click **Advanced** to add Environment Variable:
   ```
   VITE_API_URL = https://domunity-backend.onrender.com
   ```
   ⚠️ **Use YOUR backend URL from Part B!**
   
6. Click **Create Static Site**
7. Wait for build (2-3 minutes)

### Part D: Update Backend FRONTEND_URL

1. Go to **domunity-backend** service
2. Click **Environment** tab
3. Find `FRONTEND_URL` variable
4. Click **Edit**
5. Change to your actual frontend URL:
   ```
   https://domunity-frontend.onrender.com
   ```
   ⚠️ **Use YOUR frontend URL from Part C!**
6. Click **Save Changes**
7. Backend will redeploy (2-3 minutes)

---

## Post-Setup: Verify Everything Works

### 1. Check Service Status
All services should show **green "Live"** status:
- ✓ domunity-db (Available)
- ✓ domunity-backend (Live)
- ✓ domunity-frontend (Live)

### 2. Check Backend Logs
1. Click **domunity-backend**
2. Click **Logs** tab
3. Should see:
   ```
   🚀 DomUnity gRPC server starting on 0.0.0.0:XXXX
   📡 Frontend URL: https://domunity-frontend.onrender.com
   🔒 CORS enabled for gRPC-Web
   💚 Health check available
   Running database migrations...
   Database setup complete
   ```

### 3. Check Frontend
1. Open: `https://domunity-frontend.onrender.com`
2. Page should load (may take 30s if first request after sleep)
3. Open DevTools → Console (should have no errors)

### 4. Test API Communication
1. On frontend, try to sign up or log in
2. Open DevTools → Network tab
3. Filter: "Fetch/XHR"
4. Should see requests to backend URL
5. Check response headers include CORS headers:
   ```
   access-control-allow-origin: *
   ```

### 5. Test Database Connection
1. Click **domunity-backend** → **Shell** tab
2. Wait for shell to load
3. Run:
   ```bash
   ls -la ./migrations/
   # Should list migration files
   ```

### 6. Test Health Check
Open in browser or use curl:
```bash
curl https://domunity-backend.onrender.com/
# Returns empty response or gRPC error (both OK)
```

---

## Common Setup Issues

### Issue: "Blueprint validation failed"
**Cause**: Invalid render.yaml syntax
**Fix**:
1. Check render.yaml syntax (YAML is space-sensitive)
2. Ensure all service names are lowercase
3. Try manual setup instead

### Issue: Backend build fails with "proto not found"
**Cause**: Docker context incorrect
**Fix**:
1. Edit backend service
2. Set "Docker Context" to `.` (root directory)
3. Redeploy

### Issue: Frontend shows "Failed to connect"
**Cause**: VITE_API_URL not set or wrong
**Fix**:
1. Go to frontend → Environment
2. Check VITE_API_URL = `https://domunity-backend.onrender.com`
3. Must include `https://` (no trailing slash)
4. Save and redeploy

### Issue: Database connection refused
**Cause**: Using External URL instead of Internal
**Fix**:
1. Go to domunity-db
2. Copy **Internal Database URL** (not External)
3. Update backend DATABASE_URL
4. Redeploy backend

### Issue: "Free instance hours exceeded"
**Cause**: Free tier limits (750hrs/month per service)
**Fix**:
- Services sleep after 15min inactivity (expected)
- Upgrade to paid plan, OR
- Reduce number of services

---

## URLs Reference Card

After successful deployment, save these URLs:

```
Frontend:  https://domunity-frontend.onrender.com
Backend:   https://domunity-backend.onrender.com
Database:  [Internal only - in DATABASE_URL env var]

Dashboard: https://dashboard.render.com
```

---

## Auto-Deploy Setup

By default, all services auto-deploy on push to `main` branch.

**To disable auto-deploy:**
1. Go to service dashboard
2. Click **Settings** tab
3. Scroll to "Build & Deploy"
4. Toggle **Auto-Deploy**: OFF

**To manually deploy:**
1. Service dashboard → Click **Manual Deploy** (top right)
2. Select branch: `main`
3. Click **Deploy**

---

## Need Help?

- 📖 See [DEPLOY.md](./DEPLOY.md) for detailed deployment guide
- 🔧 See [RUNBOOK.md](./RUNBOOK.md) for operations
- 🐛 Report issues: [GitHub Issues](https://github.com/Dom-Unity/DomUnity-WebApp/issues)
- 💬 Render Community: https://community.render.com

---

**Deployment Time Estimate:**
- Blueprint: 10-15 minutes
- Manual: 15-20 minutes
- First request after sleep: ~30 seconds
