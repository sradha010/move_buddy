import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, ArrowRight, AlertCircle, ArrowLeft, Phone, Lock } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../lib/api';

export default function AdminLoginPage() {
  const [phone, setPhone]     = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const { setUser, setAuthenticated, setAccessToken } = useApp();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Normalise phone: add +91 if user didn't type a country code
      const raw = phone.trim();
      const normalised = raw.startsWith('+') ? raw : `+91${raw}`;
      const res = await api.post<{ access_token: string; user: any }>(
        '/auth/admin-login',
        { phone: normalised, password },
      );
      if (res.user?.role !== 'admin') {
        throw new Error('This account does not have admin privileges.');
      }
      setAccessToken(res.access_token);
      setUser({
        id:          res.user.id,
        name:        res.user.name,
        email:       res.user.email ?? '',
        phone:       res.user.phone,
        role:        'admin',
        is_verified: true,
      });
      setAuthenticated(true);
      navigate('/admin', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const ready = phone.trim().length >= 10 && password.length >= 6;

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[380px]"
      >
        <Link
          to="/auth/login"
          className="inline-flex items-center gap-1.5 text-muted/60 hover:text-muted text-xs mb-8 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to user login
        </Link>

        {/* Brand */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
            className="w-16 h-16 bg-teal rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xl shadow-teal/30"
          >
            <ShieldCheck className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="font-syne font-bold text-2xl text-white">Admin Portal</h1>
          <p className="text-muted text-sm mt-0.5">Sign in to manage BuddyRide</p>
        </div>

        {/* Card */}
        <div className="bg-[#0F2226] border border-teal/25 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted/80 uppercase tracking-wider">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="9876543210  or  +919876543210"
                  required
                  autoFocus
                  className="w-full h-11 pl-10 pr-4 bg-teal/10 border border-teal/30 rounded-xl text-white placeholder-muted/30 text-sm font-mono focus:outline-none focus:border-primary/60 transition-colors"
                />
              </div>
              <p className="text-xs text-muted/40">+91 is added automatically for Indian numbers</p>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted/80 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full h-11 pl-10 pr-11 bg-teal/10 border border-teal/30 rounded-xl text-white placeholder-muted/30 text-sm focus:outline-none focus:border-primary/60 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted/40 hover:text-muted transition-colors"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading || !ready}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                ready && !loading
                  ? 'bg-teal text-white hover:bg-teal/90 shadow-lg shadow-teal/20'
                  : 'bg-teal/20 text-teal/40 cursor-not-allowed'
              }`}
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <> Sign In <ArrowRight className="w-4 h-4" /> </>
              }
            </motion.button>
          </form>
        </div>

        <p className="text-center text-muted/25 text-xs mt-5">
          Unauthorised access attempts are logged.
        </p>
      </motion.div>
    </div>
  );
}
