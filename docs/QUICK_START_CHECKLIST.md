# 🚀 Quick Start Checklist

## ✅ Pre-Setup Checklist

- [ ] Node.js 18+ installed
- [ ] Google Cloud Platform account created
- [ ] Git repository cloned

## 🔑 Google Cloud Setup (15 min)

### Step 1: Create Project
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Create new project: "taipei-night-spots"

### Step 2: Enable APIs
- [ ] Enable **Maps JavaScript API**
- [ ] Enable **Geocoding API** ⭐
- [ ] Enable **Places API** ⭐
- [ ] Enable **Directions API** ⭐

### Step 3: Create Browser Key (Frontend)
- [ ] Create API Key
- [ ] Name: "Browser Key"
- [ ] Restriction type: **HTTP referrers**
- [ ] Add referrers:
  - [ ] `http://localhost:5173/*`
  - [ ] `http://127.0.0.1:5173/*`
- [ ] API restrictions: **Maps JavaScript API**
- [ ] Save key → Copy for `.env.local`

### Step 4: Create Server Key (Backend)
- [ ] Create API Key
- [ ] Name: "Server Key"
- [ ] Restriction type: **None** (for local dev & peer review)
- [ ] API restrictions: **None** (or select all 3 APIs)
- [ ] ⚠️ Note security warning in README
- [ ] Save key → Copy for `.env`

### Step 5: Enable Billing
- [ ] Link billing account (required for Maps APIs)
- [ ] Free tier: $200/month credit (sufficient for this project)

## 🔧 Backend Setup (10 min)

```bash
cd backend
```

- [ ] Install dependencies
  ```bash
  npm install
  ```

- [ ] Create .env file
  ```bash
  cp .env.example .env
  nano .env  # or use your editor
  ```

- [ ] Configure .env
  ```env
  PORT=3000
  CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
  DATABASE_URL="file:./dev.db"
  JWT_SECRET=paste_your_32_char_random_string
  GOOGLE_MAPS_SERVER_KEY=paste_your_server_key
  ```

- [ ] Generate JWT secret (optional - use Node.js):
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- [ ] Initialize database
  ```bash
  npx prisma migrate dev --name init
  ```

- [ ] Seed database (20 Taipei spots)
  ```bash
  npm run db:seed
  ```
  Expected output:
  ```
  ✅ Created demo user: demo@taipei-nights.com
  ✓ 象山六巨石
  ✓ 四獸山...
  ✅ Successfully seeded 20 spots!
  ```

- [ ] Start backend
  ```bash
  npm run dev
  ```
  Expected output:
  ```
  Port: 3000
  CORS Origins: http://localhost:5173, http://127.0.0.1:5173
  Ready to accept requests! 🎉
  ```

## 🎨 Frontend Setup (10 min)

**Open new terminal** (keep backend running)

```bash
cd frontend
```

- [ ] Install dependencies
  ```bash
  npm install
  ```

- [ ] Create .env.local file
  ```bash
  cp .env.example .env.local
  nano .env.local  # or use your editor
  ```

- [ ] Configure .env.local
  ```env
  NEXT_PUBLIC_GOOGLE_MAPS_JS_KEY=paste_your_browser_key
  NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
  ```

- [ ] Start frontend (on port 5173)
  ```bash
  npm run dev
  ```
  Expected output:
  ```
  ▲ Next.js 15.0.3
  - Local:   http://localhost:5173
  Ready in X.Xs
  ```

## 🧪 Verification (5 min)

### Check 1: Backend Running
- [ ] Terminal shows "Port: 3000"
- [ ] CORS shows "http://localhost:5173"
- [ ] Visit http://localhost:3000/health
- [ ] Should see: `{"status":"ok",...}`

### Check 2: Frontend Running
- [ ] Terminal shows "Local: http://localhost:5173"
- [ ] Port is exactly 5173 (not 3000 or other)

### Check 3: Application Works
- [ ] Open http://localhost:5173
- [ ] Redirects to login page
- [ ] Login with demo account:
  - Email: `demo@taipei-nights.com`
  - Password: `demo1234`
- [ ] See map with 20 markers
- [ ] Spots list shows in sidebar
- [ ] Click marker → spot highlights
- [ ] Search works (try "象山")
- [ ] Click + button → create form appears

### Check 4: CRUD Operations
- [ ] Create new spot (test geocoding)
- [ ] Edit your own spot
- [ ] Delete your own spot
- [ ] Cannot edit/delete others' spots

### Check 5: Google Maps Working
- [ ] Map displays correctly
- [ ] No API errors in browser console
- [ ] Markers are visible and clickable
- [ ] Colors match categories

## 🐛 Common Issues

### Port 5173 in use
```bash
lsof -ti:5173 | xargs kill -9
npm run dev
```

### Map not loading
- [ ] Check browser console for errors
- [ ] Verify browser key in .env.local
- [ ] Check key allows localhost:5173/*
- [ ] Wait 5 min after creating key

### CORS errors
- [ ] Check backend .env CORS_ORIGINS
- [ ] Includes both localhost and 127.0.0.1
- [ ] Restart backend after .env changes

### Geocoding fails
- [ ] Server key in backend .env
- [ ] Geocoding API enabled in GCP
- [ ] Billing enabled
- [ ] No quota exceeded errors

### Database errors
```bash
cd backend
rm -f dev.db
npx prisma migrate dev --name init
npm run db:seed
```

## 📝 Final Checklist

Before submitting/sharing:

- [ ] Frontend runs on port 5173
- [ ] Backend CORS allows localhost:5173 and 127.0.0.1:5173
- [ ] Server Key has 3 APIs enabled (Geocoding, Places, Directions)
- [ ] Browser Key allows localhost:5173/*
- [ ] .env files NOT committed to git
- [ ] .env.example files included
- [ ] README.md updated with setup instructions
- [ ] Security warnings documented
- [ ] Demo account works
- [ ] All CRUD operations tested
- [ ] No errors in console

## 🎉 Success Criteria

You're ready when:

✅ Backend running on port 3000
✅ Frontend running on port 5173 (MUST be 5173!)
✅ Can login with demo account
✅ Map displays with 20 spots
✅ Can create/edit/delete spots
✅ Geocoding works (address ↔ coordinates)
✅ No CORS errors
✅ No API key errors

## 📚 Documentation

- [README.md](README.md) - Full documentation
- [SETUP.md](SETUP.md) - Detailed setup guide
- [IMPORTANT_PORT_5173.md](IMPORTANT_PORT_5173.md) - Port configuration
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Architecture overview

---

**Estimated Total Setup Time**: 40 minutes

**Need Help?** Check SETUP.md for detailed troubleshooting
