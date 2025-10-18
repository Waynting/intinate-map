import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  findBestMatch,
  placeDetails,
  sleep,
  retryWithBackoff,
} from '../maps/google';
import { PlaceType, PrivacyTag } from '../types';

const prisma = new PrismaClient();

// ============================================================================
// Types
// ============================================================================

interface HotelData {
  HotelID: string;
  HotelName: string;
  PositionLat: number;
  PositionLon: number;
  HotelClasses: number[];
  PostalAddress: {
    City: string;
    Town?: string;
    StreetAddress: string;
    ZipCode?: string;
  };
  ServiceInfo?: string;
  ParkingInfo?: string;
  Description?: string;
  TotalRooms?: number;
  LowestPrice?: number;
  CeilingPrice?: number;
}

interface HotelListJson {
  UpdateTime: string;
  Hotels: HotelData[];
}

interface ImportStats {
  total: number;
  filtered: number;
  processed: number;
  matched: number;
  enriched: number;
  inserted: number;
  failed: number;
  errors: Array<{ hotelId: string; error: string }>;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  DATA_FILE: path.resolve(__dirname, '../../../Hotel-json/HotelList.json'),
  BATCH_SIZE: 10, // Process 10 hotels at a time
  API_DELAY: 200, // 200ms delay between Google API calls
  MAX_RETRIES: 3,
  DRY_RUN: false, // Set to true to test without inserting
  SKIP_GOOGLE: false, // Set to true to skip Google Places enrichment
  CITY_FILTER: '', // Filter by city (empty = all Taiwan), e.g., '台北', '高雄'
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Classify hotel type based on HotelClasses
 * 1 = 觀光旅館 (Tourist Hotel) → hotel
 * 2 = 一般旅館 (General Hotel) → hotel
 * 3 = 汽車旅館 (Motel) → motel
 * 4 = 民宿 (Homestay/B&B) → short_stay
 */
function classifyType(hotelClasses: number[]): PlaceType {
  if (!hotelClasses || hotelClasses.length === 0) {
    return 'hotel'; // Default to hotel
  }

  const primaryClass = hotelClasses[0];

  switch (primaryClass) {
    case 1:
    case 2:
      return 'hotel';
    case 3:
      return 'motel';
    case 4:
      return 'short_stay';
    default:
      return 'hotel';
  }
}

/**
 * Infer privacy tags from service info and parking info
 */
function inferPrivacyTags(serviceInfo?: string, parkingInfo?: string, type?: PlaceType): PrivacyTag[] {
  const tags: PrivacyTag[] = [];

  // Analyze ServiceInfo (comma-separated services)
  if (serviceInfo) {
    const services = serviceInfo.toLowerCase();

    // Self check-in indicators
    if (services.includes('自助') || services.includes('kiosk') || services.includes('自動')) {
      tags.push('self_checkin');
      tags.push('kiosk');
    }

    // Soundproofing
    if (services.includes('隔音')) {
      tags.push('soundproof');
    }

    // Cash payment
    if (services.includes('現金')) {
      tags.push('cash_only');
    }
  }

  // Analyze ParkingInfo
  if (parkingInfo) {
    const parking = parkingInfo.toLowerCase();

    // Check for parking spaces (小客車 = cars)
    const carMatch = parking.match(/小客車(\d+)輛/);
    if (carMatch && parseInt(carMatch[1]) > 0) {
      tags.push('garage');
    }
  }

  // Motels typically offer hourly rates
  if (type === 'motel') {
    tags.push('hourly_rate');
  }

  // Remove duplicates
  return Array.from(new Set(tags));
}

/**
 * Build full address from PostalAddress
 */
function buildAddress(postalAddress: HotelData['PostalAddress']): string {
  const parts = [
    postalAddress.City,
    postalAddress.Town,
    postalAddress.StreetAddress,
  ].filter(Boolean);

  return parts.join('');
}

/**
 * Check if hotel is in Taipei City
 */
function isTaipeiCity(city: string): boolean {
  return city.includes('台北') || city.includes('臺北');
}

// ============================================================================
// Main Import Logic
// ============================================================================

/**
 * Load and parse hotel data from JSON file
 */
async function loadHotelData(): Promise<HotelData[]> {
  console.log(`📂 Loading data from: ${CONFIG.DATA_FILE}\n`);

  try {
    let fileContent = await fs.readFile(CONFIG.DATA_FILE, 'utf-8');

    // Remove BOM (Byte Order Mark) if present
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.substring(1);
    }

    const data: HotelListJson = JSON.parse(fileContent);

    console.log(`✅ Loaded ${data.Hotels.length} hotels from dataset`);
    console.log(`📅 Data updated: ${data.UpdateTime}\n`);

    return data.Hotels;
  } catch (error: any) {
    console.error(`❌ Failed to load data file:`, error.message);
    throw error;
  }
}

/**
 * Filter hotels by city (if CITY_FILTER is set)
 */
function filterHotels(hotels: HotelData[]): HotelData[] {
  if (!CONFIG.CITY_FILTER) {
    console.log(`🌏 Processing all ${hotels.length} hotels (全台灣)\n`);
    return hotels;
  }

  const filtered = hotels.filter((hotel) => {
    return hotel.PostalAddress.City.includes(CONFIG.CITY_FILTER);
  });

  console.log(`🔍 Filtered to ${filtered.length} hotels in ${CONFIG.CITY_FILTER}\n`);

  return filtered;
}

/**
 * Process a single hotel: match with Google Places and enrich data
 */
async function processHotel(hotel: HotelData): Promise<{
  hotel: HotelData;
  googlePlaceId: string | null;
  googleRating: number | null;
  googleRatingsTotal: number | null;
  googlePriceLevel: number | null;
  matched: boolean;
  enriched: boolean;
}> {
  const address = buildAddress(hotel.PostalAddress);
  const searchQuery = `${hotel.HotelName} ${address}`;
  const location = {
    lat: hotel.PositionLat,
    lng: hotel.PositionLon,
  };

  let googlePlaceId: string | null = null;
  let googleRating: number | null = null;
  let googleRatingsTotal: number | null = null;
  let googlePriceLevel: number | null = null;
  let matched = false;
  let enriched = false;

  // Skip Google enrichment if configured
  if (CONFIG.SKIP_GOOGLE) {
    console.log(`  ⏭️  Skipping Google enrichment: ${hotel.HotelName}`);
    return {
      hotel,
      googlePlaceId,
      googleRating,
      googleRatingsTotal,
      googlePriceLevel,
      matched,
      enriched,
    };
  }

  try {
    // Step 1: Find matching Google Place
    console.log(`  🔍 Searching: ${hotel.HotelName}`);

    const matchedPlace = await retryWithBackoff(
      () => findBestMatch(searchQuery, hotel.HotelName, location),
      CONFIG.MAX_RETRIES
    );

    if (matchedPlace) {
      googlePlaceId = matchedPlace.place_id;
      matched = true;
      console.log(`  ✓ Matched: ${matchedPlace.name} (place_id: ${googlePlaceId.substring(0, 20)}...)`);

      // Step 2: Fetch place details
      await sleep(CONFIG.API_DELAY);

      const details = await retryWithBackoff(
        () => placeDetails(googlePlaceId!),
        CONFIG.MAX_RETRIES
      );

      if (details) {
        googleRating = details.rating ?? null;
        googleRatingsTotal = details.user_ratings_total ?? null;
        googlePriceLevel = details.price_level ?? null;
        enriched = true;
        console.log(`  ✓ Enriched: rating=${googleRating}, price_level=${googlePriceLevel}`);
      }
    } else {
      console.log(`  ⚠️  No Google Place match found`);
    }
  } catch (error: any) {
    console.error(`  ❌ Error processing ${hotel.HotelName}:`, error.message);
  }

  return {
    hotel,
    googlePlaceId,
    googleRating,
    googleRatingsTotal,
    googlePriceLevel,
    matched,
    enriched,
  };
}

/**
 * Insert hotel into database
 */
async function insertHotel(processedHotel: Awaited<ReturnType<typeof processHotel>>): Promise<void> {
  const { hotel, googlePlaceId, googleRating, googleRatingsTotal, googlePriceLevel } = processedHotel;

  const type = classifyType(hotel.HotelClasses);
  const address = buildAddress(hotel.PostalAddress);
  const privacyTags = inferPrivacyTags(hotel.ServiceInfo, hotel.ParkingInfo, type);

  await prisma.place.create({
    data: {
      name: hotel.HotelName,
      type,
      address,
      latitude: hotel.PositionLat,
      longitude: hotel.PositionLon,
      googlePlaceId,
      googleRating,
      googleRatingsTotal,
      googlePriceLevel,
      privacyTags: privacyTags.length > 0 ? JSON.stringify(privacyTags) : null,
      source: 'taipei-open-data',
      createdBy: null, // System import
    },
  });

  console.log(`  💾 Inserted: ${hotel.HotelName} (${type})`);
}

/**
 * Process hotels in batches
 */
async function processBatch(
  hotels: HotelData[],
  batchIndex: number,
  stats: ImportStats
): Promise<void> {
  console.log(`\n📦 Batch ${batchIndex + 1} (${hotels.length} hotels):`);
  console.log('─'.repeat(80));

  for (let i = 0; i < hotels.length; i++) {
    const hotel = hotels[i];

    try {
      // Process (match + enrich)
      const processed = await processHotel(hotel);
      stats.processed++;

      if (processed.matched) stats.matched++;
      if (processed.enriched) stats.enriched++;

      // Insert into database
      if (!CONFIG.DRY_RUN) {
        await insertHotel(processed);
        stats.inserted++;
      }

      // Delay between hotels to avoid rate limits
      if (i < hotels.length - 1) {
        await sleep(CONFIG.API_DELAY);
      }
    } catch (error: any) {
      stats.failed++;
      stats.errors.push({
        hotelId: hotel.HotelID,
        error: error.message,
      });
      console.error(`  ❌ Failed to process ${hotel.HotelName}:`, error.message);
    }
  }
}

/**
 * Main import function
 */
async function importHotels(): Promise<void> {
  console.log('🚀 Taiwan Hotel Data Import Script');
  console.log('═'.repeat(80));
  console.log(`Config: Batch size=${CONFIG.BATCH_SIZE}, Delay=${CONFIG.API_DELAY}ms`);
  console.log(`Mode: ${CONFIG.DRY_RUN ? 'DRY RUN (no database writes)' : 'PRODUCTION'}`);
  console.log(`Google enrichment: ${CONFIG.SKIP_GOOGLE ? 'DISABLED' : 'ENABLED'}`);
  console.log('═'.repeat(80));
  console.log('');

  const stats: ImportStats = {
    total: 0,
    filtered: 0,
    processed: 0,
    matched: 0,
    enriched: 0,
    inserted: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Step 1: Load data
    const allHotels = await loadHotelData();
    stats.total = allHotels.length;

    // Step 2: Filter by city (if configured)
    const hotels = filterHotels(allHotels);
    stats.filtered = hotels.length;

    if (hotels.length === 0) {
      console.log('⚠️  No hotels found matching filter criteria');
      return;
    }

    // Step 3: Process in batches
    const batches = [];
    for (let i = 0; i < hotels.length; i += CONFIG.BATCH_SIZE) {
      batches.push(hotels.slice(i, i + CONFIG.BATCH_SIZE));
    }

    console.log(`📊 Processing ${hotels.length} hotels in ${batches.length} batches...\n`);

    for (let i = 0; i < batches.length; i++) {
      await processBatch(batches[i], i, stats);

      // Progress update
      const progress = ((stats.processed / stats.filtered) * 100).toFixed(1);
      console.log(`\n⏱️  Progress: ${stats.processed}/${stats.filtered} (${progress}%)`);
    }

    // Step 4: Print summary
    console.log('\n');
    console.log('═'.repeat(80));
    console.log('✅ Import Complete!');
    console.log('═'.repeat(80));
    console.log(`Total hotels in dataset:     ${stats.total}`);
    console.log(`Hotels to process:           ${stats.filtered}${CONFIG.CITY_FILTER ? ` (${CONFIG.CITY_FILTER})` : ' (全台灣)'}`);
    console.log(`Processed:                   ${stats.processed}`);
    console.log(`Matched with Google Places:  ${stats.matched} (${((stats.matched / stats.processed) * 100).toFixed(1)}%)`);
    console.log(`Enriched with details:       ${stats.enriched} (${((stats.enriched / stats.processed) * 100).toFixed(1)}%)`);
    console.log(`Inserted to database:        ${stats.inserted}`);
    console.log(`Failed:                      ${stats.failed}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      stats.errors.forEach((err) => {
        console.log(`  - ${err.hotelId}: ${err.error}`);
      });
    }

    console.log('═'.repeat(80));
  } catch (error: any) {
    console.error('\n❌ Import failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================================
// CLI Execution
// ============================================================================

// Allow command-line arguments
const args = process.argv.slice(2);
if (args.includes('--dry-run')) {
  CONFIG.DRY_RUN = true;
}
if (args.includes('--skip-google')) {
  CONFIG.SKIP_GOOGLE = true;
}
if (args.includes('--city')) {
  const idx = args.indexOf('--city');
  CONFIG.CITY_FILTER = args[idx + 1] || '';
}
if (args.includes('--batch-size')) {
  const idx = args.indexOf('--batch-size');
  CONFIG.BATCH_SIZE = parseInt(args[idx + 1]) || 10;
}

// Run import
importHotels()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
