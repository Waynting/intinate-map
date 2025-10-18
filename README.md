# 全台私密空間地圖 🏨🗺️

A full-stack web application for discovering private accommodation spaces across Taiwan. Built with Next.js 15, Express, SQLite, and Google Maps APIs.

## 🎯 Features

- **Interactive Map**: Browse accommodation spaces on an interactive Google Maps interface
- **User Authentication**: Secure JWT-based authentication with bcrypt password hashing
- **Place Management**: Full CRUD operations for accommodation places with privacy tags
- **Geocoding Integration**: Automatic address-to-coordinates conversion using Google Maps Geocoding API
- **Smart Search & Filters**: Search by city, type, ratings, and privacy features
- **Reviews & Ratings**: Anonymous reviews with privacy-focused tags
- **Government Data Integration**: Integrated with Taiwan's open data platform

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS + shadcn/ui
- Google Maps JavaScript API
- Axios for API calls
- Zod for validation

**Backend:**
- Node.js + Express
- TypeScript
- SQLite + Prisma ORM
- JWT + bcrypt for auth
- Google Maps Geocoding API
- Zod for validation

### Project Structure

```
Hw4/
├── backend/
│   ├── src/
│   │   ├── auth/          # Authentication routes & services
│   │   ├── spots/         # Spots CRUD routes & services
│   │   ├── maps/          # Google Maps integration
│   │   ├── db/            # Prisma client & seed data
│   │   ├── types.ts       # TypeScript types
│   │   └── index.ts       # Express app entry
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   ├── .env.example       # Environment template
│   └── package.json
│
└── frontend/
    ├── app/
    │   ├── auth/          # Login & register pages
    │   ├── spots/         # Spots listing, create, edit
    │   ├── layout.tsx     # Root layout
    │   └── page.tsx       # Home (redirects to spots)
    ├── components/
    │   ├── ui/            # shadcn/ui components
    │   └── spots/         # Spot-specific components
    ├── lib/
    │   ├── api.ts         # API client & types
    │   └── utils.ts       # Utilities
    ├── .env.example       # Environment template
    └── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Google Cloud Platform account
- Google Maps API keys (both browser and server keys)

### Google Maps API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Maps JavaScript API** (for frontend map display)
   - **Geocoding API** (for backend address conversion)
4. Create two API keys:
   - **Browser Key**: Restrict to your frontend domain (e.g., `http://localhost:3000`)
   - **Server Key**: Restrict to your server IP (optional for local dev)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from template:
```bash
cp .env.example .env
```

4. Configure `.env`:
```env
PORT=3000
CORS_ORIGINS=http://localhost:3000
DATABASE_URL="file:./dev.db"
JWT_SECRET=your_secure_random_string_here
JWT_EXPIRES_IN=7d
GOOGLE_MAPS_SERVER_KEY=your_server_api_key_here
```

5. Initialize database and run migrations:
```bash
npx prisma migrate dev --name init
```

6. Seed database with Taipei night spots:
```bash
npm run db:seed
```

7. Start development server:
```bash
npm run dev
```

Backend will run on `http://localhost:3000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file from template:
```bash
cp .env.example .env.local
```

4. Configure `.env.local`:
```env
NEXT_PUBLIC_GOOGLE_MAPS_JS_KEY=your_browser_api_key_here
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

5. Start development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:3000` (or next available port)

### Default Credentials

After seeding, you can login with:
- **Email**: `demo@taipei-nights.com`
- **Password**: `demo1234`

## 📡 API Documentation

### Authentication Endpoints

#### POST `/auth/register`
Register a new user

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "createdAt": "2025-10-17T..."
  }
}
```

#### POST `/auth/login`
Login and receive JWT token

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### Spots Endpoints

#### GET `/api/spots`
List all public spots (supports filtering)

**Query Parameters:**
- `q` (string): Search query
- `bestTime` (enum): sunset|blue_hour|night|late_night
- `category` (enum): skyline|street|rooftop|reflection|landmark
- `lat` (number): Latitude for radius search
- `lng` (number): Longitude for radius search
- `radius` (number): Search radius in meters
- `limit` (number): Max results (default 50)
- `offset` (number): Pagination offset

**Response (200):**
```json
{
  "spots": [
    {
      "id": "uuid",
      "title": "象山六巨石",
      "description": "101 天際線、藍調、跨年煙火視角",
      "address": "臺北市信義區...",
      "latitude": 25.026,
      "longitude": 121.5709,
      "category": "skyline",
      "bestTime": "blue_hour",
      "lensHint": "24-70",
      "accessNote": "階梯多，帶頭燈",
      "isPublic": true,
      "createdAt": "...",
      "updatedAt": "...",
      "user": {
        "id": "uuid",
        "email": "demo@taipei-nights.com"
      }
    }
  ],
  "total": 20
}
```

#### GET `/api/spots/:id`
Get single spot details

**Response (200):**
```json
{
  "spot": { /* spot object */ }
}
```

#### POST `/api/spots`
Create new spot (requires authentication)

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "title": "My Spot",
  "description": "Great view",
  "address": "臺北市信義區...",  // OR provide lat/lng
  "category": "skyline",
  "bestTime": "night",
  "lensHint": "24-70",
  "accessNote": "Bring tripod"
}
```

**Response (201):**
```json
{
  "message": "Spot created successfully",
  "spot": { /* created spot */ }
}
```

**Notes:**
- If `address` provided without coordinates, backend geocodes it automatically
- If coordinates provided without address, backend does reverse geocoding

#### PATCH `/api/spots/:id`
Update spot (requires authentication, owner only)

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "title": "Updated Title",
  "bestTime": "blue_hour"
  // Any field can be updated
}
```

**Response (200):**
```json
{
  "message": "Spot updated successfully",
  "spot": { /* updated spot */ }
}
```

#### DELETE `/api/spots/:id`
Delete spot (requires authentication, owner only)

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Spot deleted successfully"
}
```

## 🧪 Testing with cURL

### 1. Register a new user
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test1234"}'
```

### 2. Login and get token
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test1234"}'
```

Save the token from response.

### 3. Create spot with address (auto-geocoded)
```bash
TOKEN="your_token_here"

curl -X POST http://localhost:3000/api/spots \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"台北101觀景台",
    "address":"臺北市信義區信義路五段7號",
    "bestTime":"blue_hour",
    "category":"skyline"
  }'
```

### 4. Create spot with coordinates (auto-reverse-geocoded)
```bash
curl -X POST http://localhost:3000/api/spots \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"象山登山口",
    "latitude":25.0260,
    "longitude":121.5709,
    "bestTime":"night",
    "category":"skyline"
  }'
```

### 5. Search spots by radius
```bash
curl "http://localhost:3000/api/spots?lat=25.033&lng=121.565&radius=2000&bestTime=blue_hour"
```

### 6. Update spot
```bash
curl -X PATCH http://localhost:3000/api/spots/<spot_id> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title","bestTime":"night"}'
```

### 7. Delete spot
```bash
curl -X DELETE http://localhost:3000/api/spots/<spot_id> \
  -H "Authorization: Bearer $TOKEN"
```

## 🎨 Frontend Features

### Pages

1. **Login/Register** (`/auth/login`, `/auth/register`)
   - Clean card-based authentication UI
   - Form validation and error handling
   - Demo credentials displayed

2. **Spots Listing** (`/spots`)
   - Split view: Interactive map + scrollable spot cards
   - Real-time marker updates
   - Search and filter functionality
   - Click markers to select spots
   - Floating "Add" button

3. **Create Spot** (`/spots/new`)
   - Form with all spot fields
   - Address OR coordinates input
   - Category and time selectors
   - Optional lens hints and access notes

4. **Edit Spot** (`/spots/edit/:id`)
   - Pre-populated form
   - Same validation as create
   - Owner-only access

### Components

- **GoogleMap**: Interactive map with custom markers
- **SpotCard**: Displays spot info with edit/delete for owners
- **shadcn/ui**: Button, Input, Card, Select, Badge, Toast, etc.

## 🔒 Security

- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens with 7-day expiration
- CORS configured for specific origins
- Owner-only edit/delete enforcement
- Input validation with Zod schemas
- SQL injection prevention via Prisma

## 📊 Database Schema

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  spots        Spot[]
}

model Spot {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(...)
  title       String
  description String?
  address     String?
  latitude    Float
  longitude   Float
  category    String   @default("skyline")
  bestTime    String   @default("night")
  lensHint    String?
  accessNote  String?
  isPublic    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([latitude, longitude])
  @@index([bestTime])
  @@index([category])
}
```

## 🛠️ Development Commands

### Backend
```bash
npm run dev          # Start dev server with watch mode
npm run build        # Build TypeScript
npm run start        # Run production build
npm run db:push      # Push schema changes
npm run db:migrate   # Create migration
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
```

### Frontend
```bash
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## 🐛 Troubleshooting

### Google Maps not loading
- Check browser console for API key errors
- Verify Maps JavaScript API is enabled
- Check domain restrictions on API key

### Geocoding fails
- Verify Geocoding API is enabled
- Check server API key in backend `.env`
- Look for quota/billing issues in GCP console

### Authentication issues
- Clear localStorage and try again
- Check JWT_SECRET is set in backend
- Verify CORS_ORIGINS includes frontend URL

### Database errors
- Delete `dev.db` and run migrations again
- Run `npx prisma generate` to regenerate client
- Check DATABASE_URL in `.env`

## 📝 License

MIT

## 👥 Contributors

Built as HW4 for Web Programming course

## 🙏 Acknowledgments

- Taipei night photography community
- Google Maps Platform
- Next.js and Prisma teams
- shadcn/ui component library
