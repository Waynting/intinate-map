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

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  role?: string; // 'user' | 'admin' | 'moderator'
}

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
export type ReviewTag = 'clean' | 'quiet' | 'safe' | 'friendly_staff' | 'value' | 'privacy' | 'comfortable' | 'spacious';
export type ReportType = 'data_fix' | 'abuse' | 'safety';
export type ReportStatus = 'open' | 'resolved' | 'rejected';

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

export interface Review {
  id: string;
  placeId: string;
  userId: string;
  rating: number; // 1-5
  content: string | null;
  tags: ReviewTag[] | null;
  isAnonymous: boolean;
  createdAt: string;
  user?: {
    id: string;
    email: string;
  } | null;
}

export interface Report {
  id: string;
  type: ReportType;
  placeId: string | null;
  reviewId: string | null;
  userId: string | null;
  payload: {
    reason: string;
    description?: string;
    suggestedFix?: {
      name?: string;
      address?: string;
      type?: PlaceType;
      latitude?: number;
      longitude?: number;
    };
  };
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  reporter?: {
    id: string;
    email: string;
  } | null;
  place?: {
    id: string;
    name: string;
  } | null;
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

export interface CreatePlaceData {
  name: string;
  type: PlaceType;
  address?: string;
  latitude?: number;
  longitude?: number;
  privacyTags?: PrivacyTag[];
}

export interface UpdatePlaceData extends Partial<CreatePlaceData> {}

export interface CreateReviewData {
  placeId: string;
  rating: number; // 1-5
  content?: string;
  tags?: ReviewTag[];
  isAnonymous?: boolean;
}

export interface UpdateReviewData {
  rating?: number;
  content?: string;
  tags?: ReviewTag[];
  isAnonymous?: boolean;
}

export interface CreateReportData {
  type: ReportType;
  placeId?: string;
  reviewId?: string;
  payload: {
    reason: string;
    description?: string;
    suggestedFix?: {
      name?: string;
      address?: string;
      type?: PlaceType;
      latitude?: number;
      longitude?: number;
    };
  };
}

// ============================================================================
// Auth API
// ============================================================================

export const authApi = {
  register: async (email: string, password: string) => {
    const response = await api.post('/auth/register', { email, password });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated: (): boolean => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('token');
  },

  isAdmin: (): boolean => {
    if (typeof window === 'undefined') return false;
    const user = authApi.getCurrentUser();
    return user?.role === 'admin' || user?.role === 'moderator';
  },
};

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

  create: async (data: CreatePlaceData) => {
    const response = await api.post<Place>('/api/places', data);
    return response.data;
  },

  update: async (id: string, data: UpdatePlaceData) => {
    const response = await api.patch<Place>(`/api/places/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/api/places/${id}`);
  },
};

// ============================================================================
// Reviews API
// ============================================================================

export const reviewsApi = {
  list: async (filters?: { limit?: number; offset?: number }) => {
    const response = await api.get<{ reviews: Review[]; count: number; limit: number; offset: number }>(
      '/api/reviews',
      {
        params: filters,
      }
    );
    return response.data;
  },

  listByPlace: async (placeId: string, limit?: number, offset?: number) => {
    const response = await api.get<{ reviews: Review[]; count: number }>(`/api/reviews/place/${placeId}`, {
      params: { limit, offset },
    });
    return response.data;
  },

  listByUser: async (userId: string, limit?: number, offset?: number) => {
    const response = await api.get<{ reviews: Review[]; count: number }>(`/api/reviews/user/${userId}`, {
      params: { limit, offset },
    });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get<Review>(`/api/reviews/${id}`);
    return response.data;
  },

  create: async (data: CreateReviewData) => {
    const response = await api.post<Review>('/api/reviews', data);
    return response.data;
  },

  update: async (id: string, data: UpdateReviewData) => {
    const response = await api.patch<Review>(`/api/reviews/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/api/reviews/${id}`);
  },
};

// ============================================================================
// Reports API
// ============================================================================

export const reportsApi = {
  list: async (filters?: { type?: ReportType; status?: ReportStatus; placeId?: string }, limit?: number, offset?: number) => {
    const response = await api.get<{ reports: Report[]; count: number }>('/api/reports', {
      params: { ...filters, limit, offset },
    });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get<{
      total: number;
      byStatus: { open: number; resolved: number; rejected: number };
      byType: { data_fix: number; abuse: number; safety: number };
    }>('/api/reports/stats');
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get<Report>(`/api/reports/${id}`);
    return response.data;
  },

  create: async (data: CreateReportData) => {
    const response = await api.post<Report>('/api/reports', data);
    return response.data;
  },

  updateStatus: async (id: string, status: ReportStatus) => {
    const response = await api.patch<Report>(`/api/reports/${id}`, { status });
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/api/reports/${id}`);
  },
};

// ============================================================================
// Favorites API
// ============================================================================

export interface Favorite {
  id: string;
  createdAt: string;
  place: Place;
}

export const favoritesApi = {
  list: async () => {
    const response = await api.get<{ favorites: Favorite[] }>('/api/favorites');
    return response.data;
  },

  check: async (placeId: string) => {
    const response = await api.get<{ isFavorited: boolean; favoriteId: string | null }>(
      `/api/favorites/check/${placeId}`
    );
    return response.data;
  },

  add: async (placeId: string) => {
    const response = await api.post<{ message: string; favorite: Favorite }>('/api/favorites', {
      placeId,
    });
    return response.data;
  },

  remove: async (favoriteId: string) => {
    const response = await api.delete<{ message: string }>(`/api/favorites/${favoriteId}`);
    return response.data;
  },

  removeByPlace: async (placeId: string) => {
    const response = await api.delete<{ message: string }>(`/api/favorites/place/${placeId}`);
    return response.data;
  },
};
