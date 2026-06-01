import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield } from 'lucide-react';

export default function OTPPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      const values = value.split('').slice(0, 6);
      const newOtp = [...otp];
      values.forEach((v, i) => {
        if (index + i < 6) {
          newOtp[index + i] = v;
        }
      });
      setOtp(newOtp);
      const lastIndex = Math.min(index + values.length, 5);
      inputRefs.current[lastIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const newOtp = [...otp];
    pastedData.split('').forEach((v, i) => {
      if (i < 6) newOtp[i] = v;
    });
    setOtp(newOtp);
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) {
      setError('Please enter complete OTP');
      setLoading(false);
      return;
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // For demo, accept any 6-digit OTP
    navigate('/auth/mode-select');
  };

  const handleResend = () => {
    setCountdown(30);
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="card p-8">
          {/* Icon */}
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-primary" />
          </div>

          {/* Heading */}
          <h1 className="font-syne font-bold text-2xl text-text-dark text-center mb-2">
            Verify Your Phone
          </h1>
          <p className="text-muted text-center mb-8">
            We&apos;ve sent a 6-digit code to your phone number
          </p>

          {/* OTP Inputs */}
          <form onSubmit={handleSubmit}>
            <div className="flex justify-center gap-3 mb-6">
              {otp.map((digit, index) => (
                <motion.input
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="w-12 h-14 text-center text-2xl font-mono font-semibold text-text-dark
                             border-2 border-teal rounded-lg
                             focus:outline-none focus:border-primary focus:scale-110
                             transition-all duration-200"
                  style={{ caretColor: 'transparent' }}
                />
              ))}
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-sm text-center mb-4"
              >
                {error}
              </motion.p>
            )}

            {/* Verify Button */}
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
                  Verify
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* Resend */}
          <div className="mt-6 text-center">
            {countdown > 0 ? (
              <p className="text-muted text-sm">
                Resend OTP in{' '}
                <span className="text-primary font-mono font-semibold">{countdown}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                className="text-primary text-sm font-medium hover:underline"
              >
                Resend OTP
              </button>
            )}
          </div>
        </div>

        {/* Back Link */}
        <p className="text-center text-muted text-sm mt-6">
          Wrong number?{' '}
          <a href="/auth/login" className="text-primary hover:underline">
            Go back
          </a>
        </p>
      </motion.div>
    </div>
  );
}
