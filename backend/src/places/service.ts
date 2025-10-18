import { PrismaClient } from '@prisma/client';
import { PlaceFilters, PlaceType, PrivacyTag, moderateContent } from '../types';
import {
  geocodeAddress,
  reverseGeocode,
  findBestMatch,
  placeDetails,
  calculateDistance,
  sleep,
  retryWithBackoff,
} from '../maps/google';

const prisma = new PrismaClient();

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface PlaceInput {
  name: string;
  type: PlaceType;
  address?: string;
  latitude?: number;
  longitude?: number;
  privacyTags?: PrivacyTag[];
  userId?: string; // Creator's user ID (optional for imports)
}

export interface PlaceUpdate {
  name?: string;
  type?: PlaceType;
  address?: string;
  latitude?: number;
  longitude?: number;
  privacyTags?: PrivacyTag[];
}

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
  reviewCount: number;
  averageRating: number | null;
}

// ============================================================================
// Create Place
// ============================================================================

/**
 * Create a new place with automatic geocoding and Google Places enrichment
 *
 * @param input - Place creation data
 * @returns Created place with Google data enrichment
 * @throws Error if validation fails or required coordinates missing
 */
export async function createPlace(input: PlaceInput): Promise<PlaceWithStats> {
  // Step 1: Content moderation on name
  const moderation = moderateContent(input.name);
  if (!moderation.isAllowed) {
    throw new Error(`Content moderation failed: ${moderation.reasons?.join(', ')}`);
  }

  // Step 2: Geocoding - ensure we have both address and coordinates
  let latitude = input.latitude;
  let longitude = input.longitude;
  let address = input.address;

  if (address && (!latitude || !longitude)) {
    // Have address, need coordinates → Geocode
    console.log(`Geocoding address: ${address}`);
    const geocoded = await retryWithBackoff(() => geocodeAddress(address!));

    if (!geocoded) {
      throw new Error(`Failed to geocode address: ${address}`);
    }

    latitude = geocoded.lat;
    longitude = geocoded.lng;
    address = geocoded.formattedAddress; // Use Google's formatted address
  } else if (latitude && longitude && !address) {
    // Have coordinates, need address → Reverse geocode
    console.log(`Reverse geocoding coordinates: ${latitude}, ${longitude}`);
    const reversedAddress = await retryWithBackoff(() => reverseGeocode(latitude!, longitude!));
    address = reversedAddress ?? undefined;
  } else if (!latitude || !longitude) {
    throw new Error('Either address or coordinates (lat/lng) must be provided');
  }

  // Step 3: Google Places matching and enrichment
  let googlePlaceId: string | null = null;
  let googleRating: number | null = null;
  let googleRatingsTotal: number | null = null;
  let googlePriceLevel: number | null = null;

  try {
    // Build search query with name and address
    const searchQuery = address
      ? `${input.name} ${address}`
      : input.name;

    console.log(`Searching Google Places: ${searchQuery}`);

    // Find best matching place with retry logic
    const matchedPlace = await retryWithBackoff(() =>
      findBestMatch(searchQuery, input.name, { lat: latitude!, lng: longitude! })
    );

    if (matchedPlace) {
      googlePlaceId = matchedPlace.place_id;
      console.log(`✓ Matched to Google Place ID: ${googlePlaceId}`);

      // Throttle before next API call
      await sleep(150);

      // Fetch detailed information
      const details = await retryWithBackoff(() => placeDetails(googlePlaceId!));

      if (details) {
        googleRating = details.rating ?? null;
        googleRatingsTotal = details.user_ratings_total ?? null;
        googlePriceLevel = details.price_level ?? null;
        console.log(`✓ Enriched with rating: ${googleRating}, price_level: ${googlePriceLevel}`);
      }
    } else {
      console.warn('⚠️  No matching Google Place found');
    }
  } catch (error: any) {
    // Don't fail the whole operation if Google Places enrichment fails
    console.error('Google Places enrichment failed:', error.message);
  }

  // Step 4: Validate and serialize privacy tags
  let privacyTagsJson: string | null = null;
  if (input.privacyTags && input.privacyTags.length > 0) {
    // Validate tags
    const validTags: PrivacyTag[] = ['self_checkin', 'soundproof', 'garage', 'cash_only', 'kiosk', 'hourly_rate'];
    const invalidTags = input.privacyTags.filter(tag => !validTags.includes(tag));
    if (invalidTags.length > 0) {
      throw new Error(`Invalid privacy tags: ${invalidTags.join(', ')}`);
    }
    privacyTagsJson = JSON.stringify(input.privacyTags);
  }

  // Step 5: Create place in database
  const place = await prisma.place.create({
    data: {
      name: input.name,
      type: input.type,
      address: address ?? null,
      latitude: latitude!,
      longitude: longitude!,
      googlePlaceId,
      googleRating,
      googleRatingsTotal,
      googlePriceLevel,
      privacyTags: privacyTagsJson,
      source: input.userId ? 'user' : 'import',
      createdBy: input.userId ?? null,
    },
    include: {
      creator: {
        select: {
          id: true,
          email: true,
        },
      },
      reviews: true,
    },
  });

  return transformPlaceWithStats(place);
}

// ============================================================================
// List Places with Advanced Filtering
// ============================================================================

/**
 * List places with advanced filtering options
 *
 * @param filters - Filter criteria (type, location, rating, price, search, bounds)
 * @param limit - Maximum number of results (default: 2500)
 * @param offset - Pagination offset (default: 0)
 * @returns Array of places matching filters
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

  // Filter by creator user ID
  if (filters.createdBy) {
    where.createdBy = filters.createdBy;
  }

  // Filter by minimum rating (from Google or reviews)
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
      reviews: true,
    },
    orderBy: [
      { googleRating: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
    skip: offset,
  });

  // Post-processing: Geographic filtering (radius or bounds)
  if (filters.lat && filters.lng && filters.radius) {
    // Radius-based filtering (in meters)
    places = places.filter((place) => {
      const distance = calculateDistance(
        filters.lat!,
        filters.lng!,
        place.latitude,
        place.longitude
      );
      return distance <= filters.radius!;
    });
  } else if (filters.boundsNE && filters.boundsSW) {
    // Bounds-based filtering (map viewport)
    places = places.filter((place) => {
      return (
        place.latitude <= filters.boundsNE!.lat &&
        place.latitude >= filters.boundsSW!.lat &&
        place.longitude <= filters.boundsNE!.lng &&
        place.longitude >= filters.boundsSW!.lng
      );
    });
  }

  return places.map(transformPlaceWithStats);
}

// ============================================================================
// Get Single Place
// ============================================================================

/**
 * Get a single place by ID with full details
 *
 * @param id - Place ID (UUID)
 * @returns Place with statistics or null if not found
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
      reviews: true,
    },
  });

  if (!place) {
    return null;
  }

  return transformPlaceWithStats(place);
}

// ============================================================================
// Update Place
// ============================================================================

/**
 * Update a place (owner or admin only)
 *
 * @param id - Place ID (UUID)
 * @param updates - Fields to update
 * @param userId - User performing the update
 * @param isAdmin - Whether user is admin/moderator
 * @returns Updated place
 * @throws Error if unauthorized or validation fails
 */
export async function updatePlace(
  id: string,
  updates: PlaceUpdate,
  userId: string,
  isAdmin: boolean = false
): Promise<PlaceWithStats> {
  // Step 1: Fetch existing place
  const existing = await prisma.place.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('Place not found');
  }

  // Step 2: Authorization check
  if (!isAdmin && existing.createdBy !== userId) {
    throw new Error('Unauthorized: You can only update your own places');
  }

  // Step 3: Content moderation if name is being updated
  if (updates.name) {
    const moderation = moderateContent(updates.name);
    if (!moderation.isAllowed) {
      throw new Error(`Content moderation failed: ${moderation.reasons?.join(', ')}`);
    }
  }

  // Step 4: Prepare update data
  const data: any = {};
  let needsReGeocoding = false;
  let needsRematching = false;

  if (updates.name) {
    data.name = updates.name;
    needsRematching = true;
  }

  if (updates.type) {
    data.type = updates.type;
  }

  if (updates.address && updates.address !== existing.address) {
    data.address = updates.address;
    needsReGeocoding = true;
    needsRematching = true;
  }

  if (updates.latitude && updates.longitude) {
    data.latitude = updates.latitude;
    data.longitude = updates.longitude;
    needsRematching = true;
  }

  // Step 5: Re-geocode if address changed
  if (needsReGeocoding && updates.address) {
    console.log(`Re-geocoding updated address: ${updates.address}`);
    try {
      const geocoded = await retryWithBackoff(() => geocodeAddress(updates.address!));
      if (geocoded) {
        data.latitude = geocoded.lat;
        data.longitude = geocoded.lng;
        data.address = geocoded.formattedAddress;
      }
    } catch (error: any) {
      console.error('Re-geocoding failed:', error.message);
      throw new Error('Failed to geocode updated address');
    }
  }

  // Step 6: Re-match Google Place if name/address/location changed
  if (needsRematching) {
    try {
      const searchQuery = (data.address || existing.address)
        ? `${data.name || existing.name} ${data.address || existing.address}`
        : (data.name || existing.name);

      const lat = data.latitude || existing.latitude;
      const lng = data.longitude || existing.longitude;

      console.log(`Re-matching Google Place: ${searchQuery}`);
      const matchedPlace = await retryWithBackoff(() =>
        findBestMatch(searchQuery, data.name || existing.name, { lat, lng })
      );

      if (matchedPlace) {
        data.googlePlaceId = matchedPlace.place_id;
        await sleep(150);

        const details = await retryWithBackoff(() => placeDetails(matchedPlace.place_id));
        if (details) {
          data.googleRating = details.rating ?? null;
          data.googleRatingsTotal = details.user_ratings_total ?? null;
          data.googlePriceLevel = details.price_level ?? null;
        }
      }
    } catch (error: any) {
      console.error('Google Places re-matching failed:', error.message);
      // Don't fail the update if enrichment fails
    }
  }

  // Step 7: Validate and update privacy tags
  if (updates.privacyTags !== undefined) {
    if (updates.privacyTags.length === 0) {
      data.privacyTags = null;
    } else {
      const validTags: PrivacyTag[] = ['self_checkin', 'soundproof', 'garage', 'cash_only', 'kiosk', 'hourly_rate'];
      const invalidTags = updates.privacyTags.filter(tag => !validTags.includes(tag));
      if (invalidTags.length > 0) {
        throw new Error(`Invalid privacy tags: ${invalidTags.join(', ')}`);
      }
      data.privacyTags = JSON.stringify(updates.privacyTags);
    }
  }

  // Step 8: Update database
  const updated = await prisma.place.update({
    where: { id },
    data,
    include: {
      creator: {
        select: {
          id: true,
          email: true,
        },
      },
      reviews: true,
    },
  });

  return transformPlaceWithStats(updated);
}

// ============================================================================
// Delete Place
// ============================================================================

/**
 * Delete a place (owner or admin only)
 *
 * @param id - Place ID (UUID)
 * @param userId - User performing the deletion
 * @param isAdmin - Whether user is admin/moderator
 * @throws Error if unauthorized or place not found
 */
export async function deletePlace(
  id: string,
  userId: string,
  isAdmin: boolean = false
): Promise<void> {
  // Step 1: Fetch existing place
  const existing = await prisma.place.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('Place not found');
  }

  // Step 2: Authorization check
  if (!isAdmin && existing.createdBy !== userId) {
    throw new Error('Unauthorized: You can only delete your own places');
  }

  // Step 3: Delete place (cascades to reviews and reports via Prisma)
  await prisma.place.delete({
    where: { id },
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Transform Prisma place to PlaceWithStats
 * Calculates review statistics and parses JSON fields
 */
function transformPlaceWithStats(place: any): PlaceWithStats {
  // Calculate review statistics
  const reviews = place.reviews || [];
  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewCount
      : null;

  // Parse privacy tags
  let privacyTags: PrivacyTag[] | null = null;
  if (place.privacyTags) {
    try {
      privacyTags = JSON.parse(place.privacyTags);
    } catch (error) {
      console.error('Failed to parse privacy tags:', place.privacyTags);
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
    creator: place.creator,
    reviewCount,
    averageRating,
  };
}

// ============================================================================
// NTU Area Places (台大周邊場所)
// ============================================================================

/**
 * Get places near NTU (National Taiwan University)
 * Includes areas: NTU Main Campus, NTU Hospital, Taipei Main Station
 *
 * @param filters - Optional filters (type, minRating, etc.)
 * @param limit - Maximum number of results (default: 1000)
 * @param offset - Pagination offset (default: 0)
 * @returns Array of places near NTU area
 */
export async function getNTUAreaPlaces(
  filters: PlaceFilters = {},
  limit: number = 1000,
  offset: number = 0
): Promise<PlaceWithStats[]> {
  const where: any = {
    OR: [
      // NTU Main Campus area (25.0174, 121.5393) - radius ~1.5km
      {
        AND: [
          { latitude: { gte: 24.9924, lte: 25.0424 } },
          { longitude: { gte: 121.5143, lte: 121.5643 } },
        ],
      },
      // NTU Hospital / Taipei Main Station area (25.0418, 121.5190) - radius ~1.5km
      {
        AND: [
          { latitude: { gte: 25.0168, lte: 25.0668 } },
          { longitude: { gte: 121.4940, lte: 121.5440 } },
        ],
      },
    ],
  };

  // Apply additional filters
  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.minRating) {
    where.googleRating = {
      gte: filters.minRating,
    };
  }

  if (filters.maxPriceLevel !== undefined) {
    where.googlePriceLevel = {
      lte: filters.maxPriceLevel,
    };
  }

  if (filters.q) {
    where.AND = where.AND || [];
    where.AND.push({
      OR: [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { address: { contains: filters.q, mode: 'insensitive' } },
      ],
    });
  }

  const places = await prisma.place.findMany({
    where,
    include: {
      creator: {
        select: {
          id: true,
          email: true,
        },
      },
      reviews: true,
    },
    orderBy: [
      { googleRating: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
    skip: offset,
  });

  return places.map(transformPlaceWithStats);
}
