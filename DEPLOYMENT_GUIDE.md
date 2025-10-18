# 🚀 SkyNest Hotel Management - Complete Deployment Guide

## 📋 Overview

This guide will help you deploy:
1. **PostgreSQL Database** on Render (Free)
2. **Backend API** on Render (Free)
3. **Frontend** on GitHub Pages (Free) - Already deployed!

**Total Cost: $0/month** 💰

---

## 🗄️ **PART 1: Deploy Database on Render**

### Step 1: Create Render Account

1. Go to: https://render.com/
2. Click **"Get Started for Free"**
3. Sign up with your **GitHub account** (easiest)
4. Verify your email

### Step 2: Create PostgreSQL Database

1. **Click "New +"** (top right)
2. Select **"PostgreSQL"**
3. **Configure Database:**
   ```
   Name: skynest-database
   Database: skynest_db
   User: skynest_user (auto-generated)
   Region: Oregon (or closest to you)
   PostgreSQL Version: 16
   Instance Type: Free
   ```
4. Click **"Create Database"**
5. **Wait 2-3 minutes** for provisioning

### Step 3: Get Database Connection String

After database is created:

1. Go to your database dashboard
2. Scroll to **"Connections"** section
3. Copy the **"Internal Database URL"** (starts with `postgresql://`)
   - Format: `postgresql://user:password@host:5432/database`
   - Keep this safe! You'll need it in Part 2

### Step 4: Import Your Database Schema

#### Option A: Using Render Dashboard (Easiest)

1. In your database dashboard, go to **"Shell"** tab
2. Click **"Connect"** - Opens PostgreSQL command line
3. You'll need to manually run your schema commands
   - **Note:** This can be tedious for large schemas

#### Option B: Using pgAdmin or DBeaver (Recommended)

1. **Download pgAdmin:** https://www.pgadmin.org/download/
2. **Open pgAdmin**
3. **Right-click "Servers" → Create → Server**
4. **Connection Tab:**
   ```
   Host: (from your Render connection string)
   Port: 5432
   Database: skynest_db
   Username: (from Render)
   Password: (from Render)
   SSL Mode: Require
   ```
5. **Click "Save"**
6. **Right-click your database → Query Tool**
7. **Open your SQL file:**
   - `C:\Users\nadee\Documents\Database-Project\skynest_schema.sql`
8. **Click "Execute" (F5)**
9. **Wait for import to complete** (~2-3 minutes)

#### Option C: Using Command Line (Advanced)

```bash
# Download your schema file to a temporary location
# Then use psql to import

psql "postgresql://user:password@host:5432/database" < skynest_schema.sql
```

### Step 5: Verify Database Import

1. In pgAdmin or Render Shell:
   ```sql
   -- Check tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   
   -- Check data exists
   SELECT COUNT(*) FROM "Branch";
   SELECT COUNT(*) FROM "Room";
   SELECT COUNT(*) FROM "Guest";
   ```

---

## 🖥️ **PART 2: Deploy Backend API on Render**

### Step 1: Deploy Backend from GitHub

1. Go to Render Dashboard
2. Click **"New +"** → **"Web Service"**
3. **Connect GitHub Repository:**
   - Click **"Connect to GitHub"**
   - Select **"Database-Back"** repository
   - Click **"Connect"**

### Step 2: Configure Backend Service

```
Name: skynest-backend-api
Region: Oregon (same as database)
Branch: main
Root Directory: (leave empty)
Runtime: Node
Build Command: npm install
Start Command: npm start
Instance Type: Free
```

### Step 3: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these one by one:

```
NODE_ENV = production
PORT = 10000
DB_SSL = true
JWT_SECRET = 859e1ce6b592d1784f01a4aa01e6fdfe9f6906664dd94e61212bc49741d7682290e326a88c87c863facac55e4db72c05c1c64f8fd6cd7e10fa3560e68fcb2714
JWT_EXPIRES_IN = 24h
FRONTEND_URL = https://nadeeshanj.github.io
```

**Important:** For `DATABASE_URL` (Manual Entry):

1. **Get your database connection string first:**
   - Go back to your `skynest-database` dashboard (open in new tab)
   - Scroll to **"Connections"** section
   - Copy the **"Internal Database URL"**
   - Format: `postgresql://user:password@internal-host.oregon-postgres.render.com:5432/database`

2. **Add DATABASE_URL environment variable:**
   - Click **"Add Environment Variable"**
   - Key: `DATABASE_URL`
   - Value: *Paste the full connection string you copied*
   - Example: `postgresql://skynest_user:abc123@dpg-xyz-a.oregon-postgres.render.com:5432/skynest_db`

### Step 4: Deploy!

1. Click **"Create Web Service"**
2. **Wait 5-10 minutes** for build and deployment
3. Watch the logs for any errors
4. Look for: `✅ Database connected successfully`

### Step 5: Test Your Backend

Your backend URL will be:
```
https://skynest-backend-api.onrender.com
```

Test endpoints:
```bash
# Test basic endpoint
https://skynest-backend-api.onrender.com/

# Test API endpoint
https://skynest-backend-api.onrender.com/api/branches

# Test rooms
https://skynest-backend-api.onrender.com/api/rooms?limit=5
```

**Note:** First request might be slow (30-60 seconds) as free tier spins up.

---

## 🌐 **PART 3: Connect Frontend to Deployed Backend**

Now update your frontend to use the deployed backend instead of localhost.

### Step 1: Update API Configuration

Go to your frontend project and update the API URL:

**File:** `src/utils/api.js` (or wherever your API URL is defined)

```javascript
// Before (localhost)
const API_BASE_URL = 'http://localhost:5000';

// After (production)
const API_BASE_URL = process.env.REACT_APP_API_URL || 
                     'https://skynest-backend-api.onrender.com';
```

### Step 2: Create Environment File (Optional)

**File:** `.env.production`
```
REACT_APP_API_URL=https://skynest-backend-api.onrender.com
```

### Step 3: Redeploy Frontend

```bash
cd C:\Users\nadee\Documents\Database-Project
npm run deploy
```

---

## ✅ **Verification Checklist**

After completing all steps:

### Database (Render):
- [ ] Database created and running
- [ ] Schema imported successfully
- [ ] Tables contain data
- [ ] Can connect via pgAdmin

### Backend (Render):
- [ ] Service deployed successfully
- [ ] Logs show "Database connected"
- [ ] Logs show "Server running on port 10000"
- [ ] API endpoints return data (test in browser)
- [ ] CORS configured for GitHub Pages

### Frontend (GitHub Pages):
- [ ] Website loads: https://nadeeshanj.github.io/Database-Project/
- [ ] Can see data from deployed backend
- [ ] No CORS errors in browser console
- [ ] Dashboard shows real statistics
- [ ] Can interact with all features

---

## 🔧 **Troubleshooting**

### Database Connection Issues

**Error:** `SSL connection required`
```
Solution: Ensure DB_SSL=true in backend env vars
```

**Error:** `Password authentication failed`
```
Solution: Double-check DATABASE_URL is correctly set
```

### Backend Deployment Issues

**Error:** `Module not found`
```
Solution: Check package.json has all dependencies
Run: npm install --save <missing-package>
```

**Error:** `Port already in use`
```
Solution: Render automatically sets PORT to 10000
Make sure your code uses: process.env.PORT
```

### Frontend Connection Issues

**Error:** `Network Error` or `Failed to fetch`
```
Solution: Update API URL to deployed backend
Check CORS configuration in backend
```

**Error:** `Mixed Content`
```
Solution: Both frontend and backend must use HTTPS
Render provides HTTPS automatically
```

---

## 📊 **Database Management**

### Backup Database

**Option 1: Render Dashboard**
1. Go to database → "Backups" tab
2. Click "Create Backup"
3. Download when complete

**Option 2: pgAdmin**
1. Right-click database → "Backup"
2. Choose location and format
3. Click "Backup"

### Update Schema

```bash
# Connect to database
psql "your-database-url"

# Run migrations
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS new_column VARCHAR(255);
```

---

## 💰 **Cost Breakdown**

| Service | Plan | Cost |
|---------|------|------|
| **Render PostgreSQL** | Free | $0/month |
| **Render Web Service** | Free | $0/month |
| **GitHub Pages** | Free | $0/month |
| **Total** | | **$0/month** |

### Free Tier Limits:
- **Database:** 1GB storage, 100 connections
- **Backend:** 750 hours/month (enough for 24/7)
- **Bandwidth:** 100GB/month outbound
- **Auto-sleep:** After 15 min inactivity (first request slow)

### Upgrade Options:
If you need more resources later:
- **Database:** $7/month (10GB storage)
- **Backend:** $7/month (no sleep, faster)

---

## 🚀 **Going Live Checklist**

Before sharing your website:

1. **Security:**
   - [ ] Change JWT_SECRET to strong random value
   - [ ] Remove test/demo data from database
   - [ ] Enable rate limiting (optional)

2. **Performance:**
   - [ ] Test all pages load correctly
   - [ ] Check mobile responsiveness
   - [ ] Verify images and assets load

3. **Content:**
   - [ ] Update About page with real info
   - [ ] Add contact information
   - [ ] Check all links work

4. **Testing:**
   - [ ] Test user registration/login
   - [ ] Test booking creation
   - [ ] Test all CRUD operations
   - [ ] Test on different browsers

---

## 📝 **Deployment URLs Summary**

Once deployed, save these URLs:

```
Frontend:     https://nadeeshanj.github.io/Database-Project/
Backend API:  https://skynest-backend-api.onrender.com
Database:     (Internal - only accessible by backend)

GitHub Repos:
  Frontend:   https://github.com/NadeeshaNJ/Database-Project
  Backend:    https://github.com/NadeeshaNJ/Database-Back
```

---

## 🎉 **You're Done!**

Your complete hotel management system is now:
- ✅ Fully deployed and online
- ✅ Accessible from anywhere
- ✅ Using real PostgreSQL database
- ✅ Completely FREE to host
- ✅ Production-ready

Share your website with the world! 🌍

---

**Need Help?**
- Render Docs: https://render.com/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/
- React Deployment: https://create-react-app.dev/docs/deployment/

**Next Steps:**
- Add custom domain (optional)
- Set up monitoring/alerts
- Implement analytics
- Add more features!
