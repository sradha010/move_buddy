import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

// ─── Return-type interfaces ────────────────────────────────────────────────────

export interface AutocompleteResult {
  label: string;
  lat: number;
  lng: number;
  placeId: string;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

export interface RouteResult {
  distance_km: number;
  duration_minutes: number;
  polyline: string;
}

export interface RouteOverlapResult {
  overlap_percentage: number;
}

// ─── Coordinate helper ────────────────────────────────────────────────────────

interface LatLng {
  lat: number;
  lng: number;
}

// ─── ORS response shapes (minimal) ────────────────────────────────────────────

interface OrsGeocodeFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    label?: string;
    name?: string;
    id?: string;
    gid?: string;
  };
}

interface OrsGeocodeResponse {
  features: OrsGeocodeFeature[];
}

interface OrsRouteResponse {
  routes: Array<{
    summary: { distance: number; duration: number };
    geometry: string;
  }>;
}

@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);
  private readonly http: AxiosInstance;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.get<string>('ORS_API_KEY');
    if (!key) {
      throw new Error(
        'ORS_API_KEY is not configured. Set it in your .env file.',
      );
    }
    this.apiKey = key;

    this.http = axios.create({
      baseURL: 'https://api.openrouteservice.org',
      timeout: 10_000,
    });
  }

  // ─── 1. Autocomplete ──────────────────────────────────────────────────────────

  async autocomplete(
    query: string,
    lang = 'en',
  ): Promise<AutocompleteResult[]> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Query string must not be empty.');
    }

    try {
      const { data } = await this.http.get<OrsGeocodeResponse>(
        '/geocode/autocomplete',
        {
          params: {
            api_key: this.apiKey,
            text: query.trim(),
            lang,
            layers: 'locality,street,venue',
            'boundary.country': 'IN',
          },
        },
      );

      if (!data?.features?.length) {
        return [];
      }

      return data.features.map((feature) => ({
        label: feature.properties.label ?? feature.properties.name ?? '',
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
        placeId: feature.properties.gid ?? feature.properties.id ?? '',
      }));
    } catch (err) {
      this.logger.error(
        `ORS autocomplete failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw new InternalServerErrorException(
        'Autocomplete request to mapping service failed.',
      );
    }
  }

  // ─── 2. Geocode ───────────────────────────────────────────────────────────────

  async geocode(address: string): Promise<GeocodeResult> {
    if (!address || address.trim().length === 0) {
      throw new BadRequestException('Address must not be empty.');
    }

    try {
      const { data } = await this.http.get<OrsGeocodeResponse>(
        '/geocode/search',
        {
          params: {
            api_key: this.apiKey,
            text: address.trim(),
            'boundary.country': 'IN',
            size: 1,
          },
        },
      );

      if (!data?.features?.length) {
        throw new BadRequestException(
          `No geocoding result found for address: "${address}"`,
        );
      }

      const feature = data.features[0];

      return {
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
        label: feature.properties.label ?? feature.properties.name ?? address,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(
        `ORS geocode failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw new InternalServerErrorException(
        'Geocoding request to mapping service failed.',
      );
    }
  }

  // ─── 3. Get Route ─────────────────────────────────────────────────────────────

  async getRoute(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
  ): Promise<RouteResult> {
    this.validateCoordinate(originLat, 'originLat');
    this.validateCoordinate(originLng, 'originLng');
    this.validateCoordinate(destLat, 'destLat');
    this.validateCoordinate(destLng, 'destLng');

    try {
      const { data } = await this.http.post<OrsRouteResponse>(
        '/v2/directions/driving-car/json',
        {
          coordinates: [
            [originLng, originLat],
            [destLng, destLat],
          ],
        },
        {
          headers: {
            Authorization: this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!data?.routes?.length) {
        throw new BadRequestException(
          'No route found between the given coordinates.',
        );
      }

      const route = data.routes[0];
      const distanceKm =
        Math.round((route.summary.distance / 1000) * 10) / 10;
      const durationMinutes = Math.round(route.summary.duration / 60);

      return {
        distance_km: distanceKm,
        duration_minutes: durationMinutes,
        polyline: route.geometry,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(
        `ORS getRoute failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw new InternalServerErrorException(
        'Route request to mapping service failed.',
      );
    }
  }

  // ─── 4. Calculate Route Overlap ───────────────────────────────────────────────
  //
  // Strategy:
  //   - Interpolate N sample points along the host's straight-line route segment.
  //   - For each guest pickup/dropoff, find the closest point on the host route.
  //   - A guest point is "on" the host route if it is within THRESHOLD_KM of the
  //     closest sample point AND the guest sub-segment (pickup→dropoff) runs in the
  //     same general direction as the host route.
  //   - Overlap score = weighted combination of both conditions (0–100).

  async calculateRouteOverlap(
    hostRoute: { originLat: number; originLng: number; destLat: number; destLng: number },
    guestPickup: LatLng,
    guestDropoff: LatLng,
  ): Promise<RouteOverlapResult> {
    const THRESHOLD_KM = 1.5; // max off-route distance to be considered "on route"
    const SAMPLE_COUNT = 50;  // resolution for host-route sampling

    const hostOrigin: LatLng = { lat: hostRoute.originLat, lng: hostRoute.originLng };
    const hostDest: LatLng   = { lat: hostRoute.destLat,   lng: hostRoute.destLng   };

    // Build sample points along host route straight-line
    const hostSamples: LatLng[] = [];
    for (let i = 0; i <= SAMPLE_COUNT; i++) {
      const t = i / SAMPLE_COUNT;
      hostSamples.push({
        lat: hostOrigin.lat + t * (hostDest.lat - hostOrigin.lat),
        lng: hostOrigin.lng + t * (hostDest.lng - hostOrigin.lng),
      });
    }

    // Closest distance from a point to the sampled host route
    const minDistToHostRoute = (point: LatLng): number =>
      Math.min(...hostSamples.map((s) => this.haversineKm(point, s)));

    const pickupDist  = minDistToHostRoute(guestPickup);
    const dropoffDist = minDistToHostRoute(guestDropoff);

    // Score each point: 1 if within threshold, decaying linearly to 0 at 2× threshold
    const pointScore = (dist: number): number =>
      dist <= THRESHOLD_KM
        ? 1
        : dist <= THRESHOLD_KM * 2
        ? 1 - (dist - THRESHOLD_KM) / THRESHOLD_KM
        : 0;

    const pickupScore  = pointScore(pickupDist);
    const dropoffScore = pointScore(dropoffDist);

    // Directional alignment bonus: guest segment should be roughly aligned with host
    const hostBearing  = this.bearing(hostOrigin, hostDest);
    const guestBearing = this.bearing(guestPickup, guestDropoff);
    const angleDiff    = Math.abs(hostBearing - guestBearing) % 360;
    const normalised   = angleDiff > 180 ? 360 - angleDiff : angleDiff;
    // 0° diff → 1.0, 90° diff → 0.5, 180° diff → 0.0
    const directionScore = Math.max(0, 1 - normalised / 180);

    // Combined: 40% pickup proximity, 40% dropoff proximity, 20% direction
    const raw = pickupScore * 0.4 + dropoffScore * 0.4 + directionScore * 0.2;
    const overlap_percentage = Math.round(raw * 100);

    return { overlap_percentage };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private validateCoordinate(value: number, name: string): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new BadRequestException(`${name} must be a valid number.`);
    }
  }

  /** Haversine distance in km between two lat/lng points. */
  private haversineKm(a: LatLng, b: LatLng): number {
    const R = 6371;
    const dLat = this.toRad(b.lat - a.lat);
    const dLng = this.toRad(b.lng - a.lng);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const chord =
      sinDLat * sinDLat +
      Math.cos(this.toRad(a.lat)) * Math.cos(this.toRad(b.lat)) * sinDLng * sinDLng;
    return R * 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord));
  }

  /** Compass bearing (0–360°) from point a to point b. */
  private bearing(a: LatLng, b: LatLng): number {
    const dLng = this.toRad(b.lng - a.lng);
    const lat1 = this.toRad(a.lat);
    const lat2 = this.toRad(b.lat);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}
