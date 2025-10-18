# 全台私密空間地圖 (Taiwan Intimate Spaces Map) - Backend API

Express + TypeScript + Prisma backend for the Taiwan Intimate Spaces Map application - A comprehensive platform for discovering private accommodation spaces across Taiwan.

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Initialize database
npx prisma migrate dev --name init

# Seed with Taiwan accommodation data
npm run db:seed

# Start dev server
npm run dev
```

## Environment Variables

```env
PORT=3000
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
DATABASE_URL="file:./dev.db"
JWT_SECRET=your_secure_random_string_min_32_chars
JWT_EXPIRES_IN=7d
GOOGLE_MAPS_SERVER_KEY=your_server_api_key
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login (returns JWT)
- `POST /auth/logout` - Logout (client-side)

### Spots (CRUD)
- `GET /api/spots` - List spots (public, supports filters)
- `GET /api/spots/:id` - Get single spot
- `POST /api/spots` - Create spot (auth required)
- `PATCH /api/spots/:id` - Update spot (owner only)
- `DELETE /api/spots/:id` - Delete spot (owner only)

### Health Check
- `GET /health` - Server status

## Database Commands

```bash
# Push schema changes (development)
npm run db:push

# Create migration
npm run db:migrate

# Seed database
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

## Project Structure

```
src/
├── auth/
│   ├── service.ts    # Auth logic, JWT, bcrypt
│   └── routes.ts     # Auth endpoints
├── spots/
│   ├── service.ts    # Spots CRUD logic
│   └── routes.ts     # Spots endpoints
├── maps/
│   └── google.ts     # Geocoding integration
├── db/
│   ├── prisma.ts     # Prisma client
│   └── seed.ts       # Seed script
├── types.ts          # TypeScript types
└── index.ts          # Express app
```

## Geocoding Features

The backend automatically handles:

1. **Address to Coordinates**: When creating a spot with an address but no coordinates, the backend calls Google Geocoding API to get lat/lng
2. **Coordinates to Address**: When creating a spot with coordinates but no address, the backend does reverse geocoding to get the address
3. **Distance Calculation**: Haversine formula for radius-based searches

## Security

- Bcrypt password hashing (10 rounds)
- JWT with configurable expiration
- CORS protection
- Owner-only edit/delete enforcement
- Zod validation on all inputs
- Prisma for SQL injection prevention

## Error Codes

- `200` - Success
- `201` - Created
- `400` - Validation error
- `401` - Unauthorized (no/invalid token)
- `403` - Forbidden (not owner)
- `404` - Not found
- `409` - Conflict (duplicate email)
- `422` - Unprocessable (geocoding failed)
- `500` - Server error

## Testing

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# List spots
curl http://localhost:3000/api/spots

# Create spot (with token)
curl -X POST http://localhost:3000/api/spots \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Spot","address":"臺北市信義區","bestTime":"night"}'
```
