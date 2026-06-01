import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Car, Users, Star, Leaf, Zap, ArrowRight,
  Clock, MapPin, CheckCircle, AlertCircle, Calendar, CreditCard,
  Search, PlusCircle, ChevronRight,
} from 'lucide-react';
import { useApp } from '../store/AppContext';

// ─── Mock Data ────────────────────────────────────────────────

const guestStats = [
  { label: 'Trips This Month', value: '12',      icon: Car,       color: 'primary' },
  { label: 'Total Saved',      value: '₹2,400',  icon: TrendingUp, color: 'green'  },
  { label: 'CO₂ Saved',        value: '18 kg',   icon: Leaf,       color: 'teal'   },
  { label: 'Day Streak',       value: '5 🔥',    icon: Zap,        color: 'primary' },
];

const hostStats = [
  { label: 'Total Earned',      value: '₹8,500', icon: TrendingUp, color: 'primary' },
  { label: 'Rides Offered',     value: '32',     icon: Car,        color: 'teal'    },
  { label: 'Passengers Served', value: '47',     icon: Users,      color: 'primary' },
  { label: 'Avg. Rating',       value: '4.8 ★',  icon: Star,       color: 'yellow'  },
];

const guestRecentTrips = [
  { id: '1', date: 'Today, 08:30 AM',   route: 'HSR Layout → Whitefield',       host: 'Rahul S.', rating: 4.8, fare: 72,  status: 'completed' },
  { id: '2', date: 'Yesterday, 09:00 AM', route: 'Koramangala → Marathahalli',   host: 'Priya P.', rating: 4.9, fare: 54,  status: 'completed' },
  { id: '3', date: 'Mon, 08:45 AM',     route: 'JP Nagar → Electronic City',    host: 'Vikram S.', rating: 4.7, fare: 90,  status: 'completed' },
  { id: '4', date: 'Tomorrow, 08:30 AM', route: 'HSR Layout → Whitefield',      host: 'Rahul S.', rating: 4.8, fare: 72,  status: 'upcoming'  },
];

const hostRecentRides = [
  { id: '1', date: 'Today, 08:30 AM',     route: 'Koramangala → Whitefield',     passengers: 1, earning: 108, status: 'active'    },
  { id: '2', date: 'Yesterday, 09:00 AM', route: 'HSR Layout → Marathahalli',    passengers: 1, earning: 90,  status: 'completed' },
  { id: '3', date: 'Mon, 08:45 AM',       route: 'JP Nagar → Indiranagar',       passengers: 1, earning: 126, status: 'completed' },
  { id: '4', date: 'Tomorrow, 08:30 AM',  route: 'Koramangala → Electronic City', passengers: 0, earning: 0,  status: 'upcoming'  },
];

const pendingRequests = [
  { id: '1', name: 'Arjun Mehta',  from: 'HSR Layout',  to: 'Whitefield',     overlap: 92, rating: 4.7 },
  { id: '2', name: 'Sneha Kumar',  from: 'Koramangala', to: 'Marathahalli',   overlap: 78, rating: 4.9 },
];

const weeklyEarnings = [
  { day: 'Mon', amount: 850 },
  { day: 'Tue', amount: 620 },
  { day: 'Wed', amount: 740 },
  { day: 'Thu', amount: 910 },
  { day: 'Fri', amount: 680 },
  { day: 'Sat', amount: 450 },
  { day: 'Sun', amount: 250 },
];

const weeklySavings = [
  { day: 'Mon', saved: 210 },
  { day: 'Tue', saved: 180 },
  { day: 'Wed', saved: 390 },
  { day: 'Thu', saved: 0   },
  { day: 'Fri', saved: 360 },
  { day: 'Sat', saved: 180 },
  { day: 'Sun', saved: 0   },
];

// ─── Helpers ──────────────────────────────────────────────────

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    completed: 'bg-green-500/15 text-green-500',
    upcoming:  'bg-primary/15 text-primary',
    active:    'bg-teal/20 text-teal',
  };
  return map[status] || 'bg-muted/20 text-muted';
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

// ─── Sub-components ───────────────────────────────────────────

function StatCard({ stat, index }: { stat: typeof guestStats[0]; index: number }) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    teal:    'bg-teal/10 text-teal',
    green:   'bg-green-500/10 text-green-500',
    yellow:  'bg-yellow-400/10 text-yellow-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.07, duration: 0.4 }}
      className="card flex flex-col items-center text-center gap-3 hover:shadow-xl hover:shadow-primary/5 transition-shadow"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorMap[stat.color]}`}>
        <stat.icon className="w-5 h-5" />
      </div>
      <div>
        <p className="font-syne font-bold text-2xl text-gray-900">{stat.value}</p>
        <p className="text-muted text-xs mt-0.5">{stat.label}</p>
      </div>
    </motion.div>
  );
}

const BAR_MAX_PX = 90;

function BarChart({ data, color = '#FF7D00' }: { data: { day: string; amount: number }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.amount), 1);

  return (
    <div className="space-y-2">
      {/* Fixed-height bar area so pixel heights resolve correctly */}
      <div className="flex items-end gap-1.5" style={{ height: BAR_MAX_PX }}>
        {data.map((d, i) => (
          <motion.div
            key={d.day}
            initial={{ height: 0 }}
            animate={{ height: d.amount > 0 ? Math.round((d.amount / max) * BAR_MAX_PX) : 3 }}
            transition={{ delay: 0.05 * i, duration: 0.55, ease: 'easeOut' }}
            className="flex-1 rounded-t-lg hover:opacity-75 transition-opacity cursor-default"
            style={{ background: d.amount > 0 ? color : 'rgba(0,0,0,0.08)' }}
          />
        ))}
      </div>
      {/* Day labels row */}
      <div className="flex gap-1.5">
        {data.map(d => (
          <div key={d.day} className="flex-1 text-center">
            <span className="text-[10px] text-muted">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Guest Dashboard ──────────────────────────────────────────

function GuestDashboard(_: { user: { name: string } | null }) {
  return (
    <motion.div
      key="guest"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.28 }}
      className="space-y-6"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {guestStats.map((s, i) => <StatCard key={s.label} stat={s} index={i} />)}
      </div>

      {/* Upcoming Ride Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card bg-gradient-to-r from-teal to-teal/70 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary/20 text-primary px-3 py-1 rounded-full mb-2">
              <Clock className="w-3 h-3" /> Upcoming · Tomorrow 08:30 AM
            </span>
            <h3 className="font-syne font-semibold text-xl text-text-light">HSR Layout → Whitefield</h3>
            <p className="text-text-light/60 text-sm mt-0.5">with Rahul S. · ★ 4.8 · 🛵 BuddyRide</p>
          </div>
          <Link to="/guest/find" className="btn-primary flex items-center gap-2 shrink-0 text-sm">
            <Search className="w-4 h-4" /> Find More Rides
          </Link>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Trips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card lg:col-span-2 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-syne font-semibold text-lg text-text-dark">Recent Trips</h3>
            <button className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {guestRecentTrips.map((trip, i) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                className="flex items-center gap-4 py-3 border-b border-teal/10 last:border-0"
              >
                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-base">🛵</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-dark truncate">{trip.route}</p>
                  <p className="text-xs text-muted">{trip.date} · {trip.host}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-sm font-semibold text-primary">₹{trip.fare}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusBadge(trip.status)}`}>
                    {trip.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Weekly Savings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card space-y-4"
        >
          <div>
            <h3 className="font-syne font-semibold text-lg text-text-dark">Weekly Savings</h3>
            <p className="text-xs text-muted mt-0.5">vs Bike Taxi this week</p>
          </div>
          <BarChart data={weeklySavings.map(d => ({ day: d.day, amount: d.saved }))} color="#22c55e" />
          <div className="pt-3 border-t border-teal/10 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted">This Week</p>
              <p className="font-syne font-bold text-lg text-green-500">₹1,320</p>
            </div>
            <div>
              <p className="text-xs text-muted">This Month</p>
              <p className="font-syne font-bold text-lg text-green-500">₹2,400</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="grid sm:grid-cols-2 gap-4"
      >
        <Link to="/guest/find" className="card group hover:shadow-xl hover:shadow-primary/10 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Search className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-syne font-semibold text-text-dark">Find a Ride</h4>
              <p className="text-muted text-xs">Search available bikes on your route</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
        <Link to="/guest/subscribe" className="card group hover:shadow-xl hover:shadow-primary/10 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal/10 rounded-xl flex items-center justify-center group-hover:bg-teal/20 transition-colors">
              <CreditCard className="w-6 h-6 text-teal" />
            </div>
            <div className="flex-1">
              <h4 className="font-syne font-semibold text-text-dark">Subscribe & Save</h4>
              <p className="text-muted text-xs">Monthly plans for daily commuters</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}

// ─── Host Dashboard ───────────────────────────────────────────

function HostDashboard(_: { user: { name: string } | null }) {
  const weekTotal = weeklyEarnings.reduce((s, d) => s + d.amount, 0);

  return (
    <motion.div
      key="host"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.28 }}
      className="space-y-6"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {hostStats.map((s, i) => <StatCard key={s.label} stat={s} index={i} />)}
      </div>

      {/* Active Posting Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card bg-gradient-to-r from-teal to-teal/70 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-green-500/20 text-green-400 px-3 py-1 rounded-full mb-2">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> LIVE · Active Posting
            </span>
            <h3 className="font-syne font-semibold text-xl text-text-light">Koramangala → Whitefield</h3>
            <p className="text-text-light/60 text-sm mt-0.5">Today 08:30 AM · 1 passenger confirmed · ₹108 earned</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <span className="px-4 py-2 bg-primary/20 text-primary rounded-full text-sm font-semibold">
              2 Requests
            </span>
            <Link to="/host/offer" className="btn-primary text-sm flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4" /> Post New
            </Link>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Earnings Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card lg:col-span-2 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-syne font-semibold text-lg text-text-dark">Weekly Earnings</h3>
            <div className="text-right">
              <p className="text-xs text-muted">This week</p>
              <p className="font-syne font-bold text-primary">₹{weekTotal.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <BarChart data={weeklyEarnings} />
          <div className="pt-3 border-t border-teal/10 flex items-center gap-2 text-xs text-muted">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-green-500 font-semibold">+18%</span> vs last week ·
            <span>Best day: <span className="text-primary font-semibold">Thu ₹910</span></span>
          </div>
        </motion.div>

        {/* Pending Requests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-syne font-semibold text-lg text-text-dark">Pending Requests</h3>
            <span className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-xs text-text-dark font-bold">
              {pendingRequests.length}
            </span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted text-sm">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No pending requests
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req, i) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.07 }}
                  className="p-3 bg-gray-100 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                        {req.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-dark">{req.name}</p>
                        <p className="text-xs text-muted">★ {req.rating}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-primary">{req.overlap}% match</span>
                  </div>
                  <p className="text-xs text-muted">{req.from} → {req.to}</p>
                  <div className="flex gap-2">
                    <button className="flex-1 py-1.5 bg-primary rounded-lg text-text-dark text-xs font-semibold flex items-center justify-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Accept
                    </button>
                    <button className="flex-1 py-1.5 border border-muted/40 rounded-lg text-muted text-xs font-medium">
                      Decline
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Rides */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="card space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-syne font-semibold text-lg text-text-dark">Recent Rides</h3>
          <button className="text-xs text-primary hover:underline flex items-center gap-0.5">
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Table header */}
        <div className="hidden md:grid grid-cols-5 text-xs font-medium text-muted pb-2 border-b border-teal/10">
          <span>Date</span>
          <span className="col-span-2">Route</span>
          <span>Passenger</span>
          <span>Earning</span>
        </div>

        <div className="space-y-0 divide-y divide-teal/10">
          {hostRecentRides.map((ride, i) => (
            <motion.div
              key={ride.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.06 }}
              className="grid md:grid-cols-5 gap-2 py-3 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  ride.status === 'completed' ? 'bg-green-500' :
                  ride.status === 'active'    ? 'bg-primary animate-pulse' :
                  'bg-muted/50'
                }`} />
                <span className="text-text-dark">{ride.date}</span>
              </div>
              <span className="md:col-span-2 text-text-dark">{ride.route}</span>
              <span className="text-muted flex items-center gap-1">
                <Users className="w-3 h-3" /> {ride.passengers}
              </span>
              <span className={`font-mono font-semibold ${ride.earning > 0 ? 'text-primary' : 'text-muted'}`}>
                {ride.earning > 0 ? `₹${ride.earning}` : '—'}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid sm:grid-cols-2 gap-4"
      >
        <Link to="/host/offer" className="card group hover:shadow-xl hover:shadow-primary/10 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <PlusCircle className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-syne font-semibold text-text-dark">Post a Ride</h4>
              <p className="text-muted text-xs">Earn on your daily commute</p>
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
              <h4 className="font-syne font-semibold text-text-dark">Schedule</h4>
              <p className="text-muted text-xs">3 upcoming rides this week</p>
            </div>
            <span className="w-6 h-6 bg-primary rounded-full text-text-dark text-xs font-bold flex items-center justify-center">3</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────

export default function DashboardPage() {
  const { user, mode, setMode } = useApp();

  return (
    <div className="dashboard-light min-h-screen pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4">

        {/* ── Page Header ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <p className="text-muted text-sm">{greeting()}, {user?.name || 'there'} 👋</p>
            <h1 className="font-syne font-bold text-3xl md:text-4xl text-gray-900 mt-0.5">
              Dashboard
            </h1>
          </div>

          {/* ── Guest / Host Toggle ──────────────────────── */}
          <div className="flex items-center gap-3">
            <span className="text-muted text-sm hidden sm:block">View as</span>
            <div className="relative flex items-center bg-teal/20 rounded-full p-1 gap-0.5">
              {/* Sliding pill */}
              <motion.div
                className="absolute top-1 bottom-1 rounded-full bg-primary shadow-lg shadow-primary/30"
                initial={false}
                animate={{
                  left:  mode === 'guest' ? 4 : '50%',
                  right: mode === 'host'  ? 4 : '50%',
                }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />

              <button
                onClick={() => setMode('guest')}
                className={`relative z-10 flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                  mode === 'guest' ? 'text-text-dark' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <MapPin className="w-4 h-4" /> Guest
              </button>

              <button
                onClick={() => setMode('host')}
                className={`relative z-10 flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                  mode === 'host' ? 'text-text-dark' : 'text-gray-500 hover:text-gray-800'
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
          className={`flex items-center gap-2 text-xs font-medium px-4 py-2.5 rounded-xl mb-6 w-fit ${
            mode === 'guest'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'bg-teal/15 text-teal border border-teal/20'
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
          {mode === 'guest'
            ? <GuestDashboard key="guest" user={user} />
            : <HostDashboard  key="host"  user={user} />
          }
        </AnimatePresence>
      </div>
    </div>
  );
}
