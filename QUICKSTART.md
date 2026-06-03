# Quick Start Guide - DomUnity

Deploy your DomUnity platform to Render.com in under 10 minutes.

## Prerequisites

- GitHub account
- Render.com account (free tier is fine)
- A MongoDB database (e.g. a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster) and its connection string
- This repository pushed to GitHub

## 🚀 5-Minute Deployment

### Step 1: Choose Your Backend

Open `render.yaml` and decide which backend to use:

**Option A: Python** (default, recommended for quick start)
```yaml
# Already uncommented - just use as-is
```

**Option B: Node.js** (JavaScript ecosystem)
```yaml
# Comment out the Python backend section
# Uncomment the Node.js backend section
```

### Step 2: Update Frontend Backend Reference

In `render.yaml`, find the frontend section (~line 195) and update the `REACT_APP_BACKEND_URL` to match your chosen backend:

**For Python:**
```yaml
- key: REACT_APP_BACKEND_URL
  fromService:
    type: web
    name: domunity-backend-python  # ✅ Using Python
    property: host
```

**For Node.js:**
```yaml
- key: REACT_APP_BACKEND_URL
  fromService:
    type: web
    name: domunity-backend-nodejs  # Using Node.js
    property: host
```

### Step 3: Generate JWT Secret

Run this command to generate a secure random JWT secret:

```bash
# Linux/Mac/Git Bash:
openssl rand -hex 32

# PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Or use any random string generator
```

Copy the output - you'll need it in Step 5.

### Step 4: Push to GitHub

```bash
cd c:\Users\alext\Documents\GitHub\UI
git add .
git commit -m "Initial DomUnity setup"
git push origin main
```

### Step 5: Deploy to Render.com

1. **Go to Render Dashboard**: https://dashboard.render.com/

2. **Click "New +"** → **"Blueprint"**

3. **Connect Repository**:
   - Select your GitHub repository
   - Choose the `UI` repository
   - Click "Connect"

4. **Set Environment Variables**:
   - Render will detect `render.yaml`
   - Click on **"Environment"** tab
   - Find the `JWT_SECRET` variable and paste the secret you generated in Step 3
   - Set `MONGODB_URI` to your MongoDB connection string (e.g. a free
     [MongoDB Atlas](https://www.mongodb.com/atlas) cluster). Render does not
     provide a managed MongoDB, so create the database there first.
   - Click "Apply"

5. **Deploy**:
   - Click **"Create Resources"**
   - Render will create:
     - Backend service (Python or Node.js)
     - Frontend service (React static site)
   - (Your MongoDB lives in Atlas, not Render.)

6. **Wait for Deployment** (~5-10 minutes):
   - Backend: ~3-5 minutes (building Docker image)
   - Frontend: ~2-3 minutes (npm build)

### Step 6: Access Your Application

Once deployment completes:

1. **Find Frontend URL**:
   - Go to **Dashboard** → **domunity-frontend**
   - Copy the URL (e.g., `https://domunity-frontend.onrender.com`)

2. **Open in Browser**:
   - Visit the URL
   - You should see the DomUnity homepage

3. **Test the App**:
   - Click "Вход" (Login)
   - Try logging in with sample data:
     - Email: `ivan@example.com`
     - Password: `password123`

## ✅ Verification Checklist

- [ ] Database shows "Available" status
- [ ] Backend service shows "Live" status (green dot)
- [ ] Frontend shows "Live" status
- [ ] Frontend URL loads the homepage
- [ ] Login page accessible
- [ ] Can log in with sample credentials

## 🐛 Quick Troubleshooting

### Database Connection Failed
```
Error: Database connection refused
```
**Fix**: Wait 2-3 minutes for database to initialize. Render restarts backend automatically.

### Backend Build Failed
```
Error: Docker build failed
```
**Fix**: Check Render logs for specific error. Common issues:
- Proto file syntax error
- Missing dependency in requirements.txt/go.mod/package.json

### Frontend Can't Connect to Backend
```
Error: Failed to fetch
```
**Fix**: 
1. Check backend is "Live" (not sleeping)
2. Verify `REACT_APP_BACKEND_URL` points to correct backend service
3. Try adding `.onrender.com` to the hostname if using `fromService.property.host`

### "Service Unavailable" on First Request
This is **normal** for free tier. Services sleep after 15 minutes of inactivity.
- **First request**: ~30 seconds to wake up
- **Subsequent requests**: Instant

## 🎯 Next Steps

### 1. **Customize Sample Data**
Edit the backend's `db.py` / `main.go` / `db.js` file:
```python
# backend-python/db.py
def _insert_sample_data(self):
    # Change this data to your building's info
    ...
```

### 2. **Add Your Building**
Use the gRPC services or database directly:
```sql
INSERT INTO buildings (name, address, city, postal_code, total_apartments, year_built)
VALUES ('Your Building', 'Your Address', 'Sofia', '1000', 50, 1990);
```

### 3. **Configure Email**
For password reset functionality, add email service:
- **SendGrid**: Free tier (100 emails/day)
- **Mailgun**: Free tier (5,000 emails/month)
- Update `ForgotPassword` service in backend

### 4. **Monitor Logs**
```
Dashboard → Your Service → Logs tab
```
All backends have extensive logging enabled.

### 5. **Upgrade for Production**
Free tier limitations:
- ❌ Services sleep after 15 minutes
- ❌ 750 hours/month total
- ❌ Limited database storage (1GB)

**Starter Plan** ($7/month per service):
- ✅ Always-on services
- ✅ Unlimited hours
- ✅ 10GB database storage

## 📊 Performance Tips

1. **Keep Backend Warm**: Set up a cron job to ping your backend every 14 minutes
   ```bash
   # Use cron-job.org or similar
   curl https://your-backend.onrender.com/health
   ```

2. **Database Connection Pooling**: Already configured (max 10 connections)

3. **Frontend Caching**: Build output is cached by Render CDN

## 🔒 Security Checklist

- [x] JWT secret is random and secure (32+ characters)
- [x] Passwords are hashed with bcrypt
- [ ] Change sample user passwords in production
- [ ] Configure CORS for your domain
- [ ] Enable Render's DDoS protection
- [ ] Set up custom domain with SSL

## 📈 Monitoring

**Check Service Health**:
```bash
# Backend HTTP health check (standard REST endpoint)
curl https://your-backend.onrender.com/health

# Should return:
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T10:30:45Z",
  "service": "domunity-backend-python",
  "version": "1.0.0"
}
```

**Note**: Each backend runs two servers:
- **gRPC Server** (port 50051): Application traffic
- **HTTP Server** (port 8080): REST API + `/health` health checks

**Watch Logs**:
```
Dashboard → Service → Logs
```
Look for:
```
================================================================================
DOMUNITY gRPC + REST API SERVER
================================================================================
✓ Database connection established successfully to: domunity
✓ Database indexes initialized successfully
✓ Sample data inserted successfully into MongoDB
✓ SERVERS STARTED SUCCESSFULLY
================================================================================
```

## 🎉 Success!

Your DomUnity platform is now live! Share the frontend URL with your building residents.

**Need help?** Check:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide
- [README.md](./README.md) - Full documentation
- Render Dashboard Logs - Real-time debugging

---

**Total Deployment Time**: ~10 minutes ⏱️  
**Cost**: $0/month (free tier) 💰  
**Maintenance**: Minimal (auto-deploys from Git) 🔄
