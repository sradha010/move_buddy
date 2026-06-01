import { useState, useCallback, useRef } from 'react';
import { haversineDistance, estimateDurationMinutes } from '../mocks/locations';

export interface PlaceData {
  placeId: string;
  address: string;
  lat: number;
  lng: number;
}

export interface DistanceResult {
  distanceKm: number;
  durationMinutes: number;
  source: 'google' | 'mock';
}

interface UseDistanceMatrixReturn {
  result: DistanceResult | null;
  loading: boolean;
  error: string | null;
  calculateDistanceFromPlaces: (origin: PlaceData | null, destination: PlaceData | null) => Promise<void>;
  clearResult: () => void;
}

/**
 * Distance Matrix Hook
 *
 * Calculates distance between two places using:
 * - Google Distance Matrix API (if available)
 * - Haversine formula (fallback)
 *
 * Includes request deduplication based on coordinates
 */
export function useDistanceMatrix(mapsLoaded: boolean): UseDistanceMatrixReturn {
  const [result, setResult] = useState<DistanceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRequests = useRef<Map<string, Promise<void>>>(new Map());

  /**
   * Generate unique key for origin-destination pair
   */
  const getRequestKey = (origin: PlaceData, destination: PlaceData): string => {
    return `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}--${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`;
  };

  /**
   * Calculate distance using Haversine formula (fallback)
   */
  const calculateHaversine = useCallback((origin: PlaceData, destination: PlaceData): DistanceResult => {
    const distanceKm = haversineDistance(
      origin.lat,
      origin.lng,
      destination.lat,
      destination.lng
    );

    const durationMinutes = estimateDurationMinutes(distanceKm);

    return {
      distanceKm,
      durationMinutes,
      source: 'mock',
    };
  }, []);

  /**
   * Calculate distance using Google Distance Matrix API
   */
  const calculateGoogle = useCallback(
    async (origin: PlaceData, destination: PlaceData): Promise<DistanceResult> => {
      return new Promise((resolve, reject) => {
        if (!window.google?.maps?.DistanceMatrixService) {
          reject(new Error('Google Maps API not available'));
          return;
        }

        const service = new window.google.maps.DistanceMatrixService();

        service.getDistanceMatrix(
          {
            origins: [{ lat: origin.lat, lng: origin.lng }],
            destinations: [{ lat: destination.lat, lng: destination.lng }],
            travelMode: window.google.maps.TravelMode.DRIVING,
            unitSystem: window.google.maps.UnitSystem.METRIC,
            avoidHighways: false,
            avoidTolls: false,
          },
          (response, status) => {
            if (status !== window.google.maps.DistanceMatrixStatus.OK) {
              let errorMsg = 'Failed to calculate distance';

              if (status === window.google.maps.DistanceMatrixStatus.INVALID_REQUEST) {
                errorMsg = 'Invalid request parameters';
              } else if (status === window.google.maps.DistanceMatrixStatus.OVER_QUERY_LIMIT) {
                errorMsg = 'API quota exceeded. Please try again later';
              } else if (status === window.google.maps.DistanceMatrixStatus.REQUEST_DENIED) {
                errorMsg = 'API key not authorized for Distance Matrix';
              } else if (String(status) === 'ZERO_RESULTS') {
                errorMsg = 'No driving route found between these locations';
              } else if (String(status) === 'NOT_FOUND') {
                errorMsg = 'One or more locations could not be found';
              } else {
                errorMsg = `Distance calculation failed: ${status}`;
              }

              reject(new Error(errorMsg));
              return;
            }

            if (!response?.rows?.[0]?.elements?.[0]) {
              reject(new Error('Invalid response from Distance Matrix API'));
              return;
            }

            const element = response.rows[0].elements[0];

            if (element.status !== window.google.maps.DistanceMatrixElementStatus.OK) {
              reject(new Error('No route found between these locations'));
              return;
            }

            const distanceMeters = element.distance?.value || 0;
            const durationSeconds = element.duration?.value || 0;

            resolve({
              distanceKm: Math.round((distanceMeters / 1000) * 10) / 10,
              durationMinutes: Math.round(durationSeconds / 60),
              source: 'google',
            });
          }
        );
      });
    },
    []
  );

  /**
   * Calculate distance from PlaceData objects
   */
  const calculateDistanceFromPlaces = useCallback(
    async (origin: PlaceData | null, destination: PlaceData | null) => {
      // Clear previous results
      setError(null);

      // Validate inputs
      if (!origin || !destination) {
        setResult(null);
        setLoading(false);
        return;
      }

      // Check for same location
      if (
        origin.lat === destination.lat &&
        origin.lng === destination.lng
      ) {
        setError('Origin and destination are the same location');
        setResult(null);
        setLoading(false);
        return;
      }

      // Check for duplicate requests
      const requestKey = getRequestKey(origin, destination);
      const existingRequest = pendingRequests.current.get(requestKey);
      if (existingRequest) {
        return existingRequest;
      }

      // Start loading
      setLoading(true);

      // Create request promise
      const requestPromise = async () => {
        try {
          // Decide: Google API or Haversine fallback
          const googleReady =
            mapsLoaded &&
            !!window.google?.maps?.DistanceMatrixService &&
            !origin.placeId.startsWith('mock-') &&
            !destination.placeId.startsWith('mock-');

          let distanceResult: DistanceResult;

          if (googleReady) {
            // Use Google Distance Matrix API
            distanceResult = await calculateGoogle(origin, destination);
          } else {
            // Use Haversine fallback
            distanceResult = calculateHaversine(origin, destination);
          }

          setResult(distanceResult);
          setError(null);
        } catch (err) {
          // If Google fails, try Haversine as fallback
          if (mapsLoaded) {
            try {
              const fallbackResult = calculateHaversine(origin, destination);
              setResult(fallbackResult);
              setError(null);
            } catch {
              setError(err instanceof Error ? err.message : 'Failed to calculate distance');
              setResult(null);
            }
          } else {
            setError(err instanceof Error ? err.message : 'Failed to calculate distance');
            setResult(null);
          }
        } finally {
          setLoading(false);
          pendingRequests.current.delete(requestKey);
        }
      };

      const promise = requestPromise();
      // Store the promise for deduplication
      pendingRequests.current.set(requestKey, promise);

      await promise;
    },
    [mapsLoaded, calculateGoogle, calculateHaversine]
  );

  /**
   * Clear the current result
   */
  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    result,
    loading,
    error,
    calculateDistanceFromPlaces,
    clearResult,
  };
}
