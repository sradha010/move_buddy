import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, Car, ArrowRight } from 'lucide-react';
import { useApp } from '../store/AppContext';

type Mode = 'guest' | 'host' | null;

export default function ModeSelectPage() {
  const [selected, setSelected] = useState<Mode>(null);
  const navigate = useNavigate();
  const { setMode, user } = useApp();

  const handleContinue = () => {
    if (selected) {
      setMode(selected);
      navigate(selected === 'guest' ? '/guest/find' : '/host/offer');
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl"
      >
        {/* Greeting */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <p className="text-muted mb-2">{greeting()}, {user?.name || 'there'}</p>
          <h1 className="font-syne font-bold text-3xl md:text-4xl text-text-light">
            How will you ride today?
          </h1>
        </motion.div>

        {/* Mode Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Guest Card */}
          <motion.button
            onClick={() => setSelected('guest')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`relative p-8 rounded-2xl text-left transition-all duration-300 ${
              selected === 'guest'
                ? 'bg-surface border-2 border-primary shadow-lg shadow-primary/20'
                : 'bg-surface/10 border-2 border-teal/50 hover:border-teal'
            }`}
          >
            {selected === 'guest' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
              >
                <span className="text-text-dark text-xs">✓</span>
              </motion.div>
            )}

            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-primary" />
            </div>

            <h2 className="font-syne font-semibold text-xl text-text-light mb-2">
              Find a Ride
            </h2>
            <p className="text-muted text-sm">
              Search for available rides on your route and connect with verified hosts.
            </p>
          </motion.button>

          {/* Host Card */}
          <motion.button
            onClick={() => setSelected('host')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`relative p-8 rounded-2xl text-left transition-all duration-300 ${
              selected === 'host'
                ? 'bg-surface border-2 border-primary shadow-lg shadow-primary/20'
                : 'bg-surface/10 border-2 border-teal/50 hover:border-teal'
            }`}
          >
            {selected === 'host' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
              >
                <span className="text-text-dark text-xs">✓</span>
              </motion.div>
            )}

            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Car className="w-7 h-7 text-primary" />
            </div>

            <h2 className="font-syne font-semibold text-xl text-text-light mb-2">
              Offer a Ride
            </h2>
            <p className="text-muted text-sm">
              Share your ride and earn money while helping others commute affordably.
            </p>
          </motion.button>
        </div>

        {/* Continue Button */}
        <motion.button
          onClick={handleContinue}
          disabled={!selected}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          whileHover={selected ? { scale: 1.02 } : {}}
          whileTap={selected ? { scale: 0.98 } : {}}
          className={`w-full py-4 rounded-full font-semibold flex items-center justify-center gap-2 transition-all duration-300 ${
            selected
              ? 'btn-primary'
              : 'bg-muted/20 text-muted cursor-not-allowed'
          }`}
        >
          Continue
          {selected && <ArrowRight className="w-4 h-4" />}
        </motion.button>

        {/* Info Text */}
        <p className="text-center text-muted text-xs mt-6">
          You can switch between modes anytime from the navigation
        </p>
      </motion.div>
    </div>
  );
}
