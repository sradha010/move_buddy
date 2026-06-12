import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  Lock,
  Check,
  CreditCard,
  AlertCircle,
  RefreshCw,
  Zap,
  ArrowRight,
  ArrowLeft,
  Star,
} from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../store/AppContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  duration: string;
  price: number;
  discount: number;
  features: string[];
  popular?: boolean;
}

interface Subscription {
  id: string;
  plan_type: string;
  plan_days: number;
  price_paid: number;
  status: string;
  started_at: string;
  ends_at: string;
}

interface OrderData {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FALLBACK_PLANS: Plan[] = [
  {
    id: '7d',
    name: 'Daily',
    duration: '7 Days',
    price: 99,
    discount: 0,
    features: ['5 rides/day', 'Basic matching', 'Standard support'],
  },
  {
    id: '15d',
    name: 'Weekly',
    duration: '15 Days',
    price: 189,
    discount: 2,
    features: ['Unlimited rides', 'Priority matching', '2% savings'],
    popular: true,
  },
  {
    id: '30d',
    name: 'Monthly',
    duration: '30 Days',
    price: 349,
    discount: 5,
    features: [
      'Unlimited rides',
      'VIP support',
      '5% savings',
      'Free cancellation 3x',
    ],
  },
];

const PLAN_ORDER: Record<string, number> = { '7d': 0, '15d': 1, '30d': 2 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin ${className}`}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SubscribePage() {
  const { user } = useApp();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [currentSub, setCurrentSub] = useState<Subscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan>(
    FALLBACK_PLANS.find((p) => p.popular) ?? FALLBACK_PLANS[1]
  );
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [activatedPlan, setActivatedPlan] = useState<Plan | null>(null);

  // ── Fetch plans + current subscription ────────────────────────────────────

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError('');
      try {
        const [fetchedPlans, sub] = await Promise.allSettled([
          api.get<Plan[]>('/subscriptions/plans'),
          api.get<Subscription | null>('/subscriptions/my'),
        ]);

        if (fetchedPlans.status === 'fulfilled' && Array.isArray(fetchedPlans.value) && fetchedPlans.value.length > 0) {
          setPlans(fetchedPlans.value);
          const popular = fetchedPlans.value.find((p) => p.popular) ?? fetchedPlans.value[1] ?? fetchedPlans.value[0];
          setSelectedPlan(popular);
        }

        if (sub.status === 'fulfilled') {
          setCurrentSub(sub.value);
        }
      } catch {
        // silently fall back to hardcoded plans
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // ── Payment handler ────────────────────────────────────────────────────────

  const handleSubscribe = async () => {
    setError('');
    setPayLoading(true);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error('Failed to load payment gateway. Please check your internet connection.');
      }

      const orderData = await api.post<OrderData>('/payments/create-order', {
        payment_type: 'subscription',
        reference_id: selectedPlan.id,
        amount: selectedPlan.price,
      });

      await new Promise<void>((resolve, reject) => {
        // Track genuine payment failures so ondismiss shows the right error
        let failedMsg = '';

        const rzp = new (window as any).Razorpay({
          key: orderData.key_id,
          amount: orderData.amount * 100,   // INR → paise for display
          currency: orderData.currency,
          name: 'BuddyRide',
          description: `${selectedPlan.name} Subscription`,
          order_id: orderData.order_id,

          // ── Success handler ──────────────────────────────────────────────
          handler: async (response: any) => {
            try {
              // Step 1: verify signature with backend
              await api.post('/payments/verify', {
                order_id:   orderData.order_id,
                payment_id: response.razorpay_payment_id,
                signature:  response.razorpay_signature,
              });

              // Step 2: activate — upgrade endpoint if already subscribed
              const subEndpoint = isUpgrade ? '/subscriptions/upgrade' : '/subscriptions';
              await api.post(subEndpoint, {
                plan_type:  selectedPlan.id,
                payment_id: response.razorpay_payment_id,  // verified by backend before activating
              });

              setActivatedPlan(selectedPlan);
              setSuccess(true);
              resolve();
            } catch (err: any) {
              reject(new Error(err?.message ?? 'Payment verification failed. Please contact support.'));
            }
          },

          modal: {
            ondismiss: () => {
              // If a payment.failed event fired before dismiss, surface that error
              reject(new Error(failedMsg || 'DISMISSED'));
            },
          },

          prefill: {
            name:    user?.name  ?? '',
            contact: user?.phone ?? '',
          },
          theme: { color: '#FF7D00' },
        });

        // ── Genuine payment failure (network / card decline / etc.) ────────
        rzp.on('payment.failed', (response: any) => {
          failedMsg =
            response?.error?.description ??
            response?.error?.reason ??
            'Payment failed. Please try a different payment method.';
        });

        rzp.open();
      });
    } catch (err: any) {
      if (err?.message !== 'DISMISSED') {
        setError(err?.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setPayLoading(false);
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────

  const isUpgrade =
    currentSub &&
    (PLAN_ORDER[selectedPlan.id] ?? 0) > (PLAN_ORDER[currentSub.plan_type] ?? 0);

  const discountAmount =
    selectedPlan.discount > 0
      ? Math.round(selectedPlan.price * (selectedPlan.discount / 100))
      : 0;

  const originalPrice =
    discountAmount > 0 ? selectedPlan.price + discountAmount : selectedPlan.price;

  // ── Spring transition ──────────────────────────────────────────────────────

  const spring = { type: 'spring' as const, stiffness: 300, damping: 25 };

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-bg pt-20 pb-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-8 h-8 text-primary" />
          <p className="text-muted text-sm">Loading plans...</p>
        </div>
      </div>
    );
  }

  // ── Success overlay ────────────────────────────────────────────────────────

  if (success && activatedPlan) {
    return (
      <div className="min-h-screen bg-bg pt-20 pb-12 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring}
          className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-10 max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...spring, delay: 0.15 }}
            className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-10 h-10 text-green-400" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="font-syne font-bold text-2xl text-text-light mb-2"
          >
            Subscription Activated!
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="text-muted mb-1"
          >
            You are now on the{' '}
            <span className="text-primary font-semibold">{activatedPlan.name}</span> plan
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            className="text-muted text-sm mb-8"
          >
            {activatedPlan.duration} &middot; ₹{activatedPlan.price}
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.44 }}
            onClick={() => navigate('/dashboard')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="bg-primary text-text-dark font-semibold rounded-xl px-8 py-3 hover:shadow-lg hover:shadow-primary/25 inline-flex items-center gap-2"
          >
            Start Riding
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-bg pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4">

        {/* ── Back button ── */}
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={spring}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted hover:text-text-light text-sm mb-8 group transition-colors"
        >
          <span className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center group-hover:bg-white/[0.08] group-hover:border-white/[0.14] transition-all">
            <ArrowLeft className="w-4 h-4" />
          </span>
          Back
        </motion.button>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="text-center mb-10"
        >
          <h1 className="font-syne font-bold text-3xl md:text-4xl text-text-light mb-3">
            Choose Your Plan
          </h1>
          <p className="text-muted max-w-xl mx-auto text-sm">
            Save more with longer subscriptions. All plans include our core ride-sharing features.
          </p>
        </motion.div>

        {/* ── Active subscription banner ── */}
        <AnimatePresence>
          {currentSub && (
            <motion.div
              key="active-sub-banner"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={spring}
              className="mb-8 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              style={{
                background: 'linear-gradient(135deg, rgba(21,97,109,0.35) 0%, rgba(21,150,130,0.20) 100%)',
                border: '1px solid rgba(21,97,109,0.55)',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-teal/25 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-teal" />
                </div>
                <div>
                  <p className="text-text-light font-semibold text-sm">
                    Active plan:{' '}
                    <span className="text-primary capitalize">{currentSub.plan_type}</span>
                  </p>
                  <p className="text-muted text-xs mt-0.5">
                    Expires {formatDate(currentSub.ends_at)}
                  </p>
                </div>
              </div>
              {isUpgrade && (
                <button
                  onClick={() => {
                    const el = document.getElementById('order-summary');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-primary text-sm font-semibold border border-primary/40 rounded-xl px-4 py-2 hover:bg-primary/10 transition-colors flex-shrink-0"
                >
                  Upgrade Plan
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Plan cards grid ── */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {plans.map((plan, index) => {
            const isSelected = selectedPlan.id === plan.id;
            const planDiscount =
              plan.discount > 0 ? Math.round(plan.price * (plan.discount / 100)) : 0;
            const planOriginal = planDiscount > 0 ? plan.price + planDiscount : plan.price;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: index * 0.08 }}
                whileHover={{
                  y: -4,
                  boxShadow: '0 20px 40px rgba(255,125,0,0.10)',
                }}
                onClick={() => setSelectedPlan(plan)}
                className={`relative cursor-pointer rounded-2xl p-6 transition-all select-none ${
                  isSelected
                    ? 'border border-primary/60 bg-primary/5 ring-1 ring-primary/40'
                    : 'bg-white/[0.03] border border-white/[0.08]'
                }`}
                style={isSelected ? { transform: 'scale(1.02)' } : {}}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-primary text-text-dark text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                      <Star className="w-3 h-3" />
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Discount badge */}
                {plan.discount > 0 && (
                  <div className="absolute top-4 right-4">
                    <span className="bg-teal/20 text-teal text-xs font-medium px-2 py-1 rounded-lg border border-teal/30">
                      -{plan.discount}%
                    </span>
                  </div>
                )}

                {/* Plan name + duration */}
                <div className={`text-center mb-5 ${plan.popular ? 'pt-3' : ''}`}>
                  <h3 className="font-syne font-semibold text-xl text-text-light mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-muted text-sm">{plan.duration}</p>
                </div>

                {/* Price */}
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-primary font-mono">
                      ₹{plan.price}
                    </span>
                  </div>
                  {planOriginal > plan.price && (
                    <p className="text-muted text-sm line-through mt-1">
                      ₹{planOriginal}
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-text-light">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Select indicator */}
                <div
                  className={`w-full py-2.5 rounded-xl text-center text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-primary text-text-dark'
                      : 'bg-white/5 text-muted border border-white/10'
                  }`}
                >
                  {isSelected ? 'Selected' : 'Select Plan'}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Error banner ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="error-banner"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={spring}
              className="max-w-sm mx-auto mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-300 text-sm">{error}</p>
                <button
                  onClick={() => setError('')}
                  className="mt-2 text-red-400 text-xs flex items-center gap-1 hover:text-red-300 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Order summary ── */}
        <motion.div
          id="order-summary"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.25 }}
          className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 max-w-sm mx-auto"
        >
          <h3 className="font-syne font-semibold text-lg text-text-light mb-5">
            Order Summary
          </h3>

          {/* Line items */}
          <div className="space-y-3 mb-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={`plan-${selectedPlan.id}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={spring}
                className="flex justify-between text-text-light text-sm"
              >
                <span>
                  {selectedPlan.name} Plan
                  <span className="text-muted ml-1">({selectedPlan.duration})</span>
                </span>
                <span className="font-mono text-muted">₹{originalPrice}</span>
              </motion.div>
            </AnimatePresence>

            {discountAmount > 0 && (
              <AnimatePresence>
                <motion.div
                  key={`discount-${selectedPlan.id}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={spring}
                  className="flex justify-between text-sm"
                >
                  <span className="text-green-400">
                    Subscription Discount ({selectedPlan.discount}%)
                  </span>
                  <span className="font-mono text-green-400">-₹{discountAmount}</span>
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Divider + total */}
          <div className="border-t border-white/[0.08] pt-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-text-light font-medium">Total</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={`total-${selectedPlan.id}`}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={spring}
                  className="font-bold text-2xl text-primary font-mono"
                >
                  ₹{selectedPlan.price}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>

          {/* Pay button */}
          <motion.button
            onClick={handleSubscribe}
            disabled={payLoading}
            whileHover={payLoading ? {} : { scale: 1.02, boxShadow: '0 0 32px rgba(255,125,0,0.25)' }}
            whileTap={payLoading ? {} : { scale: 0.98 }}
            transition={spring}
            className="bg-primary text-text-dark font-semibold rounded-xl w-full py-4 flex items-center justify-center gap-2 text-base hover:shadow-lg hover:shadow-primary/25 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {payLoading ? (
              <>
                <Spinner className="border-text-dark/60" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Pay ₹{selectedPlan.price}
              </>
            )}
          </motion.button>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-5 mt-5">
            <div className="flex items-center gap-1.5 text-muted text-xs">
              <Lock className="w-3.5 h-3.5" />
              Secure
            </div>
            <div className="flex items-center gap-1.5 text-muted text-xs">
              <Zap className="w-3.5 h-3.5" />
              Instant Activation
            </div>
            <div className="flex items-center gap-1.5 text-muted text-xs">
              <Check className="w-3.5 h-3.5" />
              Verified
            </div>
          </div>

          {/* Razorpay branding */}
          <p className="text-center text-muted/60 text-xs mt-4">
            Powered by{' '}
            <span className="text-muted font-medium">Razorpay</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
