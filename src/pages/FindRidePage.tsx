import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import ExpenseCalculator from '../components/ExpenseCalculator';
import type { PlaceData } from '../components/base/GooglePlacesInput';

interface Buddy {
  id: string;
  name: string;
  rating: number;
  vehicle: string;
  vehicleColor: string;
  origin: PlaceData | null;
  destination: PlaceData | null;
  departureTime: string;
  seats: number;
  price: number;
}

const sampleBuddies: Omit<Buddy, 'origin' | 'destination'>[] = [
  {
    id: '1',
    name: 'Rahul Sharma',
    rating: 4.8,
    vehicle: 'Honda City',
    vehicleColor: 'White',
    departureTime: '08:30 AM',
    seats: 3,
    price: 180,
  },
  {
    id: '2',
    name: 'Priya Patel',
    rating: 4.9,
    vehicle: 'Maruti Swift',
    vehicleColor: 'Blue',
    departureTime: '09:00 AM',
    seats: 2,
    price: 220,
  },
  {
    id: '3',
    name: 'Vikram Singh',
    rating: 4.7,
    vehicle: 'Hyundai i20',
    vehicleColor: 'Grey',
    departureTime: '08:45 AM',
    seats: 4,
    price: 150,
  },
  {
    id: '4',
    name: 'Ananya Reddy',
    rating: 4.9,
    vehicle: 'Tata Nexon',
    vehicleColor: 'Orange',
    departureTime: '09:15 AM',
    seats: 2,
    price: 190,
  },
];

export default function FindRidePage() {
  const { user, isAuthenticated } = useApp();
  const navigate = useNavigate();
  const [routeData, setRouteData] = useState<{
    origin: PlaceData | null;
    destination: PlaceData | null;
    distanceKm: number;
    durationMinutes: number;
  } | null>(null);
  const [requestedBuddies, setRequestedBuddies] = useState<string[]>([]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleRouteChange = useCallback((data: {
    origin: PlaceData | null;
    destination: PlaceData | null;
    distanceKm: number;
    durationMinutes: number;
  }) => {
    setRouteData(data);
  }, []);

  const handleRequestJoin = (buddyId: string) => {
    if (!isAuthenticated) {
      navigate('/auth/login');
      return;
    }
    setRequestedBuddies([...requestedBuddies, buddyId]);
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
          <p className="text-muted text-sm">{greeting()}, {user?.name || 'there'}</p>
          <h1 className="font-syne font-bold text-3xl text-text-light">
            Find a Ride Today
          </h1>
        </motion.div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left - Expense Calculator */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ExpenseCalculator
              mode="guest"
              showPlans={true}
              onRouteChange={handleRouteChange}
            />
          </motion.div>

          {/* Right - Available Buddies */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <h2 className="font-syne font-semibold text-xl text-text-light">
              Available BuddyRides
            </h2>

            {routeData && routeData.distanceKm > 0 ? (
              <div className="space-y-4">
                {sampleBuddies.map((buddy, index) => (
                  <motion.div
                    key={buddy.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="card hover:shadow-xl hover:shadow-primary/10 transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="font-syne font-bold text-primary text-sm">{buddy.name.split(' ')[0].substring(0, 1)}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-light">{buddy.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted">
                          <span className="text-primary">★</span>
                          <span>{buddy.rating}</span>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Info */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-lg bg-teal text-text-light text-xs">
                        {buddy.vehicle} ({buddy.vehicleColor})
                      </span>
                      <span className="text-xs text-muted">
                        {buddy.seats} seats available
                      </span>
                    </div>

                    {/* Departure Time */}
                    <div className="flex items-center gap-2 text-sm text-muted mb-4">
                      <Clock className="w-4 h-4" />
                      <span>Departs at {buddy.departureTime}</span>
                    </div>

                    {/* Price & Action */}
                    <div className="flex items-center justify-between pt-4 border-t border-teal/20">
                      <div>
                        <p className="text-xs text-muted">Per seat</p>
                        <p className="font-syne font-bold text-xl text-primary font-mono">
                          Rs {buddy.price}
                        </p>
                      </div>
                      <motion.button
                        onClick={() => handleRequestJoin(buddy.id)}
                        disabled={requestedBuddies.includes(buddy.id)}
                        whileHover={{ scale: requestedBuddies.includes(buddy.id) ? 1 : 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-6 py-2 rounded-full font-medium transition-all ${
                          requestedBuddies.includes(buddy.id)
                            ? 'bg-teal text-text-light cursor-default'
                            : 'btn-primary'
                        }`}
                      >
                        {requestedBuddies.includes(buddy.id) ? 'Requested' : 'Request to Join'}
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="card text-center py-12">
                <Car className="w-12 h-12 text-muted/30 mx-auto mb-4" />
                <p className="text-muted">
                  Enter your route to see available rides
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Import Clock and Car icons
import { Clock, Car } from 'lucide-react';
