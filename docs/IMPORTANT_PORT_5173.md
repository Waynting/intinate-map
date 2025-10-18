# ⚠️ CRITICAL: Port 5173 Requirement

## Assignment Specification

This project **MUST** run on **port 5173** for the frontend as per course requirements.

## Configuration Summary

### Frontend (Next.js)
- **Port**: 5173 (fixed in package.json)
- **URLs**:
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`

### Backend (Express)
- **Port**: 3000
- **CORS Origins**:
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`

## Google Maps API Keys

### Browser Key (Frontend)
**HTTP Referrer Restrictions:**
```
http://localhost:5173/*
http://127.0.0.1:5173/*
```

**Enabled API:**
- Maps JavaScript API

### Server Key (Backend)
**⚠️ REQUIRED: Enable ALL three APIs:**
1. **Geocoding API**
2. **Places API**
3. **Directions API**

**IP Restrictions:**
- **Local Development**: None (no restrictions)
- **Production**: Add IP restrictions

**⚠️ SECURITY WARNING:**
Since this app is for local development and peer review, the Server Key should have NO IP restrictions temporarily. However, this poses a security risk if the key is exposed. For production deployment, ALWAYS add IP restrictions.

## Quick Setup

### 1. Backend .env
```bash
PORT=3000
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DATABASE_URL="file:./dev.db"
JWT_SECRET=your_32_char_random_string
GOOGLE_MAPS_SERVER_KEY=your_server_key  # Enable: Geocoding, Places, Directions
```

### 2. Frontend .env.local
```bash
NEXT_PUBLIC_GOOGLE_MAPS_JS_KEY=your_browser_key
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### 3. Run Commands
```bash
# Backend (port 3000)
cd backend
npm run dev

# Frontend (port 5173 - FIXED)
cd frontend
npm run dev  # Automatically uses port 5173
```

## Verification

1. Backend should show:
   ```
   Port: 3000
   CORS Origins: http://localhost:5173, http://127.0.0.1:5173
   ```

2. Frontend should show:
   ```
   - Local:   http://localhost:5173
   ```

3. Open browser: `http://localhost:5173`

## Troubleshooting

### Port 5173 already in use?
```bash
# Kill the process using port 5173
lsof -ti:5173 | xargs kill -9

# Then restart frontend
npm run dev
```

### CORS errors?
- Verify backend CORS_ORIGINS includes both localhost and 127.0.0.1
- Restart backend after changing .env

### Google Maps not loading?
- Check browser key allows `http://localhost:5173/*`
- Check server key has all three APIs enabled
- Wait 5 minutes after creating/modifying keys

## For Peer Review

When sharing your project:
1. Ensure .env files are NOT committed
2. Provide .env.example files
3. Document that reviewers need their own API keys
4. Server Key must have Geocoding + Places + Directions APIs enabled
