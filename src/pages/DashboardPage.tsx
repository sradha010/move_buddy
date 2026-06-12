import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Car, Users, Star, MapPin, ArrowRight,
  Clock, CheckCircle, AlertCircle, CreditCard,
  Search, PlusCircle, ChevronRight, Bell, Loader2,
  Navigation, Bike, Calendar,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────

interface RideRequest {
  id: string;
  ride_id: string;
  status: string;
  fare: number;
  created_at: string;
  ride: {
    origin_address: string;
    destination_address: string;
    departure_time: string;
    host: { name: string; profile_photo: string | null };
  };
}

interface Ride {
  id: string;
  origin_address: string;
  destination_address: string;
  departure_time: string;
  status: string;
  available_seats: number;
  total_seats: number;
  price_per_km: number;
  total_price: number;
  requests: { id: string; status: string; guest: { name: string } }[];
}

interface GuestData {
  requests: RideRequest[];
  subscription: { plan_name: string; status: string } | null;
  unreadCount: number;
}

interface HostData {
  rides: Ride[];
  totalEarnings: number;
  totalPassengers: number;
}

// ─── Spring Config ────────────────────────────────────────────

const spring = { type: 'spring', stiffness: 300, damping: 25 } as const;

// ─── Helpers ──────────────────────────────────────────────────

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (target.getTime() - today.getTime()) / 86400000;
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (diff === 0) return `Today, ${time}`;
  if (diff === 1) return `Tomorrow, ${time}`;
  if (diff === -1) return `Yesterday, ${time}`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + `, ${time}`;
};

const shortRoute = (origin: string, dest: string) => {
  const trim = (s: string) => s.split(',')[0].trim();
  return `${trim(origin)} → ${trim(dest)}`;
};

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    pending: 'bg-orange-100 text-orange-600',
    accepted: 'bg-green-100 text-green-600',
    rejected: 'bg-red-100 text-red-600',
    completed: 'bg-teal/15 text-teal',
    open: 'bg-blue-100 text-blue-600',
    active: 'bg-emerald-100 text-emerald-600',
    cancelled: 'bg-gray-100 text-gray-500',
  };
  return map[status] ?? 'bg-gray-100 text-gray-500';
};

// ─── Skeleton ─────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card flex flex-col items-center gap-3">
          <Skeleton className="w-11 h-11 rounded-xl" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  colorClass: string;
  index: number;
}

function StatCard({ label, value, icon: Icon, colorClass, index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.05 + index * 0.07 }}
      className="card flex flex-col items-center text-center gap-3 hover:shadow-xl hover:shadow-primary/5 transition-shadow"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="font-syne font-bold text-2xl text-gray-900 leading-tight">{value}</p>
        <p className="text-muted text-xs mt-0.5">{label}</p>
      </div>
    </motion.div>
  );
}

// ─── Error Banner ─────────────────────────────────────────────

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-2xl text-sm"
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{message}</span>
      </div>
      <button
        onClick={onRetry}
        className="text-xs font-semibold underline hover:no-underline whitespace-nowrap"
      >
        Try again
      </button>
    </motion.div>
  );
}

// ─── Guest Dashboard ──────────────────────────────────────────

function GuestDashboard({ data, loading, error, onRetry }: {
  data: GuestData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <motion.div
        key="guest-loading"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={spring}
        className="space-y-6"
      >
        <StatsSkeleton />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card lg:col-span-2 space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
          <div className="card space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Computed stats ──────────────────────────────────────────
  const requests = data?.requests ?? [];
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const tripsThisMonth = requests.filter(r =>
    new Date(r.created_at) >= thisMonthStart
  ).length;

  const totalSaved = requests
    .filter(r => r.status === 'accepted' || r.status === 'completed')
    .reduce((sum, r) => sum + (r.fare * 0.4), 0);

  const subscriptionLabel = data?.subscription
    ? data.subscription.plan_name
    : 'No Plan';

  const unreadCount = data?.unreadCount ?? 0;

  // ── Upcoming ride ───────────────────────────────────────────
  const upcoming = requests.find(r =>
    (r.status === 'accepted' || r.status === 'pending') &&
    new Date(r.ride?.departure_time) > now
  );

  return (
    <motion.div
      key="guest"
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={spring}
      className="space-y-6"
    >
      {error && <ErrorBanner message={error} onRetry={onRetry} />}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Trips This Month"
          value={String(tripsThisMonth)}
          icon={Bike}
          colorClass="bg-primary/10 text-primary"
          index={0}
        />
        <StatCard
          label="Total Saved"
          value={`₹${Math.round(totalSaved).toLocaleString('en-IN')}`}
          icon={TrendingUp}
          colorClass="bg-green-100 text-green-600"
          index={1}
        />
        <StatCard
          label="Subscription"
          value={subscriptionLabel}
          icon={CreditCard}
          colorClass="bg-teal/10 text-teal"
          index={2}
        />
        <StatCard
          label="Notifications"
          value={String(unreadCount)}
          icon={Bell}
          colorClass="bg-orange-100 text-orange-500"
          index={3}
        />
      </div>

      {/* Upcoming / Active Ride Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.2 }}
        className="card bg-gradient-to-r from-teal to-teal/70 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />

        {upcoming ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary/25 text-primary px-3 py-1 rounded-full mb-3">
                <Clock className="w-3 h-3" />
                {upcoming.status === 'accepted' ? 'Confirmed' : 'Pending'} · {fmtDate(upcoming.ride.departure_time)}
              </span>
              <h3 className="font-syne font-semibold text-xl text-text-light leading-snug">
                {shortRoute(upcoming.ride.origin_address, upcoming.ride.destination_address)}
              </h3>
              <p className="text-text-light/70 text-sm mt-1">
                with {upcoming.ride.host.name} · ₹{upcoming.fare}
              </p>
            </div>
            <Link
              to="/guest/find"
              className="btn-primary shrink-0 text-sm flex items-center gap-2"
            >
              <Search className="w-4 h-4" /> Find More Rides
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/10 text-text-light px-3 py-1 rounded-full mb-3">
                <Navigation className="w-3 h-3" /> No Upcoming Rides
              </span>
              <h3 className="font-syne font-semibold text-xl text-text-light">Ready for your next commute?</h3>
              <p className="text-text-light/60 text-sm mt-1">Find affordable rides on your route</p>
            </div>
            <Link
              to="/guest/find"
              className="btn-primary shrink-0 text-sm flex items-center gap-2"
            >
              <Search className="w-4 h-4" /> Find a Ride
            </Link>
          </div>
        )}
      </motion.div>

      {/* Recent Trips + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Trips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.25 }}
          className="card lg:col-span-2 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-syne font-semibold text-lg text-gray-900">Recent Trips</h3>
            <Link
              to="/guest/find"
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              Find Rides <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Bike className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm font-medium">No trips yet</p>
              <p className="text-muted text-xs">Book your first ride to see it here</p>
              <Link to="/guest/find" className="btn-primary text-sm mt-1">
                Find a Ride
              </Link>
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-gray-100">
              {requests.slice(0, 8).map((req, i) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring, delay: 0.3 + i * 0.055 }}
                  className="flex items-center gap-4 py-3.5"
                >
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {shortRoute(req.ride.origin_address, req.ride.destination_address)}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {fmtDate(req.ride.departure_time)} · {req.ride.host.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-sm font-semibold text-primary">₹{req.fare}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${statusBadge(req.status)}`}>
                      {req.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Sidebar: subscription info + quick links */}
        <div className="space-y-4">
          {/* Subscription Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.3 }}
            className="card space-y-4"
          >
            <h3 className="font-syne font-semibold text-base text-gray-900">Subscription</h3>
            {data?.subscription ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal/10 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-teal" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{data.subscription.plan_name}</p>
                    <p className="text-xs text-green-600 font-medium capitalize">{data.subscription.status}</p>
                  </div>
                </div>
                <Link
                  to="/guest/subscribe"
                  className="flex items-center justify-between text-xs text-primary hover:underline"
                >
                  Manage plan <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted">Save up to 40% with a monthly plan</p>
                <Link
                  to="/guest/subscribe"
                  className="w-full flex items-center justify-center gap-2 bg-teal text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-teal/90 transition-colors"
                >
                  <CreditCard className="w-4 h-4" /> Subscribe Now
                </Link>
              </div>
            )}
          </motion.div>

          {/* Notifications Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.35 }}
            className="card flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
              <p className="text-xs text-muted">
                {unreadCount > 0 ? 'You have new notifications' : 'No new notifications'}
              </p>
            </div>
            {unreadCount > 0 && (
              <span className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs text-white font-bold shrink-0">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </motion.div>
        </div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.4 }}
        className="grid sm:grid-cols-2 gap-4"
      >
        <Link to="/guest/find" className="card group hover:shadow-xl hover:shadow-primary/10 transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Search className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-syne font-semibold text-gray-900">Find a Ride</h4>
              <p className="text-muted text-xs mt-0.5">Search available bikes on your route</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
        <Link to="/guest/subscribe" className="card group hover:shadow-xl hover:shadow-teal/10 transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal/10 rounded-xl flex items-center justify-center group-hover:bg-teal/20 transition-colors">
              <CreditCard className="w-6 h-6 text-teal" />
            </div>
            <div className="flex-1">
              <h4 className="font-syne font-semibold text-gray-900">Subscribe &amp; Save</h4>
              <p className="text-muted text-xs mt-0.5">Monthly plans for daily commuters</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}

// ─── Host Dashboard ───────────────────────────────────────────

function HostDashboard({ data, loading, error, onRetry, onReload }: {
  data: HostData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onReload: () => void;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleRequest = useCallback(async (
    rideId: string,
    reqId: string,
    action: 'accept' | 'reject',
  ) => {
    const key = `${reqId}-${action}`;
    setActionLoading(key);
    setActionError(null);
    try {
      await api.patch(`/rides/${rideId}/requests/${reqId}/${action}`);
      onReload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  }, [onReload]);

  if (loading) {
    return (
      <motion.div
        key="host-loading"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={spring}
        className="space-y-6"
      >
        <StatsSkeleton />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card lg:col-span-2 space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
          <div className="card space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        </div>
      </motion.div>
    );
  }

  const rides = data?.rides ?? [];
  const totalEarnings = data?.totalEarnings ?? 0;
  const totalPassengers = data?.totalPassengers ?? 0;

  // First open/active ride
  const activeRide = rides.find(r => r.status === 'open' || r.status === 'active');

  // All pending requests across all rides
  const allPending = rides.flatMap(ride =>
    (ride.requests ?? [])
      .filter(req => req.status === 'pending')
      .map(req => ({ ...req, rideId: ride.id, ride }))
  );

  return (
    <motion.div
      key="host"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={spring}
      className="space-y-6"
    >
      {error && <ErrorBanner message={error} onRetry={onRetry} />}
      {actionError && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-xl">
          {actionError}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Earnings"
          value={`₹${totalEarnings.toLocaleString('en-IN')}`}
          icon={TrendingUp}
          colorClass="bg-primary/10 text-primary"
          index={0}
        />
        <StatCard
          label="Rides Offered"
          value={String(rides.length)}
          icon={Car}
          colorClass="bg-teal/10 text-teal"
          index={1}
        />
        <StatCard
          label="Passengers"
          value={String(totalPassengers)}
          icon={Users}
          colorClass="bg-primary/10 text-primary"
          index={2}
        />
        <StatCard
          label="Avg. Rating"
          value="4.8 ★"
          icon={Star}
          colorClass="bg-yellow-100 text-yellow-500"
          index={3}
        />
      </div>

      {/* Active Ride Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.2 }}
        className="card bg-gradient-to-r from-teal to-teal/70 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />

        {activeRide ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-green-500/20 text-green-300 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  {activeRide.status === 'active' ? 'LIVE · Active' : 'OPEN · Accepting Riders'}
                </span>
                {allPending.filter(r => r.rideId === activeRide.id).length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary/25 text-primary px-2.5 py-1 rounded-full">
                    {allPending.filter(r => r.rideId === activeRide.id).length} pending
                  </span>
                )}
              </div>
              <h3 className="font-syne font-semibold text-xl text-text-light leading-snug">
                {shortRoute(activeRide.origin_address, activeRide.destination_address)}
              </h3>
              <p className="text-text-light/70 text-sm mt-1">
                {fmtDate(activeRide.departure_time)} · {activeRide.available_seats} / {activeRide.total_seats} seats free
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link to="/host/offer" className="btn-primary text-sm flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4" /> Post New
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/10 text-text-light px-3 py-1 rounded-full mb-3">
                <Car className="w-3 h-3" /> No Active Ride
              </span>
              <h3 className="font-syne font-semibold text-xl text-text-light">Start earning today</h3>
              <p className="text-text-light/60 text-sm mt-1">Post a ride and connect with commuters on your route</p>
            </div>
            <Link to="/host/offer" className="btn-primary shrink-0 text-sm flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> Post a Ride
            </Link>
          </div>
        )}
      </motion.div>

      {/* Rides List + Pending Requests */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Rides */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.25 }}
          className="card lg:col-span-2 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-syne font-semibold text-lg text-gray-900">Recent Rides</h3>
            <Link
              to="/host/offer"
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              Post Ride <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {rides.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Car className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm font-medium">No rides posted yet</p>
              <p className="text-muted text-xs">Start earning by posting your first ride</p>
              <Link to="/host/offer" className="btn-primary text-sm mt-1">
                Post a Ride
              </Link>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 text-xs font-medium text-muted pb-2 border-b border-gray-100 gap-2">
                <span className="col-span-4">Route</span>
                <span className="col-span-3">Date</span>
                <span className="col-span-2 text-center">Seats</span>
                <span className="col-span-2 text-right">Price</span>
                <span className="col-span-1 text-right">Status</span>
              </div>

              <div className="space-y-0 divide-y divide-gray-100">
                {rides.slice(0, 8).map((ride, i) => {
                  const acceptedCount = (ride.requests ?? []).filter(r => r.status === 'accepted').length;
                  const earnings = ride.status === 'completed'
                    ? acceptedCount * (ride.total_price ?? 0)
                    : 0;

                  return (
                    <motion.div
                      key={ride.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...spring, delay: 0.3 + i * 0.055 }}
                      className="grid md:grid-cols-12 gap-2 py-3.5 text-sm items-center"
                    >
                      <div className="md:col-span-4 flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          ride.status === 'completed' ? 'bg-green-500' :
                          ride.status === 'active' ? 'bg-primary animate-pulse' :
                          ride.status === 'open' ? 'bg-blue-400' :
                          'bg-gray-300'
                        }`} />
                        <span className="text-gray-900 truncate font-medium">
                          {shortRoute(ride.origin_address, ride.destination_address)}
                        </span>
                      </div>
                      <span className="md:col-span-3 text-muted text-xs">
                        {fmtDate(ride.departure_time)}
                      </span>
                      <span className="md:col-span-2 text-center text-muted text-xs">
                        {ride.available_seats}/{ride.total_seats}
                      </span>
                      <span className={`md:col-span-2 text-right font-mono font-semibold text-sm ${earnings > 0 ? 'text-primary' : 'text-muted'}`}>
                        {earnings > 0 ? `₹${earnings.toLocaleString('en-IN')}` : `₹${(ride.total_price ?? 0).toLocaleString('en-IN')}`}
                      </span>
                      <div className="md:col-span-1 flex justify-end">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusBadge(ride.status)}`}>
                          {ride.status}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>

        {/* Pending Requests Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.3 }}
          className="card space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-syne font-semibold text-base text-gray-900">Pending Requests</h3>
            {allPending.length > 0 && (
              <span className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs text-white font-bold">
                {allPending.length}
              </span>
            )}
          </div>

          {allPending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">No pending requests</p>
              <p className="text-muted text-xs">New requests will appear here</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {allPending.map((req, i) => {
                const acceptKey = `${req.id}-accept`;
                const rejectKey = `${req.id}-reject`;
                return (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...spring, delay: 0.35 + i * 0.07 }}
                    className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                        {req.guest.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{req.guest.name}</p>
                        <p className="text-xs text-muted truncate">
                          {shortRoute(req.ride.origin_address, req.ride.destination_address)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRequest(req.rideId, req.id, 'accept')}
                        disabled={actionLoading === acceptKey || actionLoading === rejectKey}
                        className="flex-1 py-1.5 bg-primary rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1 hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {actionLoading === acceptKey
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <><CheckCircle className="w-3 h-3" /> Accept</>
                        }
                      </button>
                      <button
                        onClick={() => handleRequest(req.rideId, req.id, 'reject')}
                        disabled={actionLoading === acceptKey || actionLoading === rejectKey}
                        className="flex-1 py-1.5 border border-gray-300 rounded-lg text-gray-600 text-xs font-medium hover:bg-gray-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {actionLoading === rejectKey
                          ? <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                          : 'Decline'
                        }
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.4 }}
        className="grid sm:grid-cols-2 gap-4"
      >
        <Link to="/host/offer" className="card group hover:shadow-xl hover:shadow-primary/10 transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <PlusCircle className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-syne font-semibold text-gray-900">Post a Ride</h4>
              <p className="text-muted text-xs mt-0.5">Earn on your daily commute</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal/10 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-teal" />
            </div>
            <div className="flex-1">
              <h4 className="font-syne font-semibold text-gray-900">My Rides</h4>
              <p className="text-muted text-xs mt-0.5">
                {rides.length > 0 ? `${rides.length} ride${rides.length !== 1 ? 's' : ''} total` : 'No rides posted yet'}
              </p>
            </div>
            {rides.length > 0 && (
              <span className="w-6 h-6 bg-teal rounded-full text-white text-xs font-bold flex items-center justify-center">
                {rides.length}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────

export default function DashboardPage() {
  const { user, mode, setMode } = useApp();

  const [guestData, setGuestData] = useState<GuestData | null>(null);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);

  const [hostData, setHostData] = useState<HostData | null>(null);
  const [hostLoading, setHostLoading] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);

  // ── Load guest data ────────────────────────────────────────
  const loadGuestData = useCallback(async () => {
    setGuestLoading(true);
    setGuestError(null);
    try {
      const [requests, subscription, unreadData] = await Promise.all([
        api.get<RideRequest[]>('/rides/requests/my').catch(() => [] as RideRequest[]),
        api.get<{ plan_name: string; status: string } | null>('/subscriptions/my').catch(() => null),
        api.get<{ count: number }>('/notifications/unread-count').catch(() => ({ count: 0 })),
      ]);
      setGuestData({
        requests: Array.isArray(requests) ? requests : [],
        subscription,
        unreadCount: unreadData?.count ?? 0,
      });
    } catch (err) {
      setGuestError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setGuestLoading(false);
    }
  }, []);

  // ── Load host data ─────────────────────────────────────────
  const loadHostData = useCallback(async () => {
    setHostLoading(true);
    setHostError(null);
    try {
      const rides = await api.get<Ride[]>('/rides/my').catch(() => [] as Ride[]);
      const ridesArr: Ride[] = Array.isArray(rides) ? rides : [];

      const totalEarnings = ridesArr
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => {
          const accepted = (r.requests ?? []).filter(req => req.status === 'accepted').length;
          return sum + accepted * (r.total_price ?? 0);
        }, 0);

      const totalPassengers = ridesArr.reduce((sum, r) => {
        const accepted = (r.requests ?? []).filter(req => req.status === 'accepted').length;
        return sum + accepted;
      }, 0);

      setHostData({ rides: ridesArr, totalEarnings, totalPassengers });
    } catch (err) {
      setHostError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setHostLoading(false);
    }
  }, []);

  // ── Effect: load on mode change ────────────────────────────
  useEffect(() => {
    if (mode === 'guest') {
      loadGuestData();
    } else {
      loadHostData();
    }
  }, [mode, loadGuestData, loadHostData]);

  return (
    <div className="dashboard-light min-h-screen pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4">

        {/* ── Page Header ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <p className="text-muted text-sm">{greeting()}, {user?.name ?? 'there'}</p>
            <h1 className="font-syne font-bold text-3xl md:text-4xl text-gray-900 mt-0.5">
              Dashboard
            </h1>
          </div>

          {/* ── Guest / Host Toggle ──────────────────────── */}
          <div className="flex items-center gap-3">
            <span className="text-muted text-sm hidden sm:block">View as</span>
            <div className="relative flex items-center bg-gray-100 rounded-full p-1">
              {/* Sliding pill */}
              <motion.div
                layoutId="mode-pill"
                className="absolute top-1 bottom-1 rounded-full bg-primary shadow-lg shadow-primary/30"
                initial={false}
                animate={{
                  left: mode === 'guest' ? 4 : '50%',
                  right: mode === 'host' ? 4 : '50%',
                }}
                transition={spring}
              />

              <button
                onClick={() => setMode('guest')}
                className={`relative z-10 flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-colors duration-200 min-w-[88px] justify-center ${
                  mode === 'guest' ? 'text-white' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <MapPin className="w-4 h-4" /> Guest
              </button>

              <button
                onClick={() => setMode('host')}
                className={`relative z-10 flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-colors duration-200 min-w-[88px] justify-center ${
                  mode === 'host' ? 'text-white' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Car className="w-4 h-4" /> Host
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Mode indicator strip ─────────────────────── */}
        <motion.div
          layout
          transition={spring}
          className={`inline-flex items-center gap-2 text-xs font-medium px-4 py-2.5 rounded-xl mb-6 ${
            mode === 'guest'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'bg-teal/10 text-teal border border-teal/20'
          }`}
        >
          {mode === 'guest' ? (
            <><MapPin className="w-3.5 h-3.5" /> Viewing as Guest — Find &amp; track your rides</>
          ) : (
            <><Car className="w-3.5 h-3.5" /> Viewing as Host — Manage your offerings &amp; earnings</>
          )}
        </motion.div>

        {/* ── Dashboard Content ────────────────────────── */}
        <AnimatePresence mode="wait">
          {mode === 'guest' ? (
            <GuestDashboard
              key="guest"
              data={guestData}
              loading={guestLoading}
              error={guestError}
              onRetry={loadGuestData}
            />
          ) : (
            <HostDashboard
              key="host"
              data={hostData}
              loading={hostLoading}
              error={hostError}
              onRetry={loadHostData}
              onReload={loadHostData}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
