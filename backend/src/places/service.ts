import { PrismaClient } from '@prisma/client';
import { PlaceFilters, PlaceType, PrivacyTag } from '../types';

const prisma = new PrismaClient();

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface PlaceWithStats {
  id: string;
  name: string;
  type: string;
  address: string | null;
  latitude: number;
  longitude: number;
  googlePlaceId: string | null;
  googleRating: number | null;
  googleRatingsTotal: number | null;
  googlePriceLevel: number | null;
  privacyTags: PrivacyTag[] | null;
  source: string;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  creator?: {
    id: string;
    email: string;
  } | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Transform Prisma place object to PlaceWithStats
 */
function transformPlaceWithStats(place: any): PlaceWithStats {
  // Parse privacy tags from JSON string
  let privacyTags: PrivacyTag[] | null = null;
  if (place.privacyTags) {
    try {
      privacyTags = JSON.parse(place.privacyTags);
    } catch (e) {
      console.error(`Failed to parse privacy tags for place ${place.id}:`, e);
    }
  }

  return {
    id: place.id,
    name: place.name,
    type: place.type,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    googlePlaceId: place.googlePlaceId,
    googleRating: place.googleRating,
    googleRatingsTotal: place.googleRatingsTotal,
    googlePriceLevel: place.googlePriceLevel,
    privacyTags,
    source: place.source,
    createdBy: place.createdBy,
    createdAt: place.createdAt,
    updatedAt: place.updatedAt,
    creator: place.creator || null,
  };
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// ============================================================================
// List Places with Advanced Filtering
// ============================================================================

/**
 * List places with advanced filtering options
 */
export async function listPlaces(
  filters: PlaceFilters = {},
  limit: number = 2500,
  offset: number = 0
): Promise<PlaceWithStats[]> {
  const where: any = {};

  // Filter by type (hotel | motel | short_stay)
  if (filters.type) {
    where.type = filters.type;
  }

  // Filter by city (address contains city name)
  if (filters.city) {
    where.address = {
      contains: filters.city,
    };
  }

  // Filter by minimum rating
  if (filters.minRating) {
    where.googleRating = {
      gte: filters.minRating,
    };
  }

  // Filter by maximum price level (0-4)
  if (filters.maxPriceLevel !== undefined) {
    where.googlePriceLevel = {
      lte: filters.maxPriceLevel,
    };
  }

  // Text search across name and address
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: 'insensitive' } },
      { address: { contains: filters.q, mode: 'insensitive' } },
    ];
  }

  // Fetch places with filters
  let places = await prisma.place.findMany({
    where,
    include: {
      creator: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    orderBy: [
      { googleRating: 'desc' },
      { googleRatingsTotal: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
    skip: offset,
  });

  // Post-query filtering for radius search
  if (filters.lat && filters.lng && filters.radius) {
    places = places.filter((place) => {
      const distance = calculateDistance(
        filters.lat!,
        filters.lng!,
        place.latitude,
        place.longitude
      );
      return distance <= filters.radius!;
    });
  }

  // Post-query filtering for bounds (map viewport)
  if (filters.boundsNE && filters.boundsSW) {
    places = places.filter((place) => {
      const inLatBounds =
        place.latitude >= filters.boundsSW!.lat &&
        place.latitude <= filters.boundsNE!.lat;
      const inLngBounds =
        place.longitude >= filters.boundsSW!.lng &&
        place.longitude <= filters.boundsNE!.lng;
      return inLatBounds && inLngBounds;
    });
  }

  return places.map(transformPlaceWithStats);
}

// ============================================================================
// Get Single Place
// ============================================================================

/**
 * Get a single place by ID
 */
export async function getPlace(id: string): Promise<PlaceWithStats | null> {
  const place = await prisma.place.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!place) {
    return null;
  }

  return transformPlaceWithStats(place);
}

// ============================================================================
// Get NTU Area Places
// ============================================================================

/**
 * Get places in NTU area (台大總區、台大醫院、台北車站)
 */
export async function getNTUAreaPlaces(
  filters: PlaceFilters = {},
  limit: number = 1000,
  offset: number = 0
): Promise<PlaceWithStats[]> {
  // NTU area bounds (approximate)
  const NTU_BOUNDS = {
    ne: { lat: 25.0520, lng: 121.5400 },
    sw: { lat: 25.0180, lng: 121.5100 },
  };

  // Merge NTU bounds with existing filters
  const ntuFilters: PlaceFilters = {
    ...filters,
    boundsNE: NTU_BOUNDS.ne,
    boundsSW: NTU_BOUNDS.sw,
  };

  return listPlaces(ntuFilters, limit, offset);
}
