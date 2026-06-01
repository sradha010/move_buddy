/**
 * Mock Location Data & Haversine Distance Calculator
 *
 * When Google Maps API key is not configured, this module provides:
 * - 20 real Bengaluru locations with verified coordinates
 * - Haversine formula for accurate distance calculation
 * - Duration estimation based on average city speed
 */

export interface MockLocation {
  address: string;
  lat: number;
  lng: number;
}

/**
 * 20 verified Bengaluru locations with real coordinates
 */
export const MOCK_LOCATIONS: MockLocation[] = [
  { address: 'Koramangala, Bengaluru', lat: 12.9352, lng: 77.6245 },
  { address: 'Indiranagar, Bengaluru', lat: 12.9784, lng: 77.6408 },
  { address: 'Whitefield, Bengaluru', lat: 12.9698, lng: 77.7500 },
  { address: 'Electronic City, Bengaluru', lat: 12.8456, lng: 77.6603 },
  { address: 'HSR Layout, Bengaluru', lat: 12.9116, lng: 77.6389 },
  { address: 'JP Nagar, Bengaluru', lat: 12.9063, lng: 77.5858 },
  { address: 'Marathahalli, Bengaluru', lat: 12.9591, lng: 77.6974 },
  { address: 'BTM Layout, Bengaluru', lat: 12.9166, lng: 77.6101 },
  { address: 'Jayanagar, Bengaluru', lat: 12.9308, lng: 77.5838 },
  { address: 'Bellandur, Bengaluru', lat: 12.9261, lng: 77.6756 },
  { address: 'Hebbal, Bengaluru', lat: 13.0358, lng: 77.5970 },
  { address: 'Yelahanka, Bengaluru', lat: 13.1007, lng: 77.5963 },
  { address: 'Banashankari, Bengaluru', lat: 12.9255, lng: 77.5468 },
  { address: 'Malleswaram, Bengaluru', lat: 13.0035, lng: 77.5647 },
  { address: 'Richmond Town, Bengaluru', lat: 12.9645, lng: 77.6013 },
  { address: 'MG Road, Bengaluru', lat: 12.9756, lng: 77.6063 },
  { address: 'Brigade Road, Bengaluru', lat: 12.9716, lng: 77.6107 },
  { address: 'Kempegowda Bus Station, Bengaluru', lat: 12.9767, lng: 77.5713 },
  { address: 'Silk Board Junction, Bengaluru', lat: 12.9177, lng: 77.6238 },
  { address: 'Outer Ring Road, Bengaluru', lat: 12.9315, lng: 77.6270 },
  { address: 'Sarjapur Road, Bengaluru', lat: 12.9082, lng: 77.6475 },
  { address: 'Hennur, Bengaluru', lat: 13.0349, lng: 77.6390 },
  { address: 'Kalyan Nagar, Bengaluru', lat: 13.0157, lng: 77.6498 },
  { address: 'Banashankari 2nd Stage, Bengaluru', lat: 12.9117, lng: 77.5380 },
  { address: 'RR Nagar, Bengaluru', lat: 12.9468, lng: 77.4892 },
  { address: 'KR Puram, Bengaluru', lat: 12.9978, lng: 77.6789 },
  { address: 'Brookefield, Bengaluru', lat: 12.9605, lng: 77.7238 },
  { address: 'CV Raman Nagar, Bengaluru', lat: 12.9860, lng: 77.6483 },
];

/**
 * Calculate distance between two coordinates using Haversine formula
 *
 * The Haversine formula determines the great-circle distance between
 * two points on a sphere given their longitudes and latitudes.
 *
 * Formula:
 *   a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)
 *   c = 2 × atan2(√a, √(1-a))
 *   distance = R × c
 *
 * Where R = Earth radius = 6371 km
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Estimate travel duration based on distance
 *
 * Assumes average speed of 25 km/h in Bengaluru city traffic
 * This is a conservative estimate for realistic conditions
 */
export function estimateDurationMinutes(distanceKm: number): number {
  const avgSpeedKmPerH = 25; // Average speed in city traffic
  const minutes = (distanceKm / avgSpeedKmPerH) * 60;
  return Math.round(minutes);
}

/**
 * Filter mock locations by search query
 *
 * Case-insensitive substring match
 * Returns up to 8 results
 */
export function filterMockLocations(query: string): MockLocation[] {
  if (!query || query.trim() === '') {
    return MOCK_LOCATIONS.slice(0, 8);
  }

  const lowerQuery = query.toLowerCase().trim();

  return MOCK_LOCATIONS.filter((loc) =>
    loc.address.toLowerCase().includes(lowerQuery)
  ).slice(0, 8);
}

/**
 * Get a mock location by address
 */
export function getMockLocationByAddress(address: string): MockLocation | undefined {
  return MOCK_LOCATIONS.find((loc) => loc.address === address);
}
