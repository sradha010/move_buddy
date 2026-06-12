import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Car,
  Menu,
  X,
  LogOut,
  User,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../lib/api';

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 25 };

// ----- nav link definitions -----
type NavLink = { path: string; label: string };

function getNavLinks(): NavLink[] {
  return [
    { path: '/guest/find', label: 'Find a Ride' },
    { path: '/host/offer', label: 'Offer a Ride' },
    { path: '/dashboard', label: 'Dashboard' },
  ];
}


// ============================================================
export default function Navbar() {
  const { mode, setMode, isAuthenticated, user, setUser, setAuthenticated, setAccessToken } =
    useApp();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = getNavLinks();
  const isActive = (path: string) => location.pathname === path;

  // ---- scroll listener ----
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ---- close mobile menu on route change ----
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // ---- logout ----
  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // proceed regardless
    }
    localStorage.removeItem('buddyride_token');
    setAuthenticated(false);
    setUser(null);
    setAccessToken(null);
    setMobileOpen(false);
    navigate('/');
  };

  // ---- mode toggle ----
  const handleModeToggle = (newMode: 'guest' | 'host') => {
    if (newMode === mode) return;
    if (newMode === 'host' && user && !user.is_verified) {
      // Simple toast fallback — works without a toast library
      const event = new CustomEvent('buddyride:toast', {
        detail: { message: 'Host verification required to switch to Host mode.', type: 'warning' },
      });
      window.dispatchEvent(event);
    }
    setMode(newMode);
  };

  // ---- derived ----
  return (
    <>
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-[#0D1B1E]/95 backdrop-blur-xl border-b border-white/[0.08] ${
          scrolled ? 'shadow-lg shadow-black/25' : ''
        }`}
        initial={false}
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">

            {/* ===== Logo ===== */}
            <motion.button
              onClick={() => navigate('/')}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={SPRING}
              className="flex items-center gap-2.5 cursor-pointer select-none"
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shadow-primary/30">
                <Car className="w-4 h-4 text-text-dark" />
              </div>
              <span className="font-syne font-bold text-xl text-white tracking-tight">
                BuddyRide
              </span>
            </motion.button>

            {/* ===== Desktop Nav Links ===== */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(({ path, label }) => (
                <Link
                  key={path}
                  to={path}
                  className="relative px-3 py-2 text-sm font-medium transition-colors duration-200"
                >
                  <span className={isActive(path) ? 'text-primary' : 'text-white/70 hover:text-white'}>
                    {label}
                  </span>
                  {isActive(path) && (
                    <motion.div
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full"
                      transition={SPRING}
                    />
                  )}
                </Link>
              ))}
            </div>

            {/* ===== Right Side ===== */}
            <div className="hidden md:flex items-center gap-3">

              {isAuthenticated ? (
                <>
                  {/* Mode Toggle Pill */}
                  <div className="relative flex items-center bg-white/5 border border-white/10 rounded-full p-1 gap-0.5">
                    {(['guest', 'host'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => handleModeToggle(m)}
                        className={`relative z-10 px-3 py-1 text-xs font-semibold rounded-full transition-colors duration-200 capitalize ${
                          mode === m ? 'text-text-dark' : 'text-muted hover:text-text-light'
                        }`}
                      >
                        {mode === m && (
                          <motion.div
                            layoutId="mode-pill"
                            className="absolute inset-0 bg-primary rounded-full"
                            transition={SPRING}
                          />
                        )}
                        <span className="relative z-10">{m}</span>
                      </button>
                    ))}
                  </div>

                  {/* Avatar — direct link to profile */}
                  <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} transition={SPRING}>
                    <Link
                      to="/profile"
                      className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden hover:border-primary/60 hover:bg-primary/30 transition-all duration-200"
                    >
                      {user?.profile_photo ? (
                        <img src={user.profile_photo} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5" aria-hidden="true">
                          <circle cx="16" cy="12" r="5" fill="#FF7D00" opacity="0.9" />
                          <path d="M6 28c0-5.523 4.477-10 10-10s10 4.477 10 10" fill="#FF7D00" opacity="0.6" />
                        </svg>
                      )}
                    </Link>
                  </motion.div>
                </>
              ) : (
                <>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={SPRING}>
                    <Link
                      to="/auth/login"
                      className="px-4 py-2 text-sm font-semibold text-text-light border border-white/20 rounded-xl hover:bg-white/5 transition-all duration-200"
                    >
                      Login
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={SPRING}>
                    <Link
                      to="/auth/register"
                      className="px-4 py-2 text-sm font-semibold bg-primary text-text-dark rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all duration-200"
                    >
                      Get Started
                    </Link>
                  </motion.div>
                </>
              )}
            </div>

            {/* ===== Mobile Hamburger ===== */}
            <motion.button
              onClick={() => setMobileOpen((o) => !o)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={SPRING}
              className="md:hidden w-9 h-9 flex items-center justify-center text-text-light hover:bg-white/5 rounded-xl transition-colors"
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileOpen ? (
                  <motion.span
                    key="x"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="w-5 h-5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* ===== Mobile Drawer (drops down from top) ===== */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={SPRING}
            className="fixed top-16 left-0 right-0 z-40 md:hidden"
          >
            <div className="mx-3 mt-1 bg-bg/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
              <div className="p-4 space-y-1">

                {/* Nav Links */}
                {navLinks.map(({ path, label }, i) => (
                  <motion.div
                    key={path}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...SPRING, delay: i * 0.04 }}
                  >
                    <Link
                      to={path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                        isActive(path)
                          ? 'text-primary bg-primary/10'
                          : 'text-muted hover:text-text-light hover:bg-white/5'
                      }`}
                    >
                      {label}
                      {isActive(path) && (
                        <motion.div
                          layoutId="mobile-active-dot"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                          transition={SPRING}
                        />
                      )}
                    </Link>
                  </motion.div>
                ))}

                <div className="h-px bg-white/[0.06] my-2" />

                {isAuthenticated ? (
                  <>
                    {/* Mode Toggle (Mobile) */}
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className="text-xs text-muted font-medium">Mode:</span>
                      <div className="relative flex items-center bg-white/5 border border-white/10 rounded-full p-0.5 gap-0.5">
                        {(['guest', 'host'] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() => handleModeToggle(m)}
                            className={`relative z-10 px-3 py-1 text-xs font-semibold rounded-full transition-colors duration-200 capitalize ${
                              mode === m ? 'text-text-dark' : 'text-muted'
                            }`}
                          >
                            {mode === m && (
                              <motion.div
                                layoutId="mobile-mode-pill"
                                className="absolute inset-0 bg-primary rounded-full"
                                transition={SPRING}
                              />
                            )}
                            <span className="relative z-10">{m}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-white/[0.06] my-2" />

                    {/* User info */}
                    <div className="flex items-center gap-3 px-3 py-2">
                      <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {user?.profile_photo ? (
                          <img
                            src={user.profile_photo}
                            alt={user?.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5" aria-hidden="true">
                            <circle cx="16" cy="12" r="5" fill="#FF7D00" opacity="0.9" />
                            <path d="M6 28c0-5.523 4.477-10 10-10s10 4.477 10 10" fill="#FF7D00" opacity="0.6" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-light truncate">
                          {user?.name ?? 'User'}
                        </p>
                        <p className="text-xs text-muted truncate">{user?.email ?? ''}</p>
                      </div>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted hover:text-text-light hover:bg-white/5 rounded-xl transition-all duration-150"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>

                    <div className="h-px bg-white/[0.06] my-1" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-150"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2 pt-1">
                    <Link
                      to="/auth/login"
                      onClick={() => setMobileOpen(false)}
                      className="w-full px-4 py-2.5 text-sm font-semibold text-center text-text-light border border-white/20 rounded-xl hover:bg-white/5 transition-all duration-200"
                    >
                      Login
                    </Link>
                    <Link
                      to="/auth/register"
                      onClick={() => setMobileOpen(false)}
                      className="w-full px-4 py-2.5 text-sm font-semibold text-center bg-primary text-text-dark rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all duration-200"
                    >
                      Get Started
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
