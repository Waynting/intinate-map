# Setup Guide - Taipei Night Photography Spots

Complete step-by-step setup instructions for the project.

## Prerequisites

- [ ] Node.js 18+ installed
- [ ] npm or yarn package manager
- [ ] Google Cloud Platform account
- [ ] Text editor (VS Code recommended)

## Part 1: Google Maps API Setup (15 min)

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "taipei-night-spots" (or your choice)
4. Click "Create"

### Step 2: Enable APIs

1. In the navigation menu, go to "APIs & Services" → "Library"
2. Search and enable:
   - ✅ **Maps JavaScript API** (for frontend)
   - ✅ **Geocoding API** (for backend)

### Step 3: Create API Keys

#### Browser Key (for frontend)
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Click "Edit API Key" (pencil icon)
4. Name it "Browser Key"
5. Under "Application restrictions":
   - Select "HTTP referrers"
   - Add: `http://localhost:*`
6. Under "API restrictions":
   - Select "Restrict key"
   - Check "Maps JavaScript API"
7. Click "Save"
8. **Copy this key** - you'll need it for frontend

#### Server Key (for backend)
1. Click "Create Credentials" → "API Key"
2. Click "Edit API Key"
3. Name it "Server Key"
4. Under "Application restrictions":
   - Select "None" (for local dev)
   - ⚠️ For production: use IP restrictions
5. Under "API restrictions":
   - Select "Restrict key"
   - Check "Geocoding API"
6. Click "Save"
7. **Copy this key** - you'll need it for backend

### Step 4: Enable Billing (Important!)

⚠️ Google Maps requires billing enabled, even for free tier:

1. Go to "Billing" in Cloud Console
2. Link a billing account
3. Don't worry - you get $200 free credit monthly
4. Our usage will stay well within free tier

## Part 2: Backend Setup (10 min)

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit .env
nano .env  # or use your editor
```

Paste and edit:
```env
PORT=3000
CORS_ORIGINS=http://localhost:3000
DATABASE_URL="file:./dev.db"

# Generate a random 32+ char string for JWT_SECRET
JWT_SECRET=put_your_random_32_char_string_here
JWT_EXPIRES_IN=7d

# Paste your Server Key here
GOOGLE_MAPS_SERVER_KEY=paste_server_key_here
```

💡 Generate JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Initialize Database

```bash
# Run migrations
npx prisma migrate dev --name init

# Seed with 20 Taipei spots
npm run db:seed
```

You should see:
```
✅ Created demo user: demo@taipei-nights.com (password: demo1234)
✓ 象山六巨石
✓ 四獸山（虎/豹）替代展望
...
✅ Successfully seeded 20 spots!
```

### Step 4: Start Backend

```bash
npm run dev
```

You should see:
```
🚀 Taipei Night Spots API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Port: 3000
Ready to accept requests! 🎉
```

✅ Backend is ready! Keep this terminal open.

## Part 3: Frontend Setup (10 min)

### Step 1: Open New Terminal

Keep backend running, open a new terminal window.

### Step 2: Install Dependencies

```bash
cd frontend  # from project root
npm install
```

### Step 3: Configure Environment

```bash
# Copy template
cp .env.example .env.local

# Edit .env.local
nano .env.local  # or use your editor
```

Paste and edit:
```env
# Paste your Browser Key here
NEXT_PUBLIC_GOOGLE_MAPS_JS_KEY=paste_browser_key_here

NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### Step 4: Start Frontend

```bash
npm run dev
```

You should see:
```
▲ Next.js 15.0.3
- Local:        http://localhost:3000
- Ready in 2.5s
```

✅ Frontend is ready!

## Part 4: Test the Application (5 min)

### Step 1: Open Browser

Go to: http://localhost:3000

You should be redirected to the spots page.

### Step 2: Login

If prompted to login:
- Email: `demo@taipei-nights.com`
- Password: `demo1234`

### Step 3: Verify Features

- [ ] Map loads showing Taipei
- [ ] 20 spots appear as markers on map
- [ ] Spots list appears in right sidebar
- [ ] Click a marker → spot card highlights
- [ ] Search works (try "象山")
- [ ] Click + button → create spot form
- [ ] Can create new spot
- [ ] Can edit your own spots
- [ ] Can delete your own spots

## Part 5: API Testing (Optional)

Test backend directly with cURL:

```bash
# Get all spots
curl http://localhost:3000/api/spots

# Register new user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test1234"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test1234"}'

# Copy the token from response, then:
TOKEN="paste_token_here"

curl -X POST http://localhost:3000/api/spots \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"台北101",
    "address":"臺北市信義區信義路五段7號",
    "bestTime":"blue_hour"
  }'
```

## Troubleshooting

### Map doesn't load
```
Error: Google Maps JavaScript API error
```
**Fix:**
- Check browser console for exact error
- Verify Maps JavaScript API is enabled in GCP
- Check browser key restrictions allow `localhost:*`
- Wait 5 minutes after creating key (propagation delay)

### Geocoding fails
```
Error: Failed to geocode address
```
**Fix:**
- Check Geocoding API is enabled in GCP
- Verify server key in backend `.env`
- Check billing is enabled
- Try a simpler address

### CORS errors
```
Access to XMLHttpRequest blocked by CORS
```
**Fix:**
- Check backend `CORS_ORIGINS` includes `http://localhost:3000`
- Restart backend after changing `.env`

### Database errors
```
Prisma Client initialization error
```
**Fix:**
```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

### Port already in use
```
Port 3000 is already in use
```
**Fix:**
- Frontend will auto-use port 3001
- Or change `PORT` in backend `.env`

## Success Checklist

- [ ] Backend running on port 3000
- [ ] Frontend running (port 3000 or 3001)
- [ ] Can login with demo account
- [ ] Map displays correctly
- [ ] 20 seeded spots visible
- [ ] Can search and filter spots
- [ ] Can create new spots
- [ ] Can edit/delete own spots
- [ ] Geocoding works (try adding spot with address)

## Next Steps

- [ ] Try creating your own spots
- [ ] Test the API with Postman/Insomnia
- [ ] Explore the codebase
- [ ] Read API documentation in main README
- [ ] Deploy to production (see deployment guides)

## Getting Help

If you encounter issues:

1. Check the troubleshooting section
2. Review error messages in browser console
3. Check backend logs in terminal
4. Verify environment variables
5. Try deleting `node_modules` and reinstalling

## Clean Reset

To start fresh:

```bash
# Backend
cd backend
rm -rf node_modules dev.db
npm install
npx prisma migrate dev --name init
npm run db:seed

# Frontend
cd frontend
rm -rf node_modules .next
npm install
```

---

🎉 **Congratulations!** You've successfully set up the Taipei Night Photography Spots application!
