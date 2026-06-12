import React from "react";
import { motion } from "framer-motion";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

const baseClass =
  "bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl";

export default function GlassCard({
  children,
  className = "",
  hover = false,
}: GlassCardProps) {
  const combinedClass = [baseClass, className].filter(Boolean).join(" ");

  if (hover) {
    return (
      <motion.div
        className={combinedClass}
        whileHover={{
          scale: 1.02,
          boxShadow: "0 20px 60px rgba(255,125,0,0.1)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={combinedClass}>{children}</div>;
}
