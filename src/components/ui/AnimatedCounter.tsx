import { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useInView,
  useTransform,
} from "framer-motion";

interface AnimatedCounterProps {
  value: string;
  className?: string;
}

function parseValue(raw: string): { numeric: number; suffix: string; prefix: string } {
  const match = raw.match(/^([^0-9]*)([0-9]+(?:\.[0-9]+)?)([^0-9]*)$/);
  if (!match) {
    return { numeric: 0, suffix: raw, prefix: "" };
  }
  return {
    prefix: match[1] ?? "",
    numeric: parseFloat(match[2] ?? "0"),
    suffix: match[3] ?? "",
  };
}

export default function AnimatedCounter({ value, className = "" }: AnimatedCounterProps) {
  const { numeric, suffix, prefix } = parseValue(value);

  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    stiffness: 60,
    damping: 20,
    mass: 1,
  });

  const displayValue = useTransform(springValue, (latest) => {
    const rounded =
      numeric % 1 !== 0
        ? Math.round(latest * 10) / 10
        : Math.round(latest);
    return `${prefix}${rounded}${suffix}`;
  });

  useEffect(() => {
    if (inView) {
      motionValue.set(numeric);
    }
  }, [inView, numeric, motionValue]);

  return (
    <motion.span ref={ref} className={className}>
      {displayValue}
    </motion.span>
  );
}
