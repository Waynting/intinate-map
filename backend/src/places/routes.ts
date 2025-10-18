import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PlaceType, PrivacyTag, PlaceFilters } from '../types';
import { createPlace, listPlaces, getPlace, updatePlace, deletePlace, getNTUAreaPlaces } from './service';
import { authenticateToken, type AuthRequest } from '../auth/middleware';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const PlaceTypeSchema = z.enum(['hotel', 'motel', 'short_stay']);
const PrivacyTagSchema = z.enum(['self_checkin', 'soundproof', 'garage', 'cash_only', 'kiosk', 'hourly_rate']);

const CreatePlaceSchema = z.object({
  name: z.string().min(1).max(200),
  type: PlaceTypeSchema,
  address: z.string().min(1).max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  privacyTags: z.array(PrivacyTagSchema).optional(),
}).refine(
  (data) => data.address || (data.latitude && data.longitude),
  {
    message: 'Either address or coordinates (latitude + longitude) must be provided',
  }
);

const UpdatePlaceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: PlaceTypeSchema.optional(),
  address: z.string().min(1).max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  privacyTags: z.array(PrivacyTagSchema).optional(),
});

const PlaceFiltersSchema = z.object({
  type: PlaceTypeSchema.optional(),
  city: z.string().optional(), // Filter by city name
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().positive().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxPriceLevel: z.coerce.number().min(0).max(4).optional(),
  q: z.string().optional(),
  boundsNE_lat: z.coerce.number().optional(),
  boundsNE_lng: z.coerce.number().optional(),
  boundsSW_lat: z.coerce.number().optional(),
  boundsSW_lng: z.coerce.number().optional(),
  limit: z.coerce.number().positive().max(20000).optional(), // Allow up to 20000 records
  offset: z.coerce.number().min(0).optional(),
});

// ============================================================================
// GET /api/places/stats/cities - Get city statistics
// ============================================================================

router.get('/stats/cities', async (req: Request, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // Get all places with addresses
    const places = await prisma.place.findMany({
      where: {
        address: {
          not: null,
        },
      },
      select: {
        address: true,
      },
    });

    // Extract city from address (first 3 characters)
    const cityCounts: Record<string, number> = {};
    places.forEach((place) => {
      if (place.address) {
        const city = place.address.substring(0, 3);
        cityCounts[city] = (cityCounts[city] || 0) + 1;
      }
    });

    // Convert to array and sort by count
    const cities = Object.entries(cityCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    await prisma.$disconnect();

    res.json({ cities });
  } catch (error: any) {
    console.error('Error fetching city stats:', error);
    res.status(500).json({
      error: 'Failed to fetch city statistics',
      message: error.message,
    });
  }
});

// ============================================================================
// GET /api/places/ntu - Get NTU area places
// ============================================================================

router.get('/ntu', async (req: Request, res: Response) => {
  try {
    // Validate query parameters (same as regular places listing)
    const validation = PlaceFiltersSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validation.error.errors,
      });
    }

    const { limit = 1000, offset = 0, ...filters } = validation.data;

    // Build filters object
    const placeFilters: PlaceFilters = {};

    if (filters.type) placeFilters.type = filters.type as PlaceType;
    if (filters.minRating) placeFilters.minRating = filters.minRating;
    if (filters.maxPriceLevel !== undefined) placeFilters.maxPriceLevel = filters.maxPriceLevel;
    if (filters.q) placeFilters.q = filters.q;

    // Get NTU area places
    const places = await getNTUAreaPlaces(placeFilters, limit, offset);

    res.json({
      places,
      count: places.length,
      limit,
      offset,
      area: 'NTU (台大總區、台大醫院、台北車站)',
    });
  } catch (error: any) {
    console.error('Error fetching NTU area places:', error);
    res.status(500).json({
      error: 'Failed to fetch NTU area places',
      message: error.message,
    });
  }
});

// ============================================================================
// GET /api/places - List places with filters
// ============================================================================

router.get('/', async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const validation = PlaceFiltersSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validation.error.errors,
      });
    }

    const params = validation.data;

    // Build filters object
    const filters: PlaceFilters = {};
    if (params.type) filters.type = params.type;
    if (params.city) filters.city = params.city;
    if (params.lat) filters.lat = params.lat;
    if (params.lng) filters.lng = params.lng;
    if (params.radius) filters.radius = params.radius;
    if (params.minRating) filters.minRating = params.minRating;
    if (params.maxPriceLevel !== undefined) filters.maxPriceLevel = params.maxPriceLevel;
    if (params.q) filters.q = params.q;

    // Bounds filtering (map viewport)
    if (params.boundsNE_lat && params.boundsNE_lng && params.boundsSW_lat && params.boundsSW_lng) {
      filters.boundsNE = { lat: params.boundsNE_lat, lng: params.boundsNE_lng };
      filters.boundsSW = { lat: params.boundsSW_lat, lng: params.boundsSW_lng };
    }

    const limit = params.limit || 5000; // Default to 5000, can be increased up to 20000
    const offset = params.offset || 0;

    // Fetch places
    const places = await listPlaces(filters, limit, offset);

    res.json({
      places,
      count: places.length,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('List places error:', error);
    res.status(500).json({
      error: 'Failed to fetch places',
      message: error.message,
    });
  }
});

// ============================================================================
// GET /api/places/:id - Get single place
// ============================================================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const place = await getPlace(id);

    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }

    res.json(place);
  } catch (error: any) {
    console.error('Get place error:', error);
    res.status(500).json({
      error: 'Failed to fetch place',
      message: error.message,
    });
  }
});

// ============================================================================
// POST /api/places - Create new place (auth required)
// ============================================================================

router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const validation = CreatePlaceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validation.error.errors,
      });
    }

    const data = validation.data;

    // Create place
    const place = await createPlace({
      name: data.name,
      type: data.type,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      privacyTags: data.privacyTags,
      userId: req.user!.userId, // From auth middleware
    });

    res.status(201).json(place);
  } catch (error: any) {
    console.error('Create place error:', error);

    // Content moderation errors
    if (error.message.includes('Content moderation failed')) {
      return res.status(400).json({
        error: 'Content not allowed',
        message: error.message,
      });
    }

    // Geocoding errors
    if (error.message.includes('Failed to geocode')) {
      return res.status(400).json({
        error: 'Invalid address',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to create place',
      message: error.message,
    });
  }
});

// ============================================================================
// PATCH /api/places/:id - Update place (auth required, owner or admin)
// ============================================================================

router.patch('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const validation = UpdatePlaceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validation.error.errors,
      });
    }

    const updates = validation.data;

    // Check if user is admin/moderator
    const isAdmin = req.user!.role === 'admin' || req.user!.role === 'moderator';

    // Update place
    const place = await updatePlace(id, updates, req.user!.userId, isAdmin);

    res.json(place);
  } catch (error: any) {
    console.error('Update place error:', error);

    // Authorization errors
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message,
      });
    }

    // Not found errors
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Place not found',
        message: error.message,
      });
    }

    // Content moderation errors
    if (error.message.includes('Content moderation failed')) {
      return res.status(400).json({
        error: 'Content not allowed',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to update place',
      message: error.message,
    });
  }
});

// ============================================================================
// DELETE /api/places/:id - Delete place (auth required, owner or admin)
// ============================================================================

router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user is admin/moderator
    const isAdmin = req.user!.role === 'admin' || req.user!.role === 'moderator';

    // Delete place
    await deletePlace(id, req.user!.userId, isAdmin);

    res.status(204).send();
  } catch (error: any) {
    console.error('Delete place error:', error);

    // Authorization errors
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message,
      });
    }

    // Not found errors
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Place not found',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to delete place',
      message: error.message,
    });
  }
});

export default router;
