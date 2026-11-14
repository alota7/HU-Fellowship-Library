# 🧪 HU Fellowship Library - Testing Guide

## Current Status: ✅ FULLY WORKING

The application is running and authentication is working. Follow these exact steps to test.

---

## 🌐 Access the Application

**Open your browser and go to:**

```
http://localhost:5173
```

---

## ✅ What Should Happen

### When You Open the Site
1. You should see the HU Fellowship Library homepage
2. Beautiful hero section with "A quiet place for deep roots"
3. Navigation bar with "Sign in" button

---

## 🔐 Testing Admin Login

### Step 1: Click "Sign in" or go to `/login`
- URL: http://localhost:5173/login

### Step 2: Enter Credentials
- **Email:** `samakms77@gmail.com`
- **Password:** `Admin123!`

### Step 3: Click "Sign in"

### Step 4: Expected Result
- ✅ Should redirect to: **http://localhost:5173/admin/dashboard**
- ✅ Should see "Steward desk" sidebar
- ✅ Should see admin navigation menu

---

## 🔐 Testing Member Login

### Step 1: Go to `/login`
- URL: http://localhost:5173/login

### Step 2: Enter Credentials
- **Email:** `test@example.com`
- **Password:** `Test123!`

### Step 3: Click "Sign in"

### Step 4: Expected Result
- ✅ Should redirect to: **http://localhost:5173/member/dashboard**
- ✅ Should see "Your library" sidebar
- ✅ Should see member navigation menu

---

## 📝 Testing Member Registration

### Step 1: Click "Create a member account"
- On the login page, click the link at the bottom
- Or go to: http://localhost:5173/register

### Step 2: Fill the Form
- **Name:** Your name (e.g., "John Doe")
- **Email:** Your email (e.g., "john@example.com")
- **Password:** Create a password (e.g., "Password123!")
- **Phone:** Your phone number
- **Department:** Your department (e.g., "Computer Science")
- **School Year:** Your year (e.g., "3rd year")

### Step 3: Click "Create account"

### Step 4: Expected Result
- ✅ Should redirect to: **http://localhost:5173/member/dashboard**
- ✅ Account created in database with role "member"
- ✅ Automatically logged in

---

## ❌ Troubleshooting

### If you see "This site can't be reached"

**Solution:**
1. Check if servers are running:
   ```bash
   curl http://localhost:5173
   curl http://localhost:3000/api/books
   ```

2. If not running, start them:
   ```bash
   cd /home/salota/Desktop/HU-Fellowship-Library/artifacts
   ./start-app.sh
   ```

---

### If login form doesn't submit

**Possible Issues:**

1. **Backend not running:**
   - Check: `curl http://localhost:3000/api/books`
   - Should return: `[]`

2. **CORS error in browser console:**
   - Open browser developer tools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

3. **Wrong credentials:**
   - Make sure you're using exact credentials above
   - Check for typos in email or password

---

### If page shows blank or errors

**Check Browser Console:**
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for red error messages
4. Go to Network tab
5. Refresh page
6. Check for failed requests (red entries)

**Common Issues:**

- **404 errors:** Files not found - rebuild frontend
  ```bash
  cd artifacts/hu-fellowship-library
  PORT=5173 BASE_PATH=/ pnpm build
  ```

- **CORS errors:** Backend proxy not configured
  - Already configured in `vite.config.ts`

- **API errors:** Backend not running
  - Start backend server

---

## 🔍 Verify Backend is Working

### Test Login API Directly:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"samakms77@gmail.com","password":"Admin123!"}'
```

**Expected Response:**
```json
{
  "user": {
    "id": 1,
    "name": "Library Administrator",
    "email": "samakms77@gmail.com",
    "role": "admin",
    ...
  }
}
```

### Test Registration API:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"New User","email":"new@example.com","password":"Pass123!","phone":"123","department":"CS","schoolYear":"3rd"}'
```

**Expected Response:**
```json
{
  "user": {
    "id": 9,
    "name": "New User",
    "email": "new@example.com",
    "role": "member",
    ...
  }
}
```

---

## 📊 Current Database State

### Existing Users:

| Email | Password | Role | Status |
|-------|----------|------|--------|
| samakms77@gmail.com | Admin123! | admin | Active |
| test@example.com | Test123! | member | Active |

### Check Database:
```bash
psql -d hu_fellowship_library -c "SELECT email, role FROM library_users;"
```

---

## ✅ Success Checklist

- [ ] Homepage loads at http://localhost:5173
- [ ] Login page accessible at /login
- [ ] Admin login works and redirects to /admin/dashboard
- [ ] Member login works and redirects to /member/dashboard
- [ ] Registration form accessible at /register
- [ ] Registration creates new member account
- [ ] No errors in browser console
- [ ] No failed network requests
- [ ] Session persists after page refresh

---

## 🐛 If Nothing Works

### Complete Reset:
```bash
# Stop all servers
pkill -f "node.*index.mjs|python3.*http.server|serve.*5173"

# Start fresh
cd /home/salota/Desktop/HU-Fellowship-Library/artifacts/api-server
DATABASE_URL="postgresql://salota@/hu_fellowship_library?host=/var/run/postgresql" \
PORT=3000 \
NODE_ENV=development \
node --enable-source-maps ./dist/index.mjs &
sleep 2

cd /home/salota/Desktop/HU-Fellowship-Library/artifacts/hu-fellowship-library/dist/public
python3 -m http.server 5173 &
sleep 2

# Test
curl http://localhost:3000/api/books
curl http://localhost:5173
```

---

## 📧 Report Issues

If you're still experiencing issues, please provide:

1. **Browser console errors** (F12 → Console tab)
2. **Network tab errors** (F12 → Network tab, show failed requests)
3. **Exact error message** you're seeing
4. **What happens** when you try to login/register
5. **Screenshots** if possible

This will help diagnose the exact issue.
