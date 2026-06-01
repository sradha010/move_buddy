import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Users, Menu, X, User, LogOut, Settings, Sun, Moon, LayoutDashboard } from 'lucide-react';
import { useApp } from '../store/AppContext';

export default function Navbar() {
  const { mode, setMode, isAuthenticated, user, setUser, setAuthenticated, theme, setTheme } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { path: '/guest/find',  label: 'Find a Ride',  icon: Users           },
    { path: '/host/offer',  label: 'Offer a Ride', icon: Car             },
    ...(isAuthenticated ? [{ path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    setUser(null);
    setAuthenticated(false);
    setProfileOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-teal border-b border-teal/50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <motion.button
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-text-dark" />
            </div>
            <span className="font-syne font-bold text-xl text-text-light">BuddyRide</span>
          </motion.button>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${
                  isActive(path)
                    ? 'text-primary border-b-2 border-primary pb-1'
                    : 'text-text-light/70 hover:text-text-light'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-3">
            {/* Mode Toggle */}
            <div className="flex items-center bg-bg/50 rounded-full p-1">
              <button
                onClick={() => { setMode('guest'); navigate('/guest/find'); }}
                className={`px-3 py-1 text-sm font-medium rounded-full transition-all duration-300 ${
                  mode === 'guest' ? 'bg-primary text-text-dark' : 'text-text-light/70 hover:text-text-light'
                }`}
              >
                Guest
              </button>
              <button
                onClick={() => { setMode('host'); navigate('/host/offer'); }}
                className={`px-3 py-1 text-sm font-medium rounded-full transition-all duration-300 ${
                  mode === 'host' ? 'bg-primary text-text-dark' : 'text-text-light/70 hover:text-text-light'
                }`}
              >
                Host
              </button>
            </div>

            {/* Theme Toggle */}
            <motion.button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-9 h-9 rounded-full border border-text-light/20 flex items-center justify-center text-text-light hover:border-primary hover:text-primary transition-colors"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme}
                  initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.18 }}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </motion.div>
              </AnimatePresence>
            </motion.button>

            {/* Profile / Login */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 text-text-light hover:text-primary transition-colors"
                >
                  <div className="w-8 h-8 bg-surface rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-teal" />
                  </div>
                  <span className="text-sm">{user?.name || 'User'}</span>
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-surface rounded-xl shadow-xl py-2 z-50"
                    >
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 text-text-dark hover:bg-primary/10 transition-colors"
                        onClick={() => setProfileOpen(false)}
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center gap-2 px-4 py-2 text-text-dark hover:bg-primary/10 transition-colors"
                        onClick={() => setProfileOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/auth/login" className="btn-primary text-sm">Login</Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-text-light p-2"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-teal border-t border-teal/50 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-4">
              {navLinks.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 text-sm font-medium ${
                    isActive(path) ? 'text-primary' : 'text-text-light/70'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}

              {/* Mobile Mode Toggle */}
              <div className="flex items-center gap-2 pt-2 border-t border-text-light/10">
                <span className="text-sm text-text-light/70">Mode:</span>
                <button
                  onClick={() => { setMode('guest'); navigate('/guest/find'); setMobileMenuOpen(false); }}
                  className={`px-3 py-1 text-sm rounded-full ${
                    mode === 'guest' ? 'bg-primary text-text-dark' : 'border border-primary/50 text-primary'
                  }`}
                >
                  Guest
                </button>
                <button
                  onClick={() => { setMode('host'); navigate('/host/offer'); setMobileMenuOpen(false); }}
                  className={`px-3 py-1 text-sm rounded-full ${
                    mode === 'host' ? 'bg-primary text-text-dark' : 'border border-primary/50 text-primary'
                  }`}
                >
                  Host
                </button>
              </div>

              {/* Mobile Theme Toggle */}
              <div className="flex items-center gap-3 pt-2 border-t border-text-light/10">
                <span className="text-sm text-text-light/70">Theme:</span>
                <button
                  onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2 px-3 py-1 rounded-full border border-primary/50 text-primary text-sm"
                >
                  {theme === 'dark' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                  {theme === 'dark' ? 'Light' : 'Dark'}
                </button>
              </div>

              {/* Mobile Auth */}
              {isAuthenticated ? (
                <div className="pt-2 border-t border-text-light/10">
                  <div className="flex items-center gap-2 text-text-light mb-2">
                    <User className="w-4 h-4" />
                    <span className="text-sm">{user?.name || 'User'}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-red-400 text-sm flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-primary text-sm inline-block"
                >
                  Login
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
