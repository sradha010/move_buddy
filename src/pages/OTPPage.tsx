import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, ArrowLeft, CheckCircle, User } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../lib/api';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;
const DUMMY_OTP = '123456';

type Step = 'otp' | 'name';

export default function OTPPage() {
  const [step, setStep]         = useState<Step>('otp');
  const [otp, setOtp]           = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [name, setName]         = useState('');
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [verified, setVerified] = useState(false);

  const inputRefs  = useRef<(HTMLInputElement | null)[]>([]);
  const loadingRef = useRef(false);  // avoid stale closure in auto-submit
  const navigate   = useNavigate();
  const { user, setUser, setAuthenticated, setAccessToken } = useApp();

  // Guard — redirect if arrived without going through phone step (skip for dummy OTP)
  useEffect(() => {
    if (!window.confirmationResult) {
      // allow through so dummy OTP (123456) can still be tested
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } else {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, []);                             // run once on mount

  // Countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Sync loading ref
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  const focusInput = (index: number) =>
    inputRefs.current[Math.max(0, Math.min(index, OTP_LENGTH - 1))]?.focus();

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // paste handling
      const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
      const newOtp = [...otp];
      digits.split('').forEach((d, i) => { if (index + i < OTP_LENGTH) newOtp[index + i] = d; });
      setOtp(newOtp);
      focusInput(Math.min(index + digits.length, OTP_LENGTH - 1));
      return;
    }
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < OTP_LENGTH - 1) focusInput(index + 1);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const n = [...otp]; n[index] = ''; setOtp(n);
      } else if (index > 0) {
        focusInput(index - 1);
      }
    } else if (e.key === 'ArrowLeft')  focusInput(index - 1);
    else if  (e.key === 'ArrowRight') focusInput(index + 1);
  };

  // Called on button click OR when all 6 digits are typed
  const handleVerify = async (otpString?: string) => {
    const code = otpString ?? otp.join('');
    if (code.length !== OTP_LENGTH || loadingRef.current || verified) return;

    if (!window.confirmationResult) {
      setError('Session expired. Please go back and request a new OTP.');
      return;
    }

    setLoading(true);
    loadingRef.current = true;
    setError('');

    // ── Dummy bypass for development ──────────────────────────────────────
    if (code === DUMMY_OTP) {
      setVerified(true);
      const isNew = !user?.name || user.name === 'BuddyRide User';
      setAccessToken('dummy-token');
      setUser({
        id: 'dummy-id',
        name: user?.name || 'BuddyRide User',
        email: user?.email || '',
        phone: user?.phone || '',
        role: 'guest',
        is_verified: true,
      });
      setAuthenticated(true);
      if (isNew) {
        setStep('name');
        setLoading(false);
        loadingRef.current = false;
      } else {
        redirectByRole('guest');
      }
      return;
    }
    // ─────────────────────────────────────────────────────────────────────

    try {
      // Step 1: verify with Firebase
      const result = await window.confirmationResult.confirm(code);
      const idToken = await result.user.getIdToken();
      setVerified(true);

      // Step 2: exchange token with our backend
      const response = await api.post<{ access_token: string; is_new_user: boolean; user: any }>(
        '/auth/verify-firebase',
        {
          idToken,
          ...(user?.name && user.name !== 'BuddyRide User' ? { name: user.name } : {}),
          ...(user?.email ? { email: user.email } : {}),
        },
      );

      // Step 3: store session
      setAccessToken(response.access_token);
      setUser({
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        phone: response.user.phone,
        role: response.user.role,
        profile_photo: response.user.profile_photo,
        is_verified: response.user.is_verified,
      });
      setAuthenticated(true);

      // Step 4: route
      if (response.is_new_user) {
        setStep('name');
        setLoading(false);
        loadingRef.current = false;
      } else {
        redirectByRole(response.user.role);
      }
    } catch (err: any) {
      setVerified(false);
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => focusInput(0), 50);

      const code2 = err?.code ?? '';
      if (code2 === 'auth/invalid-verification-code') {
        setError('Incorrect OTP. Please try again.');
      } else if (code2 === 'auth/code-expired') {
        setError('OTP has expired. Please go back and request a new one.');
      } else if (code2 === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a moment.');
      } else {
        setError(err?.message ?? 'Verification failed. Please try again.');
      }
      setLoading(false);
      loadingRef.current = false;
    }
  };

  // Auto-submit when last digit is typed
  const handleOtpChangeWithAutoSubmit = (index: number, value: string) => {
    handleOtpChange(index, value);

    // Check if this completes the OTP
    if (value.length === 1 && index === OTP_LENGTH - 1) {
      const newOtp = [...otp];
      newOtp[index] = value;
      const code = newOtp.join('');
      if (code.length === OTP_LENGTH) {
        setTimeout(() => handleVerify(code), 100); // slight delay to let state update
      }
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await api.patch('/users/profile', { name: name.trim() });
      setUser({ ...(user!), name: name.trim() });
    } catch { /* non-critical */ }
    finally { setLoading(false); }
    redirectByRole(user?.role ?? 'guest');
  };

  const redirectByRole = (role: string) => {
    window.confirmationResult = undefined;
    window.recaptchaVerifier  = undefined;
    if (role === 'admin') navigate('/admin', { replace: true });
    else navigate('/dashboard', { replace: true });
  };

  const maskedPhone = user?.phone
    ? user.phone.replace(/(\+\d{2,3})(\d+)(\d{4})$/, (_, a, b, c) => `${a} ${'•'.repeat(b.length)} ${c}`)
    : '';

  // ─── Name Step ────────────────────────────────────────────────────────────────
  if (step === 'name') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm"
        >
          <div className="bg-[#0F2226] border border-teal/25 rounded-2xl p-6 shadow-2xl text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring' as const, stiffness: 200, delay: 0.1 }}
              className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle className="w-8 h-8 text-green-500" />
            </motion.div>

            <h2 className="font-syne font-bold text-xl text-text-light mb-1">Phone Verified!</h2>
            <p className="text-muted text-sm mb-6">Welcome to BuddyRide. What should we call you?</p>

            <form onSubmit={handleSaveName} className="space-y-4 text-left">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your full name"
                  autoFocus
                  required
                  className="w-full h-12 pl-10 pr-4 bg-teal/10 border border-teal/30 rounded-xl text-text-light placeholder-muted/40 focus:outline-none focus:border-primary transition-all"
                />
              </div>

              <motion.button
                type="submit"
                disabled={loading || name.trim().length < 2}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                className={`w-full h-12 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  name.trim().length >= 2 && !loading
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'bg-primary/20 text-primary/40 cursor-not-allowed'
                }`}
              >
                {loading
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <> Enter BuddyRide <ArrowRight className="w-4 h-4" /> </>
                }
              </motion.button>

              <button
                type="button"
                onClick={() => redirectByRole(user?.role ?? 'guest')}
                className="w-full text-center text-sm text-muted hover:text-text-light transition-colors"
              >
                Skip for now
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── OTP Step ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-sm"
      >
        {/* Back */}
        <button
          onClick={() => navigate('/auth/login')}
          className="flex items-center gap-1.5 text-muted hover:text-text-light text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="bg-[#0F2226] border border-teal/25 rounded-2xl p-6 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <h2 className="font-syne font-bold text-xl text-text-light mb-1">Enter OTP</h2>
            <p className="text-muted text-sm">Code sent to</p>
            <p className="text-primary font-semibold font-mono text-sm mt-0.5">{maskedPhone || user?.phone}</p>
            <p className="text-yellow-400/60 text-xs mt-2">Dev: use <span className="font-mono font-bold">123456</span> to bypass</p>
          </div>

          {/* OTP Boxes */}
          <div className="flex justify-center gap-2 mb-2">
            {otp.map((digit, index) => (
              <motion.input
                key={index}
                ref={r => (inputRefs.current[index] = r)}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={e => handleOtpChangeWithAutoSubmit(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                onPaste={e => {
                  e.preventDefault();
                  handleOtpChangeWithAutoSubmit(0, e.clipboardData.getData('text'));
                }}
                onFocus={e => e.target.select()}
                disabled={loading}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.04 }}
                className={`w-11 text-center text-xl font-mono font-bold rounded-xl border-2 transition-all focus:outline-none disabled:opacity-50 ${
                  digit
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-teal/30 bg-teal/10 text-text-light'
                }`}
                style={{ height: '52px' }}
              />
            ))}
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-red-400 text-sm text-center mt-3 overflow-hidden"
              >
                ⚠ {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Verify button */}
          <motion.button
            onClick={() => handleVerify()}
            disabled={otp.join('').length !== OTP_LENGTH || loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            className={`w-full h-12 rounded-xl font-semibold flex items-center justify-center gap-2 mt-5 transition-all ${
              otp.join('').length === OTP_LENGTH && !loading
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-primary/20 text-primary/40 cursor-not-allowed'
            }`}
          >
            {loading
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <> Verify <ArrowRight className="w-4 h-4" /> </>
            }
          </motion.button>

          {/* Resend */}
          <div className="mt-5 text-center">
            {countdown > 0 ? (
              <p className="text-muted text-sm">
                Resend in{' '}
                <span className="text-primary font-mono font-semibold tabular-nums">
                  {String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
                </span>
              </p>
            ) : (
              <button
                onClick={() => navigate('/auth/login')}
                className="text-primary text-sm font-medium hover:underline"
              >
                Resend OTP
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
