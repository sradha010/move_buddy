import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Phone } from 'lucide-react';
import { useApp } from '../store/AppContext';

type AuthMode = 'login' | 'signup';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser, setAuthenticated } = useApp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    setUser({ name: form.name || 'User', email: form.email, phone: form.phone });
    setAuthenticated(true);

    // Navigate to OTP page
    navigate('/auth/otp');
  };

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Left Panel - Brand */}
      <motion.div
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-teal p-12 relative overflow-hidden"
      >
        {/* Decorative Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 30% 50%, #FF7D00 0%, transparent 40%)',
          }} />
        </div>

        <div className="relative z-10 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/30">
              <Phone className="w-10 h-10 text-text-dark" />
            </div>
            <h1 className="font-syne font-bold text-4xl text-text-light mb-4">
              BuddyRide
            </h1>
            <p className="text-text-light/80 text-lg max-w-sm">
              Your daily commute, smarter. Share rides, save money, and make new connections.
            </p>
          </motion.div>
        </div>

        {/* Bottom decoration */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="absolute bottom-12 left-0 right-0 text-center text-text-light/50 text-sm"
        >
          Trusted by 10,000+ commuters
        </motion.div>
      </motion.div>

      {/* Right Panel - Form */}
      <motion.div
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="flex-1 flex items-center justify-center p-8"
      >
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="font-syne font-bold text-2xl text-text-light">BuddyRide</h1>
          </div>

          {/* Tab Switcher */}
          <div className="flex mb-8 border-b border-muted/30">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 pb-4 text-center font-medium transition-colors relative ${
                mode === 'login' ? 'text-primary' : 'text-muted'
              }`}
            >
              Login
              {mode === 'login' && (
                <motion.div
                  layoutId="auth-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                />
              )}
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 pb-4 text-center font-medium transition-colors relative ${
                mode === 'signup' ? 'text-primary' : 'text-muted'
              }`}
            >
              Sign Up
              {mode === 'signup' && (
                <motion.div
                  layoutId="auth-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                />
              )}
            </button>
          </div>

          {/* Heading */}
          <h2 className="font-syne font-bold text-2xl text-text-light mb-2">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-muted mb-8">
            {mode === 'login'
              ? 'Enter your details to continue'
              : 'Start your smart commute journey today'}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <label className="block text-sm text-text-light mb-2">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-underline w-full"
                  placeholder="John Doe"
                  required={mode === 'signup'}
                />
              </motion.div>
            )}

            <div>
              <label className="block text-sm text-text-light mb-2">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-underline w-full"
                placeholder="john@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-text-light mb-2">Phone Number</label>
              <div className="flex items-center gap-2">
                <span className="text-text-light px-2 py-2 border-b-2 border-muted">
                  +91
                </span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input-underline flex-1"
                  placeholder="9876543210"
                  required
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-text-dark border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* Terms */}
          <p className="text-center text-muted text-xs mt-8">
            By continuing, you agree to our{' '}
            <a href="#" className="text-primary hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-primary hover:underline">Privacy Policy</a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
