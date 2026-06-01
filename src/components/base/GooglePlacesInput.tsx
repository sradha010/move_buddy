import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { filterMockLocations, type MockLocation } from '../../mocks/locations';

export interface PlaceData {
  placeId: string;
  address: string;
  lat: number;
  lng: number;
}

interface GooglePlacesInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  onPlaceSelected: (place: PlaceData) => void;
  mapsLoaded: boolean;
  disabled?: boolean;
  inputClassName?: string;
}

/**
 * Hybrid Location Input Component
 *
 * Two modes:
 * 1. Google Places Autocomplete (when API is available)
 * 2. Mock location dropdown (fallback)
 */
export default function GooglePlacesInput({
  label,
  placeholder,
  value,
  onChange,
  onPlaceSelected,
  mapsLoaded,
  disabled = false,
  inputClassName,
}: GooglePlacesInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<MockLocation[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Handle mock mode suggestions
   */
  useEffect(() => {
    if (!mapsLoaded && value.length >= 0) {
      const filtered = filterMockLocations(value);
      setSuggestions(filtered);
      setHighlightedIndex(0);
    }
  }, [value, mapsLoaded]);

  /**
   * Initialize Google Places Autocomplete
   */
  useEffect(() => {
    if (!mapsLoaded || !inputRef.current || !window.google?.maps?.places) {
      return;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'in' },
      fields: ['place_id', 'formatted_address', 'geometry.location'],
      types: ['geocode'],
    });

    autocompleteRef.current = autocomplete;

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();

      if (!place.place_id || !place.formatted_address || !place.geometry?.location) {
        return;
      }

      const placeData: PlaceData = {
        placeId: place.place_id,
        address: place.formatted_address,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };

      onChange(placeData.address);
      onPlaceSelected(placeData);
      setShowDropdown(false);
    });

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [mapsLoaded, onChange, onPlaceSelected]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (mapsLoaded) return; // Google handles its own navigation

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (suggestions[highlightedIndex]) {
            handleMockSelect(suggestions[highlightedIndex]);
          }
          break;
        case 'Escape':
          setShowDropdown(false);
          break;
      }
    },
    [mapsLoaded, suggestions, highlightedIndex]
  );

  /**
   * Handle mock location selection
   */
  const handleMockSelect = useCallback(
    (location: MockLocation) => {
      const placeData: PlaceData = {
        placeId: `mock-${location.address}`,
        address: location.address,
        lat: location.lat,
        lng: location.lng,
      };

      onChange(location.address);
      onPlaceSelected(placeData);
      setShowDropdown(false);
    },
    [onChange, onPlaceSelected]
  );

  /**
   * Handle click outside
   */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Scroll highlighted item into view
   */
  const highlightedRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-sm text-text-dark font-medium mb-2">
        <MapPin className="w-4 h-4 inline mr-1" />
        {label}
      </label>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (!mapsLoaded) {
            setShowDropdown(true);
          }
        }}
        onFocus={() => {
          if (!mapsLoaded) {
            setShowDropdown(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClassName ?? 'input-filled w-full'}
      />

      {!mapsLoaded && value && (
        <p className="text-xs text-muted mt-1">
          Using mock locations. Add Google Maps API key for real addresses.
        </p>
      )}

      {/* Mock Dropdown */}
      <AnimatePresence>
        {showDropdown && !mapsLoaded && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-[9999] top-full left-0 right-0 mt-1 bg-bg border border-primary/20 rounded-xl shadow-2xl max-h-72 overflow-y-auto"
          >
            {suggestions.map((location, index) => (
              <button
                key={location.address}
                ref={index === highlightedIndex ? highlightedRef : null}
                onClick={() => handleMockSelect(location)}
                className={`w-full text-left px-4 py-3 text-sm flex items-center gap-2 transition-colors ${
                  index === highlightedIndex
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-light hover:bg-teal/10'
                }`}
              >
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>{location.address}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
