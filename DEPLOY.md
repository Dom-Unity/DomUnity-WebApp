# DomUnity-WebApp Deployment Guide

This guide explains how to deploy the DomUnity-WebApp to Render.com using the free tier.

## Architecture Overview

- **Frontend**: React (Vite) static site
- **Backend**: Rust (tonic) gRPC-Web service
- **Database**: PostgreSQL (Render free tier)
- **Communication**: gRPC-Web from browser (no Envoy needed - tonic-web handles it)

## Prerequisites

1. A [Render.com](https://render.com) account (free tier)
2. GitHub account with access to the DomUnity-WebApp repository
3. Repository connected to Render

## Deployment Method 1: Blueprint (Recommended)

The easiest way to deploy is using Render's Blueprint feature, which reads the `render.yaml` file.

### Steps:

1. **Connect GitHub to Render**
   - Log in to [Render Dashboard](https://dashboard.render.com)
   - Go to Account Settings → Connect your GitHub account
   - Grant access to the `Dom-Unity/DomUnity-WebApp` repository

2. **Create Blueprint**
   - Navigate to Dashboard → **Blueprints**
   - Click **New Blueprint Instance**
   - Select the `DomUnity-WebApp` repository
   - Select the `main` branch
   - Render will automatically detect `render.yaml`

3. **Configure Service Names**
   - Review the services that will be created:
     - `domunity-backend` (Web Service)
     - `domunity-frontend` (Static Site)
     - `domunity-db` (PostgreSQL)
   - You can customize the names if needed (update URLs in render.yaml accordingly)

4. **Apply Blueprint**
   - Click **Apply**
   - Render will create all three services automatically
   - Database will be provisioned first (takes 1-2 minutes)
   - Backend will build Docker image (takes 5-10 minutes on first deploy)
   - Frontend will build and deploy (takes 2-3 minutes)

5. **Monitor Deployment**
   - Watch the logs for each service in the Render dashboard
   - Backend logs should show:
     ```
     🚀 DomUnity gRPC server starting on 0.0.0.0:XXXX
     📡 Frontend URL: https://domunity-frontend.onrender.com
     🔒 CORS enabled for gRPC-Web
     💚 Health check available
     ```
   - Database migrations will run automatically on backend startup

6. **Verify Deployment**
   - Open the frontend URL: `https://domunity-frontend.onrender.com`
   - Check browser DevTools → Network tab
   - Verify API calls are going to: `https://domunity-backend.onrender.com`
   - Backend health check: `https://domunity-backend.onrender.com/` (should return empty 200 or gRPC error)

### Important Notes:

- **First deploy takes 10-15 minutes** due to Docker image build
- **Free tier services sleep after 15 minutes of inactivity** - first request after sleep takes ~30 seconds
- **Database is private** (internal access only) for security
- All services auto-deploy on push to `main` branch

## Deployment Method 2: Manual Service Creation (Fallback)

If Blueprint deployment fails, create services manually:

### Step 1: Create PostgreSQL Database

1. Dashboard → **New** → **PostgreSQL**
2. Settings:
   - Name: `domunity-db`
   - Database: `domunity`
   - User: `domunity_user`
   - Region: Choose closest to you
   - Plan: **Free**
3. Click **Create Database**
4. Wait for provisioning (1-2 minutes)
5. Copy the **Internal Database URL** from the database dashboard

### Step 2: Create Backend Service

1. Dashboard → **New** → **Web Service**
2. Connect repository: `Dom-Unity/DomUnity-WebApp`
3. Settings:
   - Name: `domunity-backend`
   - Region: Same as database
   - Branch: `main`
   - Runtime: **Docker**
   - Dockerfile Path: `./backend/Dockerfile`
   - Docker Context: `.` (repository root)
   - Plan: **Free**
4. **Environment Variables** (click "Advanced"):
   ```
   DATABASE_URL=<paste Internal Database URL from Step 1>
   RUST_LOG=info,domunity_backend=debug
   JWT_SECRET=<generate random 64-char string>
   FRONTEND_URL=https://domunity-frontend.onrender.com
   ```
5. **Health Check Path**: `/`
6. Click **Create Web Service**
7. Wait for Docker build (5-10 minutes)

### Step 3: Create Frontend Service

1. Dashboard → **New** → **Static Site**
2. Connect repository: `Dom-Unity/DomUnity-WebApp`
3. Settings:
   - Name: `domunity-frontend`
   - Region: Same as backend
   - Branch: `main`
   - Build Command: `cd frontend && npm ci && npm run build`
   - Publish Directory: `./frontend/dist`
   - Plan: **Free**
4. **Environment Variables**:
   ```
   VITE_API_URL=https://domunity-backend.onrender.com
   ```
5. Click **Create Static Site**
6. Wait for build (2-3 minutes)

### Step 4: Update CORS (if needed)

If you chose custom service names, update the backend's `FRONTEND_URL` environment variable to match your actual frontend URL.

## Post-Deployment Checks

### 1. Backend Health
```bash
curl https://domunity-backend.onrender.com/
# Should return empty response or gRPC error (both are OK)
```

### 2. Database Migrations
Check backend logs for:
```
Running database migrations...
Database setup complete
```

### 3. Frontend → Backend Communication
- Open frontend in browser: `https://domunity-frontend.onrender.com`
- Open DevTools → Console
- Attempt to sign up or log in
- Check Network tab for requests to backend

### 4. Common Issues

**Backend won't start:**
- Check DATABASE_URL is set correctly (Internal Database URL)
- Verify migrations ran successfully in logs
- Check JWT_SECRET is set

**Frontend can't reach backend:**
- Verify VITE_API_URL environment variable in frontend service
- Check backend CORS settings allow frontend origin
- Ensure backend service is running (not in error state)

**Database connection errors:**
- Use Internal Database URL (not External)
- Verify database is fully provisioned
- Check database and backend are in same region

## Updating Environment Variables

1. Go to service dashboard
2. Click **Environment** tab
3. Edit variable value
4. Click **Save Changes**
5. Service will automatically redeploy (takes 2-3 minutes)

## Rolling Back

### Via Dashboard:
1. Go to service → **Events** tab
2. Find previous successful deploy
3. Click **Rollback to this version**

### Via Git:
```bash
git revert HEAD
git push origin main
# Services will auto-deploy previous version
```

## Monitoring

- **Logs**: Each service dashboard → **Logs** tab (real-time)
- **Metrics**: Dashboard shows CPU, memory, bandwidth (limited on free tier)
- **Events**: See all deploys, crashes, and restarts

## Cost Management (Free Tier Limits)

- **Web Services**: 750 hours/month (sleeps after 15min inactivity)
- **Static Sites**: 100GB bandwidth/month
- **PostgreSQL**: 1GB storage, 97 hours compute/month
- **No credit card required** for free tier

## Next Steps

- Set up custom domain (requires paid plan or manual DNS setup)
- Add CI/CD tests before deploy (GitHub Actions)
- Tighten CORS to specific frontend origin
- Set up monitoring alerts (requires paid plan)
- Add backup strategy for database

## Support

- [Render Documentation](https://render.com/docs)
- [Render Community Forum](https://community.render.com)
- [DomUnity GitHub Issues](https://github.com/Dom-Unity/DomUnity-WebApp/issues)
