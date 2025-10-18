import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

// Create axios instance with timeout
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout to prevent hanging requests
  headers: {
    'Content-Type': 'application/json',
  },
});


// ============================================================================
// Types
// ============================================================================

export type PlaceType = 'hotel' | 'motel' | 'short_stay';
export type PrivacyTag =
  | 'self_checkin'
  | 'soundproof'
  | 'garage'
  | 'cash_only'
  | 'kiosk'
  | 'hourly_rate'
  | 'no_id_required'
  | 'parking_inside';

export interface Place {
  id: string;
  name: string;
  type: PlaceType;
  address: string | null;
  latitude: number;
  longitude: number;
  googlePlaceId: string | null;
  googleRating: number | null;
  googleRatingsTotal: number | null;
  googlePriceLevel: number | null; // 0-4
  privacyTags: PrivacyTag[] | null;
  source: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    email: string;
  } | null;
  reviewCount: number;
  averageRating: number | null;
}

export interface PlaceFilters {
  type?: PlaceType;
  city?: string; // filter by city name (e.g., "臺北市", "宜蘭縣")
  createdBy?: string; // filter by creator user ID
  lat?: number;
  lng?: number;
  radius?: number; // meters
  minRating?: number;
  maxPriceLevel?: number; // 0-4
  q?: string; // search query
  boundsNE_lat?: number;
  boundsNE_lng?: number;
  boundsSW_lat?: number;
  boundsSW_lng?: number;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Places API
// ============================================================================

export const placesApi = {
  list: async (filters?: PlaceFilters) => {
    const response = await api.get<{ places: Place[]; count: number; limit: number; offset: number }>(
      '/api/places',
      {
        params: filters,
      }
    );
    return response.data;
  },

  getCityStats: async () => {
    const response = await api.get<{ cities: Array<{ name: string; count: number }> }>(
      '/api/places/stats/cities'
    );
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get<Place>(`/api/places/${id}`);
    return response.data;
  },
};

