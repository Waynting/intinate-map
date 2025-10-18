import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './auth/routes';
import placesRoutes from './places/routes';
import reviewsRoutes from './reviews/routes';
import reportsRoutes from './reports/routes';
import favoritesRoutes from './routes/favorites';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration (Required: port 5173 for assignment specs)
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://127.0.0.1:5173'];
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, req.query);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/favorites', favoritesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Intimate Spaces Taipei API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: ${process.env.NODE_ENV || 'development'}
Port: ${PORT}
CORS Origins: ${corsOrigins.join(', ')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Auth Endpoints:
  POST /auth/register
  POST /auth/login
  POST /auth/logout

Places Endpoints:
  GET    /api/places (filters: type, minRating, maxPriceLevel, q, bounds)
  GET    /api/places/:id
  POST   /api/places (auth required)
  PATCH  /api/places/:id (auth required, owner/admin)
  DELETE /api/places/:id (auth required, owner/admin)

Reviews Endpoints:
  GET    /api/reviews/place/:placeId
  GET    /api/reviews/user/:userId
  GET    /api/reviews/:id
  POST   /api/reviews (auth required)
  PATCH  /api/reviews/:id (auth required, owner)
  DELETE /api/reviews/:id (auth required, owner/admin)

Reports Endpoints:
  GET    /api/reports (admin/moderator only)
  GET    /api/reports/stats (admin/moderator only)
  GET    /api/reports/:id (admin/moderator only)
  POST   /api/reports (optional auth)
  PATCH  /api/reports/:id (admin/moderator only)
  DELETE /api/reports/:id (admin only)

System:
  GET /health

Ready to accept requests! 🎉
  `);
});

export default app;
