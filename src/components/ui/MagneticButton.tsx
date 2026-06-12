import React, { useRef, useCallback } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  MotionValue,
} from "framer-motion";

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

const springConfig = { type: "spring" as const, stiffness: 150, damping: 15 };

export default function MagneticButton({
  children,
  className = "",
  onClick,
  type = "button",
  disabled = false,
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const x = useSpring(rawX, springConfig) as MotionValue<number>;
  const y = useSpring(rawY, springConfig) as MotionValue<number>;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const maxShift = 8;
      const normX = deltaX / (rect.width / 2);
      const normY = deltaY / (rect.height / 2);
      rawX.set(normX * maxShift);
      rawY.set(normY * maxShift);
    },
    [disabled, rawX, rawY]
  );

  const handleMouseLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
  }, [rawX, rawY]);

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x, y }}
      className={className}
      whileTap={disabled ? {} : { scale: 0.96 }}
    >
      {children}
    </motion.button>
  );
}
