import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Car, ChevronDown, AlertCircle } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useApp } from '../store/AppContext';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

const COUNTRY_CODES = [
  { code: '+91',  flag: '🇮🇳', name: 'India',     digits: 10 },
  { code: '+1',   flag: '🇺🇸', name: 'USA',       digits: 10 },
  { code: '+44',  flag: '🇬🇧', name: 'UK',        digits: 10 },
  { code: '+61',  flag: '🇦🇺', name: 'Australia', digits: 9  },
  { code: '+971', flag: '🇦🇪', name: 'UAE',       digits: 9  },
  { code: '+65',  flag: '🇸🇬', name: 'Singapore', digits: 8  },
];

function getErrorMessage(code: string, message: string): string {
  switch (code) {
    case 'auth/billing-not-enabled':
      return 'Firebase billing is not enabled. Upgrade to Blaze plan in Firebase Console, or add this number as a test number in Authentication → Phone → Test numbers.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/invalid-phone-number':
      return 'Invalid phone number. Please check the number and try again.';
    case 'auth/operation-not-allowed':
      return 'Phone sign-in is not enabled. Enable it in Firebase Console → Authentication → Sign-in method → Phone.';
    case 'auth/quota-exceeded':
      return 'SMS quota exceeded. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    default:
      return message || 'Failed to send OTP. Please try again.';
  }
}

export default function AuthPage() {
  const [phone, setPhone]               = useState('');
  const [countryCode, setCountryCode]   = useState('+91');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const navigate = useNavigate();
  const { setUser, user } = useApp();

  const selected = COUNTRY_CODES.find(c => c.code === countryCode) ?? COUNTRY_CODES[0];

  useEffect(() => {
    // Clean up any previous session
    window.confirmationResult = undefined;
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch {}
      window.recaptchaVerifier = undefined;
    }
  }, []);

  const setupRecaptcha = () => {
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch {}
    }
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => { window.recaptchaVerifier = undefined; },
    });
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const digits = phone.replace(/\D/g, '');
    if (digits.length < selected.digits) {
      setError(`Please enter a valid ${selected.digits}-digit phone number.`);
      return;
    }
    const fullPhone = `${countryCode}${digits}`;
    setLoading(true);
    try {
      setupRecaptcha();
      await window.recaptchaVerifier!.render();
      const confirmation = await signInWithPhoneNumber(auth, fullPhone, window.recaptchaVerifier!);
      window.confirmationResult = confirmation;
      setUser({ ...(user ?? { name: '', email: '' }), phone: fullPhone });
      navigate('/auth/otp');
    } catch (err: any) {
      window.recaptchaVerifier = undefined;
      setError(getErrorMessage(err?.code ?? '', err?.message ?? ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4">
      <div id="recaptcha-container" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-[360px]"
      >
        {/* Brand */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xl shadow-primary/25">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-syne font-bold text-2xl text-text-light">BuddyRide</h1>
          <p className="text-muted text-sm mt-0.5">Your daily commute, smarter</p>
        </motion.div>

        {/* Card */}
        <div className="bg-[#0F2226] border border-teal/25 rounded-2xl p-6 shadow-2xl">
          <h2 className="font-syne font-bold text-xl text-text-light mb-1">Enter your number</h2>
          <p className="text-muted text-sm mb-5">We'll send a verification code via SMS</p>

          <form onSubmit={handleSendOtp} className="space-y-4">

            {/* Single unified phone input */}
            <div className="relative flex items-center bg-teal/10 border border-teal/30 rounded-xl overflow-visible focus-within:border-primary transition-colors">

              {/* Country code button — left side */}
              <button
                type="button"
                onClick={() => setShowDropdown(v => !v)}
                className="flex items-center gap-1.5 h-12 px-3 border-r border-teal/30 text-text-light text-sm hover:bg-teal/20 transition-colors shrink-0"
              >
                <span className="text-base leading-none">{selected.flag}</span>
                <span className="font-mono">{selected.code}</span>
                <ChevronDown className={`w-3 h-3 text-muted transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Phone number input — right side */}
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 12))}
                placeholder="Enter phone number"
                required
                autoFocus
                className="flex-1 h-12 px-4 bg-transparent text-text-light placeholder-muted/40 font-mono text-base focus:outline-none"
              />

              {/* Country dropdown */}
              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-[calc(100%+6px)] left-0 z-50 w-56 bg-[#0F2226] border border-teal/30 rounded-xl overflow-hidden shadow-2xl"
                  >
                    {COUNTRY_CODES.map(c => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => { setCountryCode(c.code); setShowDropdown(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-teal/20 ${
                          countryCode === c.code ? 'bg-primary/10 text-primary' : 'text-text-light'
                        }`}
                      >
                        <span className="text-base">{c.flag}</span>
                        <span className="flex-1 text-left">{c.name}</span>
                        <span className="font-mono text-xs text-muted">{c.code}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Error box */}
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
                    <span className="leading-relaxed">{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA */}
            <motion.button
              type="submit"
              disabled={loading || phone.replace(/\D/g, '').length < selected.digits}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
                !loading && phone.replace(/\D/g, '').length >= selected.digits
                  ? 'bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-primary/40'
                  : 'bg-primary/20 text-primary/40 cursor-not-allowed'
              }`}
            >
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <> Get OTP <ArrowRight className="w-4 h-4" /> </>
              }
            </motion.button>

          </form>
        </div>

        {/* Footer note */}
        <p className="text-center text-muted/50 text-xs mt-5 leading-relaxed">
          By continuing, you agree to our{' '}
          <a href="#" className="text-primary/70 hover:text-primary transition-colors">Terms of Service</a>
          {' '}&amp;{' '}
          <a href="#" className="text-primary/70 hover:text-primary transition-colors">Privacy Policy</a>
        </p>

        <div className="text-center mt-3">
          <Link
            to="/admin/login"
            className="text-muted/30 hover:text-muted/60 text-xs transition-colors duration-200"
          >
            Admin Portal
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
