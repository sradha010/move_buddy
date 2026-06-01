import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import GooglePlacesInput, { type PlaceData } from './base/GooglePlacesInput';
import { useDistanceMatrix } from '../hooks/useDistanceMatrix';
import { loadGoogleMaps } from '../lib/googleMaps';

const BUDDYRIDE_RATE = 6;        // ₹/km
const TRIPS_PER_MONTH = 40;      // 2 trips × 5 days × 4 weeks


interface ExpenseCalculatorProps {
  mode?: 'guest' | 'host';
  showPlans?: boolean;
  onRouteChange?: (data: any) => void;
}

export default function ExpenseCalculator({ onRouteChange }: ExpenseCalculatorProps) {
  const [mapsLoaded, setMapsLoaded]           = useState(false);
  const [originPlace, setOriginPlace]         = useState<PlaceData | null>(null);
  const [destinationPlace, setDestinationPlace] = useState<PlaceData | null>(null);
  const [originValue, setOriginValue]         = useState('');
  const [destinationValue, setDestinationValue] = useState('');
  const [showBreakdown, setShowBreakdown]     = useState(false);
  const [showComparison, setShowComparison]   = useState(false);

  const { result, loading, error, calculateDistanceFromPlaces } = useDistanceMatrix(mapsLoaded);

  useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapsLoaded(true))
      .catch(() => setMapsLoaded(false));
  }, []);

  useEffect(() => {
    calculateDistanceFromPlaces(originPlace, destinationPlace);
  }, [originPlace, destinationPlace, calculateDistanceFromPlaces]);

  const distanceKm      = result?.distanceKm || 0;
  const durationMinutes = result?.durationMinutes || 0;

  // Per-trip & monthly figures
  const BIKE_TAXI_RATE = 10;
  const buddyFare      = Math.round(BUDDYRIDE_RATE * distanceKm);
  const buddyMonthly   = Math.round(BUDDYRIDE_RATE * distanceKm * TRIPS_PER_MONTH);
  const bikeTaxiMonthly = Math.round(BIKE_TAXI_RATE * distanceKm * TRIPS_PER_MONTH);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);

  const fmtDur = (m: number) => {
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), rem = m % 60;
    return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
  };

  const handleOriginSelect = useCallback((place: PlaceData) => {
    setOriginPlace(place); setOriginValue(place.address);
  }, []);

  const handleDestinationSelect = useCallback((place: PlaceData) => {
    setDestinationPlace(place); setDestinationValue(place.address);
  }, []);

  useEffect(() => {
    if (onRouteChange && distanceKm > 0) {
      onRouteChange({ origin: originPlace, destination: destinationPlace, distanceKm, durationMinutes, fare: buddyFare });
    }
  }, [originPlace, destinationPlace, distanceKm, durationMinutes, buddyFare, onRouteChange]);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 space-y-5">

      {/* ── Route Inputs ───────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="font-syne font-semibold text-lg text-gray-900">Route Selection</h3>
        <GooglePlacesInput
          label="Origin"
          placeholder="Enter starting point..."
          value={originValue}
          onChange={setOriginValue}
          onPlaceSelected={handleOriginSelect}
          mapsLoaded={mapsLoaded}
          inputClassName="w-full bg-gray-50 text-gray-900 rounded-lg py-3 px-4 border-2 border-gray-200 focus:outline-none focus:border-primary transition-all duration-300"
        />
        <GooglePlacesInput
          label="Destination"
          placeholder="Enter destination..."
          value={destinationValue}
          onChange={setDestinationValue}
          onPlaceSelected={handleDestinationSelect}
          mapsLoaded={mapsLoaded}
          inputClassName="w-full bg-gray-50 text-gray-900 rounded-lg py-3 px-4 border-2 border-gray-200 focus:outline-none focus:border-primary transition-all duration-300"
        />
      </div>

      {/* ── Loading ─────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-6">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Calculating route…
          </div>
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────── */}
      {error && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────── */}
      {!originPlace && !destinationPlace && !loading && (
        <div className="text-center py-10 text-gray-400 text-sm">
          <span className="text-4xl block mb-2">🛵</span>
          Enter origin &amp; destination to calculate fares
        </div>
      )}

      {/* ── Results (only when distance known) ──────────────── */}
      {distanceKm > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

          {/* Route summary */}
          <div className="border-t border-gray-100" />
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Distance</p>
              <p className="font-syne font-bold text-2xl text-primary">{distanceKm} km</p>
            </div>
            {durationMinutes > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Est. Time</p>
                <p className="font-syne font-bold text-2xl text-gray-800">{fmtDur(durationMinutes)}</p>
              </div>
            )}
          </div>

          {/* ── Fare Breakdown (collapsible) ─────────────────── */}
          <div className="border-t border-gray-100" />
          <div>
            <button
              onClick={() => setShowBreakdown(v => !v)}
              className="flex items-center justify-between w-full py-1 group"
            >
              <h3 className="font-syne font-semibold text-base text-gray-900 group-hover:text-primary transition-colors">
                Fare Breakdown
              </h3>
              {showBreakdown
                ? <ChevronUp  className="w-4 h-4 text-gray-400" />
                : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            <AnimatePresence>
              {showBreakdown && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 space-y-1 text-sm">
                    <div className="flex justify-between py-2 px-1">
                      <span className="text-gray-500">BuddyRide Rate</span>
                      <span className="font-mono text-primary font-semibold">₹{BUDDYRIDE_RATE}/km</span>
                    </div>
                    <div className="flex justify-between py-2 px-1">
                      <span className="text-gray-500">Distance</span>
                      <span className="font-mono text-gray-700">{distanceKm} km</span>
                    </div>
                    <div className="border-t border-gray-100 my-1" />
                    <div className="flex justify-between items-center py-3 px-3 bg-primary/10 rounded-xl border border-primary/20">
                      <span className="font-semibold text-gray-900">Per Trip Fare</span>
                      <span className="font-syne font-bold text-xl text-primary">{fmt(buddyFare)}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Monthly Comparison (collapsible) ─────────────── */}
          <div className="border-t border-gray-100" />
          <div>
            <button
              onClick={() => setShowComparison(v => !v)}
              className="flex items-center justify-between w-full py-1 group"
            >
              <h3 className="font-syne font-semibold text-base text-gray-900 group-hover:text-primary transition-colors">
                Monthly Comparison
              </h3>
              {showComparison
                ? <ChevronUp  className="w-4 h-4 text-gray-400" />
                : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            <AnimatePresence>
              {showComparison && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 space-y-2">
                    {/* Info rows */}
                    <div className="bg-gray-50 rounded-lg px-4 py-2.5 text-sm text-center text-gray-600">
                      Distance on one side:&nbsp;
                      <span className="font-bold text-gray-900">{distanceKm} km</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-4 py-2 text-xs text-center text-gray-400">
                      2 trips per day &times; 5 days a week &times; 4 weeks
                    </div>

                    <p className="text-sm font-semibold text-gray-800 pt-1 px-1">
                      Here's how much you would spend on commute
                    </p>

                    {/* Bike Taxi */}
                    <motion.div
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.07 }}
                      className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl leading-none">🏍️</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Bike Taxi</p>
                          <p className="text-xs text-gray-400">₹{BIKE_TAXI_RATE}/km · Rapido / Ola Bike</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 font-mono">
                          {fmt(bikeTaxiMonthly)}<span className="text-xs font-normal text-gray-400">/mo</span>
                        </p>
                      </div>
                    </motion.div>

                    {/* BuddyRide */}
                    <motion.div
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.14 }}
                      className="flex items-center justify-between px-4 py-3 bg-primary rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl leading-none">🛵</span>
                        <div>
                          <p className="text-sm font-semibold text-text-dark">BuddyRide</p>
                          <p className="text-xs text-text-dark/60">₹{BUDDYRIDE_RATE}/km · Bike Carpooling</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-text-dark font-mono text-base">
                          {fmt(buddyMonthly)}<span className="text-xs font-normal opacity-60">/mo</span>
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  );
}
