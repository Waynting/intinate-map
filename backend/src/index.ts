import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import placesRoutes from './places/routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
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
app.use('/api/places', placesRoutes);

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
🚀 私密空間地圖 API Server (Read-Only)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: ${process.env.NODE_ENV || 'development'}
Port: ${PORT}
CORS Origins: ${corsOrigins.join(', ')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Available Endpoints:
  GET /health                      - Health check
  GET /api/places                  - List all places (supports filters)
  GET /api/places/stats/cities     - City statistics
  GET /api/places/ntu              - NTU area places
  GET /api/places/:id              - Get place details

Ready to accept requests! 🎉
  `);
});

export default app;
