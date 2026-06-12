import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Clock, Car, MapPin, Users, AlertCircle, RefreshCw, Star, Loader2, CheckCircle2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import ExpenseCalculator from '../components/ExpenseCalculator';
import { api } from '../lib/api';
import type { PlaceData } from '../components/base/GooglePlacesInput';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ride {
  id: string;
  host_id: string;
  host: {
    name: string;
    profile_photo: string | null;
    role: string;
  };
  vehicle: {
    vehicle_model: string;
    vehicle_color: string;
    vehicle_type: string;
  } | null;
  origin_address: string;
  destination_address: string;
  departure_time: string;
  price_per_km: number;
  total_price: number;
  available_seats: number;
  total_seats: number;
  status: string;
  distance_km: number;
}

interface RouteData {
  origin: PlaceData | null;
  destination: PlaceData | null;
  distanceKm: number;
  durationMinutes: number;
}

// ─── Spring config ────────────────────────────────────────────────────────────

const spring = { type: 'spring', stiffness: 300, damping: 25 } as const;

// ─── Helper: initials from name ───────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// ─── Helper: format departure time ───────────────────────────────────────────

function formatDeparture(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-white/[0.06]" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-white/[0.06] rounded w-1/3" />
          <div className="h-3 bg-white/[0.04] rounded w-1/4" />
        </div>
      </div>
      <div className="h-6 bg-white/[0.06] rounded w-1/2" />
      <div className="h-4 bg-white/[0.04] rounded w-2/5" />
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
        <div className="h-8 bg-white/[0.06] rounded w-1/4" />
        <div className="h-9 bg-white/[0.06] rounded-full w-36" />
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ type }: { type: 'no-route' | 'no-rides' }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={spring}
      className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-12 text-center flex flex-col items-center gap-4"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
      >
        <Car className="w-8 h-8 text-primary/60" />
      </motion.div>
      {type === 'no-route' ? (
        <>
          <p className="text-text-light font-syne font-semibold text-lg">Find Your Ride</p>
          <p className="text-muted text-sm max-w-xs leading-relaxed">
            Enter your origin and destination on the left to discover available rides on your route.
          </p>
        </>
      ) : (
        <>
          <p className="text-text-light font-syne font-semibold text-lg">No Rides Available</p>
          <p className="text-muted text-sm max-w-xs leading-relaxed">
            No rides are available on this route right now. Check back later or try a nearby route.
          </p>
        </>
      )}
    </motion.div>
  );
}

// ─── Error state ─────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="bg-white/[0.03] border border-red-500/20 rounded-2xl p-8 text-center flex flex-col items-center gap-4"
    >
      <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
        <AlertCircle className="w-7 h-7 text-red-400" />
      </div>
      <div>
        <p className="text-text-light font-semibold mb-1">Something went wrong</p>
        <p className="text-muted text-sm">{message}</p>
      </div>
      <motion.button
        onClick={onRetry}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        transition={spring}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-text-dark font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-shadow text-sm"
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </motion.button>
    </motion.div>
  );
}

// ─── Toast notification ───────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: 'error' | 'success' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={spring}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium ${
        type === 'error'
          ? 'bg-red-500/90 text-white border border-red-400/30'
          : 'bg-teal/90 text-text-light border border-teal/30'
      } backdrop-blur-xl`}
    >
      {type === 'error' ? (
        <AlertCircle className="w-4 h-4 shrink-0" />
      ) : (
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      )}
      {message}
    </motion.div>
  );
}

// ─── Ride card ────────────────────────────────────────────────────────────────

interface RideCardProps {
  ride: Ride;
  index: number;
  isRequested: boolean;
  isRequesting: boolean;
  onRequest: (ride: Ride) => void;
}

function RideCard({ ride, index, isRequested, isRequesting, onRequest }: RideCardProps) {
  const initials = getInitials(ride.host.name);

  return (
    <motion.div
      key={ride.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: index * 0.06 }}
      className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 hover:border-white/[0.14] hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
    >
      {/* Header: avatar + name + rating */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0 ring-2 ring-primary/10">
          {ride.host.profile_photo ? (
            <img
              src={ride.host.profile_photo}
              alt={ride.host.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="font-syne font-bold text-primary text-sm">{initials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-syne font-semibold text-text-light truncate">{ride.host.name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Star className="w-3.5 h-3.5 text-primary fill-primary" />
            <span className="text-xs text-muted">4.8</span>
          </div>
        </div>
        {ride.status === 'active' && (
          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-teal/20 text-teal border border-teal/20">
            Active
          </span>
        )}
      </div>

      {/* Vehicle badge */}
      {ride.vehicle && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal/15 text-teal border border-teal/20 text-xs font-medium">
            <Car className="w-3 h-3" />
            {ride.vehicle.vehicle_model} · {ride.vehicle.vehicle_color}
          </span>
          <span className="text-xs text-muted capitalize">{ride.vehicle.vehicle_type}</span>
        </div>
      )}

      {/* Route addresses */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-start gap-2 text-xs text-muted">
          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary/60" />
          <span className="line-clamp-1">{ride.origin_address}</span>
        </div>
        <div className="flex items-start gap-2 text-xs text-muted">
          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-teal/60" />
          <span className="line-clamp-1">{ride.destination_address}</span>
        </div>
      </div>

      {/* Meta row: time, seats, distance */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatDeparture(ride.departure_time)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          <span>
            {ride.available_seats} seat{ride.available_seats !== 1 ? 's' : ''} left
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          <span>{ride.distance_km?.toFixed(1)} km</span>
        </div>
      </div>

      {/* Price + CTA */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
        <div>
          <p className="text-xs text-muted mb-0.5">Total price</p>
          <p className="font-mono font-bold text-2xl text-primary leading-none">
            ₹{ride.total_price}
          </p>
          <p className="text-xs text-muted mt-0.5">₹{ride.price_per_km}/km</p>
        </div>

        <motion.button
          onClick={() => onRequest(ride)}
          disabled={isRequested || isRequesting || ride.available_seats === 0}
          whileHover={
            isRequested || isRequesting || ride.available_seats === 0
              ? {}
              : { scale: 1.04 }
          }
          whileTap={
            isRequested || isRequesting || ride.available_seats === 0
              ? {}
              : { scale: 0.96 }
          }
          transition={spring}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${
            isRequested
              ? 'bg-teal/20 text-text-light border border-teal/30 cursor-default'
              : ride.available_seats === 0
              ? 'bg-white/[0.05] text-muted cursor-not-allowed'
              : 'bg-primary text-text-dark hover:shadow-lg hover:shadow-primary/25'
          }`}
        >
          {isRequesting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Requesting…</span>
            </>
          ) : isRequested ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Requested</span>
            </>
          ) : ride.available_seats === 0 ? (
            <span>Full</span>
          ) : (
            <span>Request to Join</span>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FindRidePage() {
  const { user, isAuthenticated } = useApp();
  const navigate = useNavigate();

  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [requestingIds, setRequestingIds] = useState<Set<string>>(new Set());
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'error' | 'success') => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchRides = useCallback(async (data: RouteData) => {
    if (
      !data.origin?.lat ||
      !data.origin?.lng ||
      !data.destination?.lat ||
      !data.destination?.lng
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        origin_lat: String(data.origin.lat),
        origin_lng: String(data.origin.lng),
        destination_lat: String(data.destination.lat),
        destination_lng: String(data.destination.lng),
        page: '1',
        limit: '20',
      });

      const result = await api.get<Ride[] | { rides: Ride[] }>(`/rides/search?${params}`);
      const list = Array.isArray(result) ? result : (result as { rides: Ride[] }).rides ?? [];
      setRides(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load rides';
      setError(msg);
      setRides([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRouteChange = useCallback(
    (data: RouteData) => {
      setRouteData(data);
      if (data.distanceKm > 0) {
        fetchRides(data);
      } else {
        setRides([]);
        setError(null);
      }
    },
    [fetchRides],
  );

  const handleRetry = useCallback(() => {
    if (routeData) fetchRides(routeData);
  }, [routeData, fetchRides]);

  const handleRequestJoin = useCallback(
    async (ride: Ride) => {
      if (!isAuthenticated) {
        navigate('/auth/login');
        return;
      }

      if (requestedIds.has(ride.id) || requestingIds.has(ride.id)) return;

      setRequestingIds((prev) => new Set(prev).add(ride.id));

      try {
        await api.post(`/rides/${ride.id}/request`, {
          ride_id: ride.id,
          pickup_address: routeData?.origin?.address ?? undefined,
          pickup_lat: routeData?.origin?.lat ?? undefined,
          pickup_lng: routeData?.origin?.lng ?? undefined,
        });

        setRequestedIds((prev) => new Set(prev).add(ride.id));
        showToast('Ride request sent successfully!', 'success');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to send request';
        showToast(msg, 'error');
      } finally {
        setRequestingIds((prev) => {
          const next = new Set(prev);
          next.delete(ride.id);
          return next;
        });
      }
    },
    [isAuthenticated, navigate, requestedIds, requestingIds, routeData, showToast],
  );

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const hasRoute = routeData !== null && routeData.distanceKm > 0;

  return (
    <div className="min-h-screen bg-bg pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="mb-8"
        >
          <p className="text-muted text-sm">
            {greeting()}, {user?.name || 'there'}
          </p>
          <h1 className="font-syne font-bold text-3xl text-text-light mt-0.5">
            Find a Ride Today
          </h1>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* ── Left: Expense Calculator ── */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...spring, delay: 0.08 }}
          >
            <ExpenseCalculator
              mode="guest"
              showPlans={true}
              onRouteChange={handleRouteChange}
            />
          </motion.div>

          {/* ── Right: Rides panel ── */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...spring, delay: 0.16 }}
            className="space-y-5"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between">
              <h2 className="font-syne font-semibold text-xl text-text-light">
                Available Rides
              </h2>
              {hasRoute && !loading && rides.length > 0 && (
                <span className="text-xs text-muted bg-white/[0.05] border border-white/[0.08] px-3 py-1 rounded-full">
                  {rides.length} found
                </span>
              )}
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
              {/* Loading skeletons */}
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {[0, 1, 2].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </motion.div>
              )}

              {/* Error state */}
              {!loading && error && (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ErrorState message={error} onRetry={handleRetry} />
                </motion.div>
              )}

              {/* No route entered yet */}
              {!loading && !error && !hasRoute && (
                <motion.div key="no-route" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <EmptyState type="no-route" />
                </motion.div>
              )}

              {/* No rides found */}
              {!loading && !error && hasRoute && rides.length === 0 && (
                <motion.div key="no-rides" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <EmptyState type="no-rides" />
                </motion.div>
              )}

              {/* Rides list */}
              {!loading && !error && rides.length > 0 && (
                <motion.div
                  key="rides"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {rides.map((ride, index) => (
                    <RideCard
                      key={ride.id}
                      ride={ride}
                      index={index}
                      isRequested={requestedIds.has(ride.id)}
                      isRequesting={requestingIds.has(ride.id)}
                      onRequest={handleRequestJoin}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast key="toast" message={toast.message} type={toast.type} />}
      </AnimatePresence>
    </div>
  );
}
