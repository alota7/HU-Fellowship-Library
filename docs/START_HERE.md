# 🚀 HU Fellowship Library - Quick Start Guide

## Current Status
✅ Database is set up and running
✅ Admin password has been reset
✅ Route guards have been added
✅ Backend API is configured

---

## 📋 How to Start the Application

You need to open **2 terminal windows** and run these commands:

### Terminal 1 - Backend API Server

```bash
cd /home/salota/Desktop/HU-Fellowship-Library/artifacts/api-server

DATABASE_URL="postgresql://salota@/hu_fellowship_library?host=/var/run/postgresql" \
PORT=3000 \
NODE_ENV=development \
node --enable-source-maps ./dist/index.mjs
```

You should see: `[INFO]: Server listening on port 3000`

---

### Terminal 2 - Frontend Development Server

```bash
cd /home/salota/Desktop/HU-Fellowship-Library/artifacts/hu-fellowship-library

PORT=5173 BASE_PATH=/ pnpm dev
```

You should see: `VITE v7.3.6 ready in XXX ms` and `Local: http://localhost:5173/`

---

## 🌐 Access the Application

Once both servers are running, open your browser and go to:

**http://localhost:5173**

---

## 🔐 Login Credentials

### Admin Account
- **Email:** `samakms77@gmail.com`
- **Password:** `Admin123!`
- **After login:** You'll be redirected to `/admin/dashboard`

### Member Account
1. Go to http://localhost:5173/register
2. Fill in the registration form
3. After registration, you'll be redirected to `/member/dashboard`

---

## 🔍 Troubleshooting

### If the frontend doesn't start:

1. **Check if port 5173 is already in use:**
   ```bash
   lsof -i :5173
   ```
   If something is running, kill it: `kill -9 <PID>`

2. **Try a different port:**
   ```bash
   PORT=5174 BASE_PATH=/ pnpm dev
   ```
   Then open http://localhost:5174

### If the backend doesn't start:

1. **Check if PostgreSQL is running:**
   ```bash
   pg_isready
   ```

2. **Check if database exists:**
   ```bash
   psql -l | grep hu_fellowship_library
   ```

3. **Check if port 3000 is in use:**
   ```bash
   lsof -i :3000
   ```

### If login doesn't work:

1. **Check the browser console (F12) for errors**

2. **Check backend logs in Terminal 1** - you should see login requests

3. **Verify the database has the admin user:**
   ```bash
   psql -d hu_fellowship_library -c "SELECT email, role FROM library_users WHERE email='samakms77@gmail.com'"
   ```

---

## ✅ What Was Fixed

1. **Route Guards Added** - Protected all admin and member routes
2. **Admin Password Reset** - Set to `Admin123!`
3. **API Proxy Configured** - Frontend can communicate with backend
4. **Error Handling Improved** - Better handling of API errors

---

## 📝 Current Architecture

- **Frontend:** React + Vite on port 5173
- **Backend:** Express + Node on port 3000
- **Database:** PostgreSQL (hu_fellowship_library)
- **Authentication:** Session-based with HTTP-only cookies
- **Password Hashing:** scrypt with salt "hu-fellowship-admin-2026"

---

## ⚠️ Known Limitations

1. **In-memory sessions** - You'll need to log in again after server restart
2. **No books in database yet** - You'll see empty state on the homepage
3. **No password reset email** - Requires Resend API key configuration

---

## 🎯 Next Steps After Successful Login

### As Admin:
- Add books to the library
- Create categories
- Manage members
- Approve borrowing requests

### As Member:
- Browse available books
- Request to borrow books
- View your borrowing history
- Submit personal study notes

---

## 🐛 If Nothing Works

Run this command to check if everything is properly set up:

```bash
# Check all services
echo "=== Checking PostgreSQL ==="
pg_isready

echo "=== Checking Database ==="
psql -d hu_fellowship_library -c "SELECT COUNT(*) FROM library_users"

echo "=== Checking Backend ==="
curl -s http://localhost:3000/api/books

echo "=== Checking Frontend ==="
curl -s http://localhost:5173 | grep -i "HU Fellowship"
```

If all checks pass, the application should work!
