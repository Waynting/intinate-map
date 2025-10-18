import { Client, PlaceInputType } from '@googlemaps/google-maps-services-js';
import { GeocodingResult, PlaceSearchResult, PlaceDetails } from '../types';

const client = new Client({});

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_SERVER_KEY;

if (!GOOGLE_MAPS_KEY) {
  console.warn('⚠️  GOOGLE_MAPS_SERVER_KEY not set. Maps features will be disabled.');
}

// ============================================================================
// Geocoding (Address ↔ Coordinates)
// ============================================================================

/**
 * Convert address to coordinates (Geocoding)
 * @param address - Address string to geocode
 * @returns Geocoding result with lat, lng, and formatted address
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!GOOGLE_MAPS_KEY) {
    throw new Error('Google Maps API key not configured');
  }

  try {
    const response = await client.geocode({
      params: {
        address,
        key: GOOGLE_MAPS_KEY,
        region: 'tw', // Bias towards Taiwan
      },
    });

    const result = response.data.results[0];
    if (!result) {
      return null;
    }

    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error('Failed to geocode address');
  }
}

/**
 * Convert coordinates to address (Reverse Geocoding)
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Formatted address string or null
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!GOOGLE_MAPS_KEY) {
    throw new Error('Google Maps API key not configured');
  }

  try {
    const response = await client.reverseGeocode({
      params: {
        latlng: { lat, lng },
        key: GOOGLE_MAPS_KEY,
      },
    });

    const result = response.data.results[0];
    return result?.formatted_address ?? null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw new Error('Failed to reverse geocode coordinates');
  }
}

// ============================================================================
// Places API (Text Search & Place Details)
// ============================================================================

/**
 * Search for places using text query (Places Text Search API)
 * Used for matching user-provided names/addresses to Google Place IDs
 *
 * @param query - Search query (e.g., "某某汽車旅館 台北市內湖區")
 * @param location - Optional location bias { lat, lng }
 * @returns Array of matching places (sorted by relevance)
 */
export async function textSearch(
  query: string,
  location?: { lat: number; lng: number }
): Promise<PlaceSearchResult[]> {
  if (!GOOGLE_MAPS_KEY) {
    throw new Error('Google Maps API key not configured');
  }

  try {
    const params: any = {
      query,
      key: GOOGLE_MAPS_KEY,
      region: 'tw',
      language: 'zh-TW',
    };

    // Bias results towards provided location
    if (location) {
      params.location = `${location.lat},${location.lng}`;
      params.radius = 5000; // 5km radius
    }

    const response = await client.textSearch({ params });

    if (!response.data.results || response.data.results.length === 0) {
      return [];
    }

    // Map to our PlaceSearchResult type
    return response.data.results.slice(0, 5).map((result: any) => ({
      place_id: result.place_id,
      name: result.name,
      formatted_address: result.formatted_address,
      geometry: {
        location: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        },
      },
      rating: result.rating,
      user_ratings_total: result.user_ratings_total,
      price_level: result.price_level,
    }));
  } catch (error: any) {
    console.error('Text search error:', error.message);
    throw new Error(`Failed to search places: ${error.message}`);
  }
}

/**
 * Get detailed information about a place (Place Details API)
 *
 * @param placeId - Google Place ID
 * @returns Detailed place information including rating, price_level, hours
 */
export async function placeDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!GOOGLE_MAPS_KEY) {
    throw new Error('Google Maps API key not configured');
  }

  try {
    const response = await client.placeDetails({
      params: {
        place_id: placeId,
        key: GOOGLE_MAPS_KEY,
        language: 'zh-TW' as any, // Google Maps SDK doesn't include all language codes in types
        fields: [
          'place_id',
          'name',
          'formatted_address',
          'geometry',
          'rating',
          'user_ratings_total',
          'price_level',
          'opening_hours',
          'formatted_phone_number',
          'website',
        ],
      },
    });

    const result = response.data.result;
    if (!result) {
      return null;
    }

    return {
      place_id: result.place_id!,
      name: result.name!,
      formatted_address: result.formatted_address!,
      geometry: {
        location: {
          lat: result.geometry!.location.lat,
          lng: result.geometry!.location.lng,
        },
      },
      rating: result.rating,
      user_ratings_total: result.user_ratings_total,
      price_level: result.price_level,
      opening_hours: result.opening_hours
        ? {
            open_now: result.opening_hours.open_now,
            periods: result.opening_hours.periods,
            weekday_text: result.opening_hours.weekday_text,
          }
        : undefined,
      formatted_phone_number: result.formatted_phone_number,
      website: result.website,
    };
  } catch (error: any) {
    console.error('Place details error:', error.message);
    throw new Error(`Failed to get place details: ${error.message}`);
  }
}

/**
 * Find the best matching place from text search results
 * Uses string similarity to match against provided name
 *
 * @param query - Search query
 * @param targetName - Target name to match against
 * @param location - Optional location bias
 * @returns Best matching place or null
 */
export async function findBestMatch(
  query: string,
  targetName: string,
  location?: { lat: number; lng: number }
): Promise<PlaceSearchResult | null> {
  const results = await textSearch(query, location);

  if (results.length === 0) {
    return null;
  }

  // If only one result, return it
  if (results.length === 1) {
    return results[0];
  }

  // Calculate similarity scores
  const scored = results.map((result) => ({
    result,
    score: stringSimilarity(normalizeString(targetName), normalizeString(result.name)),
  }));

  // Sort by similarity score (descending)
  scored.sort((a, b) => b.score - a.score);

  // Return best match if score is good enough (>0.6)
  if (scored[0].score > 0.6) {
    return scored[0].result;
  }

  // Otherwise return first result (most relevant from Google)
  return results[0];
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 - Latitude of point 1
 * @param lng1 - Longitude of point 1
 * @param lat2 - Latitude of point 2
 * @param lng2 - Longitude of point 2
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
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

/**
 * Sleep for specified milliseconds (for throttling API calls)
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Normalize string for comparison
 * - Remove special characters
 * - Convert to lowercase
 * - Remove extra whitespace
 * - Convert full-width to half-width
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\(\)（）\[\]「」【】]/g, '') // Remove brackets
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0)) // Full-width to half-width
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Calculate string similarity using Dice coefficient
 * Returns value between 0 (completely different) and 1 (identical)
 */
function stringSimilarity(str1: string, str2: string): number {
  // Convert to bigrams
  const bigrams1 = getBigrams(str1);
  const bigrams2 = getBigrams(str2);

  if (bigrams1.size === 0 && bigrams2.size === 0) {
    return 1; // Both empty
  }

  if (bigrams1.size === 0 || bigrams2.size === 0) {
    return 0; // One empty
  }

  // Calculate intersection
  let intersection = 0;
  for (const bigram of bigrams1) {
    if (bigrams2.has(bigram)) {
      intersection++;
    }
  }

  // Dice coefficient = 2 * |intersection| / (|set1| + |set2|)
  return (2 * intersection) / (bigrams1.size + bigrams2.size);
}

/**
 * Get bigrams (pairs of consecutive characters) from string
 */
function getBigrams(str: string): Set<string> {
  const bigrams = new Set<string>();
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.add(str.slice(i, i + 2));
  }
  return bigrams;
}

/**
 * Retry a function with exponential backoff
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in ms (doubles each retry)
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (i < maxRetries) {
        const delay = baseDelay * Math.pow(2, i);
        console.warn(`Retry ${i + 1}/${maxRetries} after ${delay}ms:`, error.message);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
