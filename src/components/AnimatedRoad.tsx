import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function AnimatedRoad() {
  const dotRef = useRef<SVGCircleElement>(null);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>();

  const pathLength = 1000;
  const duration = 5000; // 5 seconds for complete journey

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = (elapsed % duration) / duration;

      if (dotRef.current) {
        const position = progress * pathLength;
        dotRef.current.setAttribute('cx', String(position));
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-32 overflow-hidden">
      <svg
        viewBox="0 0 1000 100"
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        {/* Road layer */}
        <path
          d="M 0 50 Q 250 20, 500 50 T 1000 50"
          fill="none"
          stroke="#1C3B40"
          strokeWidth="40"
          strokeLinecap="round"
        />

        {/* Center dashed line */}
        <path
          d="M 0 50 Q 250 20, 500 50 T 1000 50"
          fill="none"
          stroke="#FF7D00"
          strokeWidth="3"
          strokeOpacity="0.6"
          strokeDasharray="24 24"
          className="animate-road-dash"
        />

        {/* Moving dot */}
        <circle
          ref={dotRef}
          cx="0"
          cy="50"
          r="10"
          fill="#FF7D00"
          style={{
            filter: 'drop-shadow(0 0 10px rgba(255,125,0,0.8)) drop-shadow(0 0 20px rgba(255,125,0,0.4))',
          }}
        />
      </svg>
    </div>
  );
}

export function FeatureRoad() {
  return (
    <div className="relative w-full h-20 overflow-hidden opacity-30">
      <svg
        viewBox="0 0 1200 60"
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <path
          d="M 0 30 L 1200 30"
          fill="none"
          stroke="#FF7D00"
          strokeWidth="2"
          strokeDasharray="8 8"
          className="animate-road-dash"
        />
      </svg>
    </div>
  );
}

export function HeroPhones() {
  return (
    <div className="relative w-full h-[500px] flex items-center justify-center">
      {/* Phone 1 - Left */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative"
      >
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10"
        >
          {/* Phone Frame */}
          <div className="w-[240px] h-[480px] bg-surface rounded-[40px] p-3 shadow-2xl border-4 border-teal/20">
            {/* Phone Screen */}
            <div className="w-full h-full bg-bg rounded-[32px] overflow-hidden">
              {/* Status Bar */}
              <div className="h-6 bg-teal flex items-center justify-center">
                <div className="w-16 h-4 bg-bg rounded-full" />
              </div>
              {/* App Content */}
              <div className="p-4 space-y-3">
                <div className="h-8 bg-teal/20 rounded-lg" />
                <div className="h-24 bg-primary/10 rounded-xl" />
                <div className="space-y-2">
                  <div className="h-3 bg-muted/20 rounded w-3/4" />
                  <div className="h-3 bg-muted/20 rounded w-1/2" />
                </div>
                <div className="h-10 bg-primary rounded-lg" />
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="h-20 bg-surface/10 rounded-lg" />
                  <div className="h-20 bg-surface/10 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        {/* Glow Effect */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 rounded-full blur-3xl"
        />
      </motion.div>

      {/* Phone 2 - Right */}
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="relative ml-8"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="relative z-10"
        >
          {/* Phone Frame */}
          <div className="w-[240px] h-[480px] bg-surface rounded-[40px] p-3 shadow-2xl border-4 border-primary/20">
            {/* Phone Screen */}
            <div className="w-full h-full bg-bg rounded-[32px] overflow-hidden">
              {/* Status Bar */}
              <div className="h-6 bg-primary flex items-center justify-center">
                <div className="w-16 h-4 bg-bg rounded-full" />
              </div>
              {/* App Content */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-surface rounded-full" />
                  <div className="space-y-1">
                    <div className="h-3 bg-surface/20 rounded w-20" />
                    <div className="h-2 bg-muted/20 rounded w-16" />
                  </div>
                </div>
                <div className="h-32 bg-teal/20 rounded-xl" />
                <div className="space-y-2">
                  <div className="h-3 bg-muted/20 rounded w-full" />
                  <div className="h-3 bg-muted/20 rounded w-2/3" />
                </div>
                <div className="flex gap-2 mt-2">
                  <div className="flex-1 h-8 bg-teal rounded-lg" />
                  <div className="flex-1 h-8 bg-primary rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        {/* Glow Effect */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-teal/20 rounded-full blur-3xl"
        />
      </motion.div>

      {/* Connection Line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, delay: 1 }}
        className="absolute top-1/2 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-primary via-primary to-teal origin-left"
      />
    </div>
  );
}
