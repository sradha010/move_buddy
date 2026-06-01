import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, CreditCard, Shield } from 'lucide-react';

type PlanType = '7d' | '15d' | '30d';

interface Plan {
  id: PlanType;
  name: string;
  duration: string;
  price: number;
  originalPrice: number;
  discount: number;
  features: string[];
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: '7d',
    name: 'Daily',
    duration: '7 Days',
    price: 99,
    originalPrice: 99,
    discount: 0,
    features: [
      '5 rides per day',
      'Basic matching',
      'Standard support',
    ],
  },
  {
    id: '15d',
    name: 'Weekly',
    duration: '15 Days',
    price: 189,
    originalPrice: 198,
    discount: 2,
    features: [
      'Unlimited rides',
      'Priority matching',
      'Premium support',
      '2% savings on all rides',
    ],
    popular: true,
  },
  {
    id: '30d',
    name: 'Monthly',
    duration: '30 Days',
    price: 349,
    originalPrice: 396,
    discount: 5,
    features: [
      'Unlimited rides',
      'Instant matching',
      'VIP support',
      '5% savings on all rides',
      'Exclusive route alerts',
      'Free cancellation (3x)',
    ],
  },
];

export default function SubscribePage() {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('15d');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = () => {
    setLoading(true);
    // Simulate payment
    setTimeout(() => {
      setLoading(false);
      alert('Payment successful! (This is a demo)');
    }, 2000);
  };

  const selected = plans.find(p => p.id === selectedPlan);

  return (
    <div className="min-h-screen bg-bg pt-20 pb-12">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="font-syne font-bold text-3xl md:text-4xl text-text-light mb-3">
            Choose Your Plan
          </h1>
          <p className="text-muted max-w-xl mx-auto">
            Save more with longer subscriptions. All plans include our core features.
          </p>
        </motion.div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative bg-surface rounded-2xl p-6 cursor-pointer transition-all ${
                selectedPlan === plan.id
                  ? 'ring-2 ring-primary shadow-xl shadow-primary/20'
                  : 'border border-teal/20 hover:border-teal/40'
              }`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-text-dark text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Discount Badge */}
              {plan.discount > 0 && (
                <div className="absolute top-4 right-4">
                  <span className="bg-teal text-text-light text-xs font-medium px-2 py-1 rounded-lg">
                    -{plan.discount}%
                  </span>
                </div>
              )}

              {/* Plan Info */}
              <div className="text-center mb-6 pt-2">
                <h3 className="font-syne font-semibold text-xl text-text-dark mb-1">
                  {plan.name}
                </h3>
                <p className="text-muted text-sm">{plan.duration}</p>
              </div>

              {/* Price */}
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-syne font-bold text-primary font-mono">
                    Rs {plan.price}
                  </span>
                </div>
                {plan.originalPrice > plan.price && (
                  <p className="text-muted text-sm line-through mt-1">
                    Rs {plan.originalPrice}
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-text-dark">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Select Indicator */}
              <div className={`w-full py-3 rounded-xl text-center text-sm font-medium transition-all ${
                selectedPlan === plan.id
                  ? 'bg-primary text-text-dark'
                  : 'bg-teal/10 text-teal'
              }`}>
                {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card max-w-md mx-auto"
        >
          <h3 className="font-syne font-semibold text-lg text-text-dark mb-4">
            Order Summary
          </h3>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-text-dark">
              <span>{selected?.name} Plan ({selected?.duration})</span>
              <span className="font-mono">Rs {selected?.price}</span>
            </div>
            {selected && selected.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Subscription Discount</span>
                <span>-{selected.discount}%</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-teal/20 mb-6">
            <div className="flex justify-between items-center">
              <span className="font-medium text-text-dark">Total</span>
              <span className="font-syne font-bold text-2xl text-primary font-mono">
                Rs {selected?.price}
              </span>
            </div>
          </div>

          {/* Subscribe Button */}
          <motion.button
            onClick={handleSubscribe}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary w-full flex items-center justify-center gap-2 py-4"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-text-dark border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Pay Rs {selected?.price}
              </>
            )}
          </motion.button>

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="flex items-center gap-1 text-muted text-xs">
              <Shield className="w-4 h-4" />
              Secure Payment
            </div>
            <div className="flex items-center gap-1 text-muted text-xs">
              <Check className="w-4 h-4" />
              Instant Activation
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
