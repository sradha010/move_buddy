/**
 * Google Maps API Gatekeeper
 *
 * This module handles Google Maps API loading and validation.
 * It decides whether to use real APIs or fallback to mock data.
 */

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

type KeyStatus = 'configured' | 'placeholder' | 'missing';

let isLoaded = false;
let loadPromise: Promise<void> | null = null;

/**
 * Check if the API key is properly configured
 */
export function isKeyConfigured(): boolean {
  return !!(GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== 'YOUR_API_KEY_HERE');
}

/**
 * Get the current status of the Google Maps API key
 */
export function getGoogleMapsKeyStatus(): KeyStatus {
  if (!GOOGLE_MAPS_API_KEY) {
    return 'missing';
  }
  if (String(GOOGLE_MAPS_API_KEY) === 'YOUR_API_KEY_HERE') {
    return 'placeholder';
  }
  return 'configured';
}

/**
 * Load Google Maps JavaScript API
 *
 * Validates:
 * 1. Key is not placeholder
 * 2. Script loads successfully
 * 3. Required APIs are present (Maps, Places, DistanceMatrix)
 */
export async function loadGoogleMaps(): Promise<void> {
  // If already loading, return existing promise
  if (loadPromise) {
    return loadPromise;
  }

  // If already loaded, resolve immediately
  if (isLoaded && window.google?.maps) {
    return Promise.resolve();
  }

  // Check if key is configured
  if (!isKeyConfigured()) {
    return Promise.reject(
      new Error(
        'Google Maps API key not configured. Using fallback mock data. Replace YOUR_API_KEY_HERE in src/lib/googleMaps.ts to enable real API.'
      )
    );
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      // Wait for it to load
      existingScript.addEventListener('load', () => {
        validateAndResolve(resolve, reject);
      });
      existingScript.addEventListener('error', () => {
        reject(new Error('Failed to load Google Maps script'));
      });
      return;
    }

    // Create script
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      validateAndResolve(resolve, reject);
    };

    script.onerror = () => {
      reject(
        new Error(
          'Failed to load Google Maps script. Please check your API key and ensure the following APIs are enabled in Google Cloud Console:\n' +
          '- Maps JavaScript API\n' +
          '- Places API\n' +
          '- Distance Matrix API'
        )
      );
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Validate that all required Google Maps APIs are present
 */
function validateAndResolve(
  resolve: () => void,
  reject: (reason: Error) => void
): void {
  // Check if window.google exists
  if (!window.google) {
    reject(new Error('Google Maps script loaded but window.google is undefined'));
    return;
  }

  // Check for Maps API
  if (!window.google.maps) {
    reject(new Error('Google Maps API not loaded'));
    return;
  }

  // Check for Places API
  if (!window.google.maps.places) {
    reject(
      new Error(
        'Google Maps Places API not loaded. Enable Places API in Google Cloud Console.'
      )
    );
    return;
  }

  // Check for Distance Matrix API
  if (!window.google.maps.DistanceMatrixService) {
    reject(
      new Error(
        'Google Maps Distance Matrix API not loaded. Enable Distance Matrix API in Google Cloud Console.'
      )
    );
    return;
  }

  isLoaded = true;
  resolve();
}

/**
 * Check if Google Maps is currently loaded and ready
 */
export function isGoogleMapsLoaded(): boolean {
  return isLoaded && !!window.google?.maps;
}

// Type declarations for Google Maps
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any;
  }
}
