import { motion } from 'framer-motion';
import { Car, TrendingUp, Clock, Users, Calendar } from 'lucide-react';
import { useApp } from '../store/AppContext';

interface Ride {
  id: string;
  date: string;
  route: string;
  passengers: number;
  earnings: number;
  status: 'completed' | 'upcoming' | 'active';
}

const stats = [
  { label: 'Active Rides', value: '2', icon: Car, color: 'primary' },
  { label: 'Total Earnings', value: 'Rs 4,250', icon: TrendingUp, color: 'primary' },
  { label: 'Past Rides', value: '24', icon: Clock, color: 'teal' },
  { label: 'Upcoming', value: '3', icon: Calendar, color: 'teal' },
];

const recentRides: Ride[] = [
  { id: '1', date: 'Today, 08:30 AM', route: 'Koramangala → Whitefield', passengers: 3, earnings: 540, status: 'completed' },
  { id: '2', date: 'Tomorrow, 09:00 AM', route: 'HSR Layout → Marathahalli', passengers: 2, earnings: 300, status: 'upcoming' },
  { id: '3', date: 'Wed, 08:45 AM', route: 'JP Nagar → Indiranagar', passengers: 4, earnings: 760, status: 'upcoming' },
];

const weeklyEarnings = [
  { day: 'Mon', amount: 850 },
  { day: 'Tue', amount: 620 },
  { day: 'Wed', amount: 740 },
  { day: 'Thu', amount: 910 },
  { day: 'Fri', amount: 680 },
  { day: 'Sat', amount: 450 },
  { day: 'Sun', amount: 0 },
];

export default function HostDashboard() {
  const { user } = useApp();
  const maxEarning = Math.max(...weeklyEarnings.map(e => e.amount));

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-bg pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-muted text-sm">{greeting()}, {user?.name || 'Host'}</p>
          <h1 className="font-syne font-bold text-3xl text-text-light">
            Your Dashboard
          </h1>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card text-center"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3 ${
                stat.color === 'primary' ? 'bg-primary/10' : 'bg-teal/10'
              }`}>
                <stat.icon className={`w-5 h-5 ${
                  stat.color === 'primary' ? 'text-primary' : 'text-teal'
                }`} />
              </div>
              <p className={`font-syne font-bold text-xl ${
                stat.color === 'primary' ? 'text-primary' : 'text-text-light'
              }`}>
                {stat.value}
              </p>
              <p className="text-muted text-xs">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Active Ride Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card bg-gradient-to-r from-teal to-teal/80 mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-primary text-text-dark text-xs font-semibold rounded-full">
                  OPEN
                </span>
                <span className="text-text-light/70 text-sm">2 seats available</span>
              </div>
              <h3 className="font-syne font-semibold text-xl text-text-light mb-1">
                Koramangala → Whitefield
              </h3>
              <p className="text-text-light/70">Departs at 08:30 AM</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-primary px-6 py-3 flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              View Requests (3)
            </motion.button>
          </div>
        </motion.div>

        {/* Earnings Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-syne font-semibold text-lg text-text-dark">
              Weekly Earnings
            </h3>
            <span className="text-sm text-muted">This week: Rs 4,250</span>
          </div>

          {/* Simple Bar Chart */}
          <div className="flex items-end justify-between gap-2 h-40">
            {weeklyEarnings.map((day) => (
              <div key={day.day} className="flex flex-col items-center gap-2 flex-1">
                <div
                  className="w-full bg-primary rounded-t-lg transition-all duration-300 hover:bg-primary/80"
                  style={{
                    height: `${(day.amount / maxEarning) * 100}%`,
                    minHeight: day.amount > 0 ? '8px' : '0',
                  }}
                />
                <span className="text-xs text-muted">{day.day}</span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-teal/20">
            <div className="flex items-center gap-2 text-sm text-muted">
              <div className="w-3 h-3 bg-primary rounded" />
              <span>Daily Earnings</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span>+15% vs last week</span>
            </div>
          </div>
        </motion.div>

        {/* Past Rides Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card mb-8"
        >
          <h3 className="font-syne font-semibold text-lg text-text-dark mb-4">
            Recent Rides
          </h3>

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-5 gap-4 py-3 border-b border-teal/20 text-sm font-medium text-muted">
            <span>Date</span>
            <span className="col-span-2">Route</span>
            <span>Passengers</span>
            <span>Earnings</span>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-teal/10">
            {recentRides.map((ride) => (
              <div
                key={ride.id}
                className="grid md:grid-cols-5 gap-2 md:gap-4 py-4 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    ride.status === 'completed' ? 'bg-green-500' : 'bg-primary'
                  }`} />
                  <span className="text-text-dark">{ride.date}</span>
                </div>
                <div className="md:col-span-2 flex items-center gap-1 text-text-dark">
                  <span>{ride.route}</span>
                </div>
                <div className="flex items-center gap-1 text-muted">
                  <Users className="w-3 h-3" />
                  <span>{ride.passengers}</span>
                </div>
                <div className="font-mono font-semibold text-primary">
                  Rs {ride.earnings}
                </div>
              </div>
            ))}
          </div>

          {/* View All */}
          <button className="w-full py-3 mt-2 text-center text-sm text-primary hover:underline">
            View All Rides
          </button>
        </motion.div>

        {/* Upcoming Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card"
        >
          <h3 className="font-syne font-semibold text-lg text-text-dark mb-4">
            Upcoming Schedule
          </h3>

          <div className="space-y-4">
            {recentRides.filter(r => r.status === 'upcoming').map((ride, index) => (
              <div
                key={ride.id}
                className="relative pl-8 pb-4 border-l-2 border-teal/30 last:border-0 last:pb-0"
              >
                {/* Timeline Dot */}
                <div className="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 bg-primary rounded-full border-2 border-bg">
                  {index === 0 && (
                    <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-50" />
                  )}
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <p className="text-muted text-xs">{ride.date}</p>
                    <p className="text-text-dark font-medium">{ride.route}</p>
                    <p className="text-muted text-sm">
                      {ride.passengers} passengers • Rs {ride.earnings}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 text-xs rounded-lg bg-teal/10 text-teal">
                      Edit
                    </button>
                    <button className="px-3 py-1 text-xs rounded-lg bg-red-500/10 text-red-400">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
