import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PlaceType, PlaceFilters } from '../types';
import { listPlaces, getPlace, getNTUAreaPlaces } from './service';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const PlaceTypeSchema = z.enum(['hotel', 'motel', 'short_stay']);

const PlaceFiltersSchema = z.object({
  type: PlaceTypeSchema.optional(),
  city: z.string().optional(),
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
  limit: z.coerce.number().positive().max(20000).optional(),
  offset: z.coerce.number().min(0).optional(),
});

// ============================================================================
// GET /api/places/stats/cities - Get city statistics
// ============================================================================

router.get('/stats/cities', async (req: Request, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

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

    const cityCounts: Record<string, number> = {};
    places.forEach((place) => {
      if (place.address) {
        const city = place.address.substring(0, 3);
        cityCounts[city] = (cityCounts[city] || 0) + 1;
      }
    });

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
    const validation = PlaceFiltersSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validation.error.errors,
      });
    }

    const { limit = 1000, offset = 0, ...filters } = validation.data;

    const placeFilters: PlaceFilters = {};

    if (filters.type) placeFilters.type = filters.type as PlaceType;
    if (filters.minRating) placeFilters.minRating = filters.minRating;
    if (filters.maxPriceLevel !== undefined) placeFilters.maxPriceLevel = filters.maxPriceLevel;
    if (filters.q) placeFilters.q = filters.q;

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
    const validation = PlaceFiltersSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validation.error.errors,
      });
    }

    const params = validation.data;

    const filters: PlaceFilters = {};
    if (params.type) filters.type = params.type;
    if (params.city) filters.city = params.city;
    if (params.lat) filters.lat = params.lat;
    if (params.lng) filters.lng = params.lng;
    if (params.radius) filters.radius = params.radius;
    if (params.minRating) filters.minRating = params.minRating;
    if (params.maxPriceLevel !== undefined) filters.maxPriceLevel = params.maxPriceLevel;
    if (params.q) filters.q = params.q;

    if (params.boundsNE_lat && params.boundsNE_lng && params.boundsSW_lat && params.boundsSW_lng) {
      filters.boundsNE = { lat: params.boundsNE_lat, lng: params.boundsNE_lng };
      filters.boundsSW = { lat: params.boundsSW_lat, lng: params.boundsSW_lng };
    }

    const limit = params.limit || 5000;
    const offset = params.offset || 0;

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

export default router;
