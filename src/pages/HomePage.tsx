import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { TrendingUp, Calendar, CreditCard, ArrowRight, Car, Users } from 'lucide-react';
import { useApp } from '../store/AppContext';
import AnimatedRoad from '../components/AnimatedRoad';

export default function HomePage() {
  const { user, mode } = useApp();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const stats = mode === 'guest'
    ? [
        { label: 'Today\'s Rides', value: '2', icon: Car },
        { label: 'Total Savings', value: 'Rs 450', icon: TrendingUp },
        { label: 'Active Plan', value: '15 Day', icon: Calendar },
      ]
    : [
        { label: 'Active Rides', value: '1', icon: Car },
        { label: 'Total Earnings', value: 'Rs 1,250', icon: TrendingUp },
        { label: 'Riders Served', value: '12', icon: Users },
      ];

  return (
    <div className="min-h-screen bg-bg pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-muted text-sm">{greeting()}, {user?.name || 'there'}</p>
          <h1 className="font-syne font-bold text-3xl md:text-4xl text-text-light">
            Ready to {mode === 'guest' ? 'Find' : 'Offer'} a Ride?
          </h1>
        </motion.div>

        {/* CTA Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Link
            to={mode === 'guest' ? '/guest/find' : '/host/offer'}
            className="block bg-gradient-to-r from-teal to-teal/80 rounded-2xl p-8 relative overflow-hidden group"
          >
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />

            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h2 className="font-syne font-semibold text-2xl text-text-light mb-2">
                  {mode === 'guest' ? 'Find a Ride Today' : 'Post a Ride'}
                </h2>
                <p className="text-text-light/70 max-w-md">
                  {mode === 'guest'
                    ? 'Search for available rides matching your route and save on commute costs.'
                    : 'Share your ride, earn money, and help others commute affordably.'}
                </p>
              </div>
              <motion.div
                initial={{ x: 0 }}
                whileHover={{ x: 10 }}
                className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30"
              >
                <ArrowRight className="w-6 h-6 text-text-dark" />
              </motion.div>
            </div>
          </Link>
        </motion.div>

        {/* Animated Road */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <AnimatedRoad />
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-3 gap-4 mb-12"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="card text-center"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <p className="font-syne font-bold text-2xl text-primary mb-1">
                {stat.value}
              </p>
              <p className="text-muted text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid md:grid-cols-2 gap-6"
        >
          {mode === 'guest' ? (
            <>
              <Link to="/guest/subscribe" className="card hover:shadow-xl hover:shadow-primary/10 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <CreditCard className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-syne font-semibold text-lg text-text-dark">
                      Subscription Plans
                    </h3>
                    <p className="text-muted text-sm">
                      Save more with weekly & monthly plans
                    </p>
                  </div>
                </div>
              </Link>

              <Link to="/guest/history" className="card hover:shadow-xl hover:shadow-primary/10 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-teal/10 rounded-xl flex items-center justify-center group-hover:bg-teal/20 transition-colors">
                    <Calendar className="w-7 h-7 text-teal" />
                  </div>
                  <div>
                    <h3 className="font-syne font-semibold text-lg text-text-dark">
                      Ride History
                    </h3>
                    <p className="text-muted text-sm">
                      View your past rides and receipts
                    </p>
                  </div>
                </div>
              </Link>
            </>
          ) : (
            <>
              <Link to="/host/dashboard" className="card hover:shadow-xl hover:shadow-primary/10 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <TrendingUp className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-syne font-semibold text-lg text-text-dark">
                      Host Dashboard
                    </h3>
                    <p className="text-muted text-sm">
                      Track earnings and manage rides
                    </p>
                  </div>
                </div>
              </Link>

              <Link to="/host/history" className="card hover:shadow-xl hover:shadow-primary/10 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-teal/10 rounded-xl flex items-center justify-center group-hover:bg-teal/20 transition-colors">
                    <Calendar className="w-7 h-7 text-teal" />
                  </div>
                  <div>
                    <h3 className="font-syne font-semibold text-lg text-text-dark">
                      Ride History
                    </h3>
                    <p className="text-muted text-sm">
                      View past rides and ratings
                    </p>
                  </div>
                </div>
              </Link>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
