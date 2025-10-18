# 私密空間台北 (Intimate Spaces Taipei) - Frontend

Next.js 15 + shadcn/ui frontend for the Intimate Spaces Taipei application - A platform for discovering private accommodation spaces in Taipei.

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Start dev server
npm run dev
```

## Environment Variables

```env
# Google Maps JavaScript API (Browser Key)
NEXT_PUBLIC_GOOGLE_MAPS_JS_KEY=your_browser_api_key

# Backend API URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

## Features

### Pages

- **`/auth/login`** - Login page with demo credentials
- **`/auth/register`** - User registration
- **`/spots`** - Main app (map + spots list)
- **`/spots/new`** - Create new spot
- **`/spots/edit/:id`** - Edit existing spot

### Components

- **GoogleMap** - Interactive map with markers
- **SpotCard** - Spot display with owner actions
- **UI Components** - shadcn/ui (Button, Card, Input, etc.)

### State Management

- Local state with React hooks
- localStorage for JWT token and user info
- Axios interceptors for auth

## Google Maps Setup

1. Get a browser API key from Google Cloud Console
2. Enable Maps JavaScript API
3. Add application restrictions:
   - Development: `http://localhost:*`
   - Production: Your domain

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **Maps**: Google Maps JavaScript API
- **HTTP**: Axios
- **Validation**: Zod
- **Icons**: Lucide React

## Project Structure

```
app/
├── auth/
│   ├── login/page.tsx
│   └── register/page.tsx
├── spots/
│   ├── page.tsx           # Main spots view
│   ├── new/page.tsx        # Create spot
│   └── edit/[id]/page.tsx  # Edit spot
├── layout.tsx
└── page.tsx

components/
├── spots/
│   ├── GoogleMap.tsx
│   └── SpotCard.tsx
└── ui/                     # shadcn/ui components

lib/
├── api.ts                  # API client & types
└── utils.ts                # Utilities

hooks/
└── use-toast.ts            # Toast notifications
```

## Development

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run linter
```

## Map Features

- **Markers**: Color-coded by category
- **Selection**: Click marker to highlight
- **Categories**:
  - 🟡 Skyline (orange)
  - 🟣 Street (purple)
  - 🔴 Rooftop (pink)
  - 🔵 Reflection (blue)
  - 🟢 Landmark (green)

## Authentication Flow

1. User enters credentials
2. Frontend calls `/auth/login`
3. Receives JWT token
4. Stores in localStorage
5. Axios interceptor adds to all requests
6. On 401, clears token and redirects to login

## API Integration

All API calls go through `lib/api.ts`:

```ts
// Example usage
import { authApi, spotsApi } from '@/lib/api';

// Login
const { token, user } = await authApi.login(email, password);

// Create spot
const spot = await spotsApi.create({
  title: "My Spot",
  address: "...",
  bestTime: "night"
});
```

## Troubleshooting

### Map not loading
- Check console for API key errors
- Verify Maps JavaScript API is enabled
- Check key restrictions

### CORS errors
- Backend CORS_ORIGINS must include frontend URL
- Check network tab for exact error

### 401 Unauthorized
- Token expired or invalid
- Clear localStorage and login again
