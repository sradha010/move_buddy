import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Calculator, CreditCard, Car, Zap } from 'lucide-react';
import { HeroPhones } from '../components/AnimatedRoad';

const features = [
  {
    icon: Sparkles,
    title: 'Smart Matching',
    description: 'AI-powered algorithm matches you with the perfect ride buddy based on your route and schedule.',
  },
  {
    icon: Calculator,
    title: 'Live Expense Calc',
    description: 'Real-time fare calculation with transparent pricing and instant savings comparison.',
  },
  {
    icon: CreditCard,
    title: 'Flexible Plans',
    description: 'Choose from daily, weekly, or monthly subscription plans to maximize your savings.',
  },
];

const steps = [
  { icon: '🔍', title: 'Find a Ride', description: 'Enter your route and browse available rides' },
  { icon: '🤝', title: 'Match Buddy', description: 'Get matched with verified ride buddies' },
  { icon: '🚗', title: 'Ride Together', description: 'Share the journey and split costs' },
];

const stats = [
  { value: '10K+', label: 'Active Riders' },
  { value: '₹500', label: 'Avg. Monthly Savings' },
  { value: '4.9★', label: 'App Rating' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [headerScrolled, setHeaderScrolled] = useState(false);

  const featuresRef = useRef(null);
  const howItWorksRef = useRef<HTMLElement>(null);
  const roadPathRef = useRef<SVGPathElement>(null);
  const movingDotRef = useRef<SVGCircleElement>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const featuresInView = useInView(featuresRef, { once: true, margin: '-100px' });
  const howItWorksInView = useInView(howItWorksRef, { once: true, margin: '-100px' });

  // Header scroll shadow
  useEffect(() => {
    const onScroll = () => setHeaderScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Animated road dot
  useEffect(() => {
    const animate = (ts: number) => {
      if (startTimeRef.current === 0) startTimeRef.current = ts;
      const progress = ((ts - startTimeRef.current) % 5000) / 5000;
      if (roadPathRef.current && movingDotRef.current) {
        const len = roadPathRef.current.getTotalLength();
        const pt = roadPathRef.current.getPointAtLength(progress * len);
        movingDotRef.current.setAttribute('cx', String(pt.x));
        movingDotRef.current.setAttribute('cy', String(pt.y));
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(animFrameRef.current); };
  }, []);

  return (
    <div className="min-h-screen bg-bg">

      {/* ══════════════════════════════════════════════════════
          MINIMAL HEADER  (no full Navbar on landing page)
      ══════════════════════════════════════════════════════ */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          headerScrolled
            ? 'bg-[#0D1B1E]/90 backdrop-blur-md border-b border-teal/20 shadow-lg shadow-black/20'
            : 'bg-transparent'
        }`}
      >
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

            {/* Right: login */}
            <div className="flex items-center gap-3">
              <Link to="/auth/login" className="btn-primary text-sm py-2 px-5">
                Login / Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════════════════ */}
      <section className="min-h-screen flex items-center relative overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-bg via-bg to-teal/20 pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 12% 60%, rgba(255,125,0,0.07) 0%, transparent 45%), radial-gradient(circle at 88% 35%, rgba(21,97,109,0.12) 0%, transparent 45%)',
          }}
        />
        {/* Decorative dot grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, #7AA8AF 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 pt-20 pb-12 w-full">
          <div className="grid lg:grid-cols-2 gap-12 xl:gap-20 items-center">

            {/* ── Left: Text content ── */}
            <div className="text-center lg:text-left order-1">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-full px-4 py-2 mb-6"
              >
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-primary text-sm font-medium">Smart Ride-Sharing Platform</span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="font-syne font-bold text-5xl md:text-6xl xl:text-7xl text-text-light mb-5 leading-[1.08]"
              >
                Your Daily<br />Commute,<br />
                <span className="text-primary">Smarter.</span>
              </motion.h1>

              {/* Subheading */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-muted text-lg md:text-xl mb-8 max-w-md mx-auto lg:mx-0 leading-relaxed"
              >
                Share rides, split costs, and transform your daily journey into an affordable, eco-friendly experience.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12"
              >
                <Link to="/guest/find" className="btn-primary text-base">
                  Find a Ride
                </Link>
                <Link to="/host/offer" className="btn-outline text-base">
                  Offer a Ride
                </Link>
              </motion.div>

              {/* Stats row */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.45 }}
                className="flex flex-wrap gap-x-10 gap-y-4 justify-center lg:justify-start"
              >
                {stats.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                    className="text-center lg:text-left"
                  >
                    <p className="font-syne font-bold text-2xl text-primary">{s.value}</p>
                    <p className="text-muted text-xs mt-0.5">{s.label}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* ── Right: Phone mockups ── */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, delay: 0.25, ease: 'easeOut' }}
              className="order-2 relative flex items-center justify-center"
            >
              {/* Soft glow behind phones */}
              <div className="absolute inset-0 bg-gradient-radial from-primary/8 to-transparent rounded-full blur-3xl scale-110 pointer-events-none" />
              {/* Scale down phones on smaller screens to prevent overflow */}
              <div className="w-full transform scale-75 sm:scale-90 lg:scale-100 origin-center -my-12 sm:-my-6 lg:my-0">
                <HeroPhones />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted/50"
        >
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-px h-8 bg-gradient-to-b from-muted/40 to-transparent"
          />
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FEATURES SECTION
      ══════════════════════════════════════════════════════ */}
      <section ref={featuresRef} className="py-20 relative bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="font-syne font-bold text-3xl md:text-4xl text-gray-900">
              Simplify Your Daily Journey
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 40 }}
                animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 group hover:shadow-xl hover:shadow-primary/10 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-syne font-semibold text-xl text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════ */}
      <section ref={howItWorksRef} className="py-20 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent via-bg/50 to-bg pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={howItWorksInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="font-syne font-bold text-3xl md:text-4xl text-text-light mb-3">
              How It Works
            </h2>
            <p className="text-muted max-w-xl mx-auto">Simple, fast, and built for your daily routine.</p>
          </motion.div>

          {/* Animated road */}
          <div className="relative">
            <svg
              viewBox="-20 35 1060 95"
              className="w-full h-32 mb-8"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Road base — also used for getPointAtLength */}
              <path
                ref={roadPathRef}
                d="M 0 100 Q 200 60, 400 100 T 800 100 T 1000 100"
                fill="none"
                stroke="#1C3B40"
                strokeWidth="40"
                strokeLinecap="round"
              />
              {/* Dashed centre line */}
              <motion.path
                d="M 0 100 Q 200 60, 400 100 T 800 100 T 1000 100"
                fill="none"
                stroke="#FF7D00"
                strokeWidth="3"
                strokeOpacity="0.6"
                strokeDasharray="24 24"
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: -48 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              {/* Step markers */}
              {[150, 500, 850].map((cx, index) => (
                <g key={index}>
                  <circle cx={cx} cy={100} r="12" fill="#15616D" stroke="#FF7D00" strokeWidth="3" />
                  <text x={cx} y={104} textAnchor="middle" fill="#FF7D00" fontSize="10" fontWeight="bold">
                    {index + 1}
                  </text>
                </g>
              ))}
              {/* Moving dot — follows path curve */}
              <circle
                ref={movingDotRef}
                cx="0"
                cy="100"
                r="10"
                fill="#FF7D00"
                style={{
                  filter: 'drop-shadow(0 0 10px rgba(255,125,0,0.8)) drop-shadow(0 0 20px rgba(255,125,0,0.4))',
                }}
              />
            </svg>

            {/* Step cards */}
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              {steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={howItWorksInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className="text-center"
                >
                  <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">
                    {step.icon}
                  </div>
                  <h3 className="font-syne font-semibold text-lg text-text-light mb-2">{step.title}</h3>
                  <p className="text-muted text-sm">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CTA SECTION
      ══════════════════════════════════════════════════════ */}
      <section className="py-20 relative">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-r from-teal to-teal/80 rounded-3xl p-8 md:p-12 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-28 h-28 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <h2 className="font-syne font-bold text-2xl md:text-3xl text-text-light mb-4 relative z-10">
              Ready to Transform Your Commute?
            </h2>
            <p className="text-text-light/80 mb-8 relative z-10">
              Join thousands of riders saving money and reducing their carbon footprint.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
              <Link to="/auth/login" className="btn-primary">Get Started Free</Link>
              <Link
                to="/guest/find"
                className="btn-outline !border-text-light !text-text-light hover:!bg-text-light/10"
              >
                Browse Rides
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════ */}
      <footer className="bg-teal py-8 border-t border-teal/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <Car className="w-3.5 h-3.5 text-text-dark" />
              </div>
              <span className="font-syne font-bold text-xl text-text-light">BuddyRide</span>
            </div>
            <div className="flex gap-6 text-sm text-text-light/70">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
              <a href="#" className="hover:text-primary transition-colors">Contact</a>
            </div>
            <p className="text-sm text-text-light/50">&copy; 2026 BuddyRide. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
