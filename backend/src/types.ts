import { Request } from 'express';

// ============================================================================
// Auth Types
// ============================================================================

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export type UserRole = 'user' | 'admin' | 'moderator';

// ============================================================================
// Place Types
// ============================================================================

export type PlaceType = 'hotel' | 'motel' | 'short_stay';

export type PlaceSource = 'taipei-open-data' | 'user' | 'system';

export type PrivacyTag =
  | 'self_checkin'
  | 'soundproof'
  | 'garage'
  | 'cash_only'
  | 'kiosk'
  | 'hourly_rate'
  | 'no_id_required'
  | 'parking_inside';

// ============================================================================
// Review Types
// ============================================================================

export type ReviewTag =
  | 'clean'
  | 'quiet'
  | 'safe'
  | 'friendly_staff'
  | 'value'
  | 'privacy'
  | 'comfortable'
  | 'spacious';

// ============================================================================
// Report Types
// ============================================================================

export type ReportType = 'data_fix' | 'abuse' | 'safety';

export type ReportStatus = 'open' | 'resolved' | 'rejected';

export interface ReportPayload {
  reason: string;
  description?: string;
  suggestedFix?: {
    name?: string;
    address?: string;
    type?: PlaceType;
    latitude?: number;
    longitude?: number;
  };
}

// ============================================================================
// Google Maps API Types
// ============================================================================

export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export interface PlaceSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number; // 0-4
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number; // 0-4
  opening_hours?: {
    open_now?: boolean;
    periods?: any[];
    weekday_text?: string[];
  };
  formatted_phone_number?: string;
  website?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiError {
  error: string;
  details?: any;
}

export interface ApiSuccess<T = any> {
  data?: T;
  message?: string;
}

// ============================================================================
// Filter & Query Types
// ============================================================================

export interface PlaceFilters {
  type?: PlaceType;
  city?: string; // filter by city name (e.g., "臺北市", "宜蘭縣")
  createdBy?: string; // filter by creator user ID
  lat?: number;
  lng?: number;
  radius?: number; // in meters
  minRating?: number;
  maxPriceLevel?: number;
  q?: string; // search query
  boundsNE?: { lat: number; lng: number };
  boundsSW?: { lat: number; lng: number };
  limit?: number;
  offset?: number;
}

// ============================================================================
// Content Moderation
// ============================================================================

export interface ContentModerationResult {
  isAllowed: boolean;
  reasons?: string[];
  flaggedWords?: string[];
}

// Banned words/patterns for content moderation
export const CONTENT_MODERATION_PATTERNS = [
  // Explicit sexual content
  /性交/gi,
  /做愛/gi,
  /\b(?:sex|fuck|porn)\b/gi,

  // Personal attacks
  /垃圾/gi,
  /白癡/gi,
  /智障/gi,

  // Contact information (prevent spam)
  /\d{10,}/g, // 10+ digit numbers (phone/ID)
  /line\s*[:：]?\s*\w+/gi,
  /wechat\s*[:：]?\s*\w+/gi,

  // Pricing information (OTA policy compliance)
  /\$\d+/g,
  /NT\$?\d+/gi,
  /元\d+|價格?\d+/gi,
];

export function moderateContent(text: string): ContentModerationResult {
  if (!text || text.trim().length === 0) {
    return { isAllowed: true };
  }

  const flaggedWords: string[] = [];

  for (const pattern of CONTENT_MODERATION_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      flaggedWords.push(...matches);
    }
  }

  // Check length limits
  if (text.length > 1000) {
    return {
      isAllowed: false,
      reasons: ['Content exceeds 1000 characters'],
    };
  }

  if (flaggedWords.length > 0) {
    return {
      isAllowed: false,
      reasons: ['Contains inappropriate content'],
      flaggedWords,
    };
  }

  return { isAllowed: true };
}
