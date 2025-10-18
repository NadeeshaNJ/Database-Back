# 🚀 Create Render Database - Step by Step

## Step 1: Create Render Account (5 minutes)

1. **Go to:** https://render.com/
2. **Click:** "Get Started for Free"
3. **Sign up with GitHub:**
   - Click "GitHub" button
   - Authorize Render to access your GitHub
   - This makes deployment easier later
4. **Verify your email**
5. **You'll see the Render Dashboard**

---

## Step 2: Create PostgreSQL Database (3 minutes)

### From Render Dashboard:

1. **Click "New +"** (blue button, top right corner)
2. **Select "PostgreSQL"**

### Configure Your Database:

```
Name: skynest-database
Database: skynest_db
User: (auto-generated, will be something like skynest_user)
Region: Oregon (US West) - or closest to you
PostgreSQL Version: 16 (or latest)
```

### Select Free Plan:

```
Instance Type: Free
- ✅ 90 days free
- ✅ 1 GB storage
- ✅ Automatically sleeps after inactivity
- ✅ Perfect for development/testing
```

3. **Click "Create Database"**
4. **Wait 2-3 minutes** for provisioning

You'll see:
```
⏳ Creating database...
⏳ Allocating resources...
✅ Database is live
```

---

## Step 3: Get Connection Details

Once your database is created:

1. **You'll see your database dashboard**
2. **Scroll down to "Connections" section**
3. **You'll see TWO connection strings:**

### External Connection String (PUBLIC - Use this for pgAdmin)
```
postgresql://user:password@hostname.oregon-postgres.render.com:5432/database
```

### Internal Connection String (PRIVATE - Use this for your backend)
```
postgresql://user:password@internal-hostname:5432/database
```

4. **Copy the EXTERNAL Connection String**

---

## Step 4: Parse the Connection String for pgAdmin

Your connection string looks like:
```
postgresql://skynest_user:A1B2C3D4E5F6@dpg-abc123xyz-oregon-postgres.render.com:5432/skynest_db
```

**Break it down:**
```
postgresql://USERNAME:PASSWORD@HOSTNAME:PORT/DATABASE

Where:
- USERNAME: skynest_user
- PASSWORD: A1B2C3D4E5F6
- HOSTNAME: dpg-abc123xyz-oregon-postgres.render.com
- PORT: 5432
- DATABASE: skynest_db
```

---

## Step 5: Configure pgAdmin with Render Details

### Open pgAdmin:

1. **Right-click "Servers"** in left panel
2. **Click "Create" → "Server..."**

### General Tab:
```
Name: SkyNest Render (Cloud)
Server group: Servers
Comments: Production database on Render
```

### Connection Tab - USE YOUR PARSED VALUES:
```
Host name/address:     dpg-abc123xyz-oregon-postgres.render.com
                       ↑ ONLY the hostname part (no postgresql://)
                       
Port:                  5432

Maintenance database:  skynest_db
                       ↑ Database name from connection string

Username:              skynest_user
                       ↑ Username from connection string

Password:              A1B2C3D4E5F6
                       ↑ Password from connection string (between : and @)

☑ Save password
```

### SSL Tab - CRITICAL FOR RENDER:
```
SSL mode: Require
```

### Advanced Tab (Optional):
```
DB restriction: skynest_db
```

3. **Click "Save"**

---

## Step 6: Test Connection

After clicking "Save":

✅ **Success:** You'll see:
```
Servers
  └─ SkyNest Render (Cloud)
      └─ Databases (1)
          └─ skynest_db ← YOUR CLOUD DATABASE (empty for now)
```

❌ **Error:** See troubleshooting below

---

## Step 7: Verify Empty Database

1. **Expand:** SkyNest Render → Databases → skynest_db
2. **Expand:** Schemas → public → Tables
3. **You should see:** *No tables* (it's empty - we'll import schema next)

---

## 🧪 Test from Command Line (Optional)

```powershell
# Test connection with psql (replace with YOUR connection string)
psql "postgresql://skynest_user:password@dpg-abc123xyz-oregon-postgres.render.com:5432/skynest_db"

# If successful:
skynest_db=>

# List tables (should be empty)
\dt

# Exit
\q
```

---

## ⚠️ Common Connection Errors

### Error: "getaddrinfo failed"

**Cause:** Wrong hostname format

**Solution:** 
- ❌ Don't use: `postgresql://user:pass@host.com:5432/db`
- ✅ Use: `host.com` (ONLY the hostname)

### Error: "SSL connection required"

**Cause:** SSL mode not set to "Require"

**Solution:**
- In pgAdmin → Connection → SSL tab → Set to **"Require"**

### Error: "password authentication failed"

**Cause:** Wrong password copied

**Solution:**
- Copy password carefully from Render (between `:` and `@`)
- No spaces, exact characters

### Error: "no pg_hba.conf entry"

**Cause:** Wrong username or database name

**Solution:**
- Use EXACT values from Render connection string

---

## 📋 What You Should Have Now

After completing these steps:

1. ✅ Render account created
2. ✅ PostgreSQL database provisioned on Render
3. ✅ Connection string copied
4. ✅ pgAdmin connected to Render database
5. ✅ Database is empty (ready for schema import)

---

## 🎯 Next Step: Import Your Schema

Once pgAdmin is connected to Render:

1. **Right-click on skynest_db**
2. **Select "Query Tool"**
3. **Click folder icon** (Open File)
4. **Select:** `C:\Users\nadee\Documents\Database-Project\skynest_schema.sql`
5. **Click "Execute" (F5)**
6. **Wait 2-3 minutes** for import to complete
7. **Refresh:** Tables list (you should see all your hotel tables)

---

## 📸 Example Connection String Breakdown

**Render gives you:**
```
postgresql://myuser:xK9f2Lp@dpg-xyz123-oregon-postgres.render.com:5432/mydb_abc
```

**For pgAdmin, use:**
```
Host:     dpg-xyz123-oregon-postgres.render.com
Port:     5432
Database: mydb_abc
Username: myuser
Password: xK9f2Lp
SSL:      Require
```

---

## 💡 Pro Tips

1. **Keep connection string safe** - It contains your password
2. **Render free tier sleeps after inactivity** - First connection may be slow
3. **External URL is for outside access** - Use this for pgAdmin
4. **Internal URL is for Render services** - Your backend will use this
5. **You can create multiple databases** - But free tier is limited to 1

---

## 🆘 Need Help?

**If you haven't created Render database yet:**
- Follow Steps 1-2 above first
- Then come back for pgAdmin connection

**If you've created Render database:**
- Go to Render dashboard
- Click your database
- Copy "External Connection String"
- Use Step 5 to configure pgAdmin

**If connection fails:**
- Double-check hostname (no `postgresql://` prefix)
- Verify SSL is set to "Require"
- Test connection string with psql first

---

Ready to import your schema? Once connected, follow Step "Import Your Schema" above!
