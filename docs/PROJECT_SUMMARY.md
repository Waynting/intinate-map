# Project Summary - Taipei Night Photography Spots

## 📋 Overview

A full-stack web application for discovering and sharing night photography locations in Taipei, featuring:
- Interactive Google Maps integration
- Real-time geocoding (address ↔ coordinates)
- User authentication & authorization
- CRUD operations for photography spots
- Pre-seeded with 20 top Taipei locations

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  Next.js 15 + React 19 + Tailwind + shadcn/ui              │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐     │
│  │   Auth   │  │  Spots   │  │   Google Maps        │     │
│  │  Pages   │  │  CRUD    │  │   JavaScript API     │     │
│  └──────────┘  └──────────┘  └──────────────────────┘     │
│                                                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │         API Client (Axios + JWT Auth)           │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                           ↕ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                             │
│       Node.js + Express + TypeScript + Prisma               │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐     │
│  │   Auth   │  │  Spots   │  │   Google Maps        │     │
│  │  Routes  │  │  Routes  │  │   Geocoding API      │     │
│  └──────────┘  └──────────┘  └──────────────────────┘     │
│                                                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │         SQLite Database (via Prisma)            │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Key Technologies

### Frontend Stack
- **Framework**: Next.js 15 (App Router) + React 19
- **Styling**: Tailwind CSS + shadcn/ui components
- **Maps**: Google Maps JavaScript API (@googlemaps/js-api-loader)
- **HTTP Client**: Axios with interceptors
- **Validation**: Zod schemas
- **Type Safety**: TypeScript 5.6

### Backend Stack
- **Runtime**: Node.js + Express 4
- **Database**: SQLite + Prisma ORM 5
- **Authentication**: JWT + bcrypt (10 rounds)
- **Geocoding**: Google Maps Geocoding API
- **Validation**: Zod schemas
- **Type Safety**: TypeScript 5.6

## 🗂️ Project Structure

```
Hw4/
├── 📄 README.md                    # Main documentation
├── 📄 SETUP.md                     # Step-by-step setup guide
├── 📄 PROJECT_SUMMARY.md           # This file
├── 📄 .gitignore                   # Git ignore rules
│
├── 📁 backend/                     # Backend API
│   ├── 📄 package.json
│   ├── 📄 tsconfig.json
│   ├── 📄 .env.example
│   ├── 📄 README.md
│   │
│   ├── 📁 prisma/
│   │   └── 📄 schema.prisma        # Database schema
│   │
│   └── 📁 src/
│       ├── 📄 index.ts             # Express app entry
│       ├── 📄 types.ts             # TypeScript types
│       │
│       ├── 📁 auth/
│       │   ├── 📄 service.ts       # Auth logic (JWT, bcrypt)
│       │   └── 📄 routes.ts        # Auth endpoints
│       │
│       ├── 📁 spots/
│       │   ├── 📄 service.ts       # Spots CRUD logic
│       │   └── 📄 routes.ts        # Spots endpoints
│       │
│       ├── 📁 maps/
│       │   └── 📄 google.ts        # Geocoding integration
│       │
│       └── 📁 db/
│           ├── 📄 prisma.ts        # Prisma client
│           └── 📄 seed.ts          # Seed 20 Taipei spots
│
└── 📁 frontend/                    # Frontend App
    ├── 📄 package.json
    ├── 📄 tsconfig.json
    ├── 📄 next.config.js
    ├── 📄 tailwind.config.ts
    ├── 📄 .env.example
    ├── 📄 README.md
    │
    ├── 📁 app/
    │   ├── 📄 layout.tsx           # Root layout
    │   ├── 📄 page.tsx             # Home (redirect)
    │   ├── 📄 globals.css          # Global styles
    │   │
    │   ├── 📁 auth/
    │   │   ├── 📁 login/
    │   │   │   └── 📄 page.tsx     # Login page
    │   │   └── 📁 register/
    │   │       └── 📄 page.tsx     # Register page
    │   │
    │   └── 📁 spots/
    │       ├── 📄 page.tsx         # Main spots view (map + list)
    │       ├── 📁 new/
    │       │   └── 📄 page.tsx     # Create spot
    │       └── 📁 edit/
    │           └── 📁 [id]/
    │               └── 📄 page.tsx # Edit spot
    │
    ├── 📁 components/
    │   ├── 📁 spots/
    │   │   ├── 📄 GoogleMap.tsx    # Interactive map
    │   │   └── 📄 SpotCard.tsx     # Spot card component
    │   │
    │   └── 📁 ui/                  # shadcn/ui components
    │       ├── 📄 button.tsx
    │       ├── 📄 card.tsx
    │       ├── 📄 input.tsx
    │       ├── 📄 select.tsx
    │       ├── 📄 badge.tsx
    │       ├── 📄 toast.tsx
    │       └── ...
    │
    ├── 📁 lib/
    │   ├── 📄 api.ts               # API client + types
    │   └── 📄 utils.ts             # Utilities
    │
    └── 📁 hooks/
        └── 📄 use-toast.ts         # Toast notifications
```

## 🔑 Key Features Implemented

### 1. Authentication & Authorization ✅
- User registration with email/password
- Secure login with JWT tokens (7-day expiration)
- Password hashing with bcrypt (10 rounds)
- Protected routes requiring authentication
- Owner-only edit/delete enforcement

### 2. Spots Management (CRUD) ✅
- **Create**: Add spots with address OR coordinates
- **Read**: List all spots, view single spot details
- **Update**: Edit spot details (owner only)
- **Delete**: Remove spots (owner only)
- Public/private visibility control

### 3. Google Maps Integration ✅
- **Frontend**: Interactive map with custom markers
- **Backend**: Geocoding API integration
  - Address → Coordinates (geocoding)
  - Coordinates → Address (reverse geocoding)
  - Automatic conversion on create/update

### 4. Search & Filtering ✅
- Text search across title, description, address
- Filter by best time (sunset, blue hour, night, late night)
- Filter by category (skyline, street, rooftop, reflection, landmark)
- Radius-based location search (lat/lng + meters)

### 5. UI/UX Features ✅
- Responsive design (desktop + mobile)
- Interactive map with color-coded markers
- Real-time spot selection (map ↔ list sync)
- Toast notifications for user feedback
- Loading states and error handling
- Dark/light mode support (Tailwind)

### 6. Developer Experience ✅
- Full TypeScript coverage
- Type-safe API client
- Zod validation schemas
- Prisma ORM with migrations
- Hot reload (both frontend and backend)
- Comprehensive error handling

## 📊 Database Schema

### User Model
```typescript
{
  id: string (UUID)
  email: string (unique)
  passwordHash: string
  createdAt: DateTime
  spots: Spot[] (relation)
}
```

### Spot Model
```typescript
{
  id: string (UUID)
  userId: string (FK)
  title: string
  description?: string
  address?: string
  latitude: number
  longitude: number
  category: enum (skyline|street|rooftop|reflection|landmark)
  bestTime: enum (sunset|blue_hour|night|late_night)
  lensHint?: string
  accessNote?: string
  isPublic: boolean
  createdAt: DateTime
  updatedAt: DateTime
}
```

## 🔌 API Endpoints Summary

### Authentication
```
POST   /auth/register      # Register user
POST   /auth/login         # Login (get JWT)
POST   /auth/logout        # Logout (client-side)
```

### Spots
```
GET    /api/spots          # List spots (with filters)
GET    /api/spots/:id      # Get single spot
POST   /api/spots          # Create spot (auth)
PATCH  /api/spots/:id      # Update spot (auth, owner)
DELETE /api/spots/:id      # Delete spot (auth, owner)
```

### Health
```
GET    /health             # Server status
```

## 🌟 Unique Features

1. **Smart Geocoding**: Automatically converts between addresses and coordinates
2. **Owner-Only Permissions**: Users can only edit/delete their own spots
3. **Color-Coded Markers**: Each category has its own color on the map
4. **Seeded Data**: Pre-loaded with 20 real Taipei night photo spots
5. **Radius Search**: Find spots within X meters of a location
6. **Real-Time Sync**: Map selection syncs with spot list

## 📈 Performance Optimizations

- Database indexes on lat/lng, bestTime, category
- Axios request/response interceptors
- Prisma connection pooling (singleton)
- Next.js automatic code splitting
- Lazy loading for map components
- Efficient re-renders with React keys

## 🔒 Security Measures

- ✅ Password hashing (bcrypt, 10 rounds)
- ✅ JWT with expiration
- ✅ CORS protection
- ✅ SQL injection prevention (Prisma)
- ✅ Input validation (Zod)
- ✅ Owner-only authorization
- ✅ HTTP-only recommendations
- ✅ API key restrictions (GCP)

## 📚 Documentation Files

1. **README.md** - Main documentation with full API reference
2. **SETUP.md** - Step-by-step setup guide with troubleshooting
3. **backend/README.md** - Backend-specific documentation
4. **frontend/README.md** - Frontend-specific documentation
5. **PROJECT_SUMMARY.md** - This architectural overview

## 🧪 Testing Coverage

### Manual Testing Checklist
- [x] User registration
- [x] User login/logout
- [x] Create spot with address (geocoding)
- [x] Create spot with coordinates (reverse geocoding)
- [x] Edit own spot
- [x] Delete own spot
- [x] Search spots by keyword
- [x] Filter by category/time
- [x] Radius-based search
- [x] Map marker selection
- [x] Responsive design

### cURL Test Examples
Provided in README.md (7+ examples)

## 🚀 Getting Started

1. **Prerequisites**: Node.js 18+, Google Cloud account
2. **Google Setup**: Create API keys (browser + server)
3. **Backend**: Install → Configure → Migrate → Seed → Run
4. **Frontend**: Install → Configure → Run
5. **Test**: Login with demo account, create spots

See **SETUP.md** for detailed instructions.

## 📦 Deliverables

### Code
- ✅ Full-stack TypeScript application
- ✅ Backend API (Express + Prisma + SQLite)
- ✅ Frontend SPA (Next.js + shadcn/ui)
- ✅ Google Maps integration (JS API + Geocoding)
- ✅ Authentication & authorization
- ✅ CRUD operations with owner permissions

### Documentation
- ✅ Comprehensive README
- ✅ Setup guide with troubleshooting
- ✅ API documentation with cURL examples
- ✅ Backend/frontend specific READMEs
- ✅ Inline code comments

### Data
- ✅ Database schema with migrations
- ✅ Seed script with 20 Taipei locations
- ✅ Demo user account

## 🎓 Learning Outcomes

This project demonstrates proficiency in:

1. **Full-Stack Development**: End-to-end application development
2. **API Design**: RESTful API with proper error codes
3. **Authentication**: JWT-based auth with secure password handling
4. **Database Design**: Relational schema with Prisma ORM
5. **Third-Party APIs**: Google Maps integration (2 APIs)
6. **TypeScript**: Full type safety across stack
7. **Modern Frontend**: Next.js 15 + React 19 + Tailwind
8. **Security**: CORS, validation, authorization, encryption
9. **Developer Experience**: Hot reload, type checking, migrations
10. **Documentation**: Comprehensive guides and API docs

## 🏆 Project Highlights

- **Production-Ready**: Proper error handling, validation, security
- **Scalable**: Clean architecture, separation of concerns
- **User-Friendly**: Intuitive UI, helpful error messages
- **Developer-Friendly**: TypeScript, hot reload, clear code structure
- **Well-Documented**: 5 documentation files, inline comments
- **Feature-Rich**: Search, filters, geocoding, owner permissions
- **Real Data**: 20 curated Taipei night photography spots

## 📝 Future Enhancements (Optional)

- Image uploads for spots
- User profiles with avatar
- Favorite/bookmark spots
- Route planning (Directions API)
- Social features (comments, ratings)
- Photo sharing & EXIF data
- Mobile app (React Native)
- Admin dashboard
- Email verification
- Password reset flow

---

**Total Lines of Code**: ~3,500+
**Total Files Created**: 40+
**Development Time**: Complete implementation
**Tech Stack Complexity**: Advanced full-stack

🎉 **Project Complete and Production-Ready!**
