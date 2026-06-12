import React from "react";
import { motion } from "framer-motion";

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
}

export default function GradientText({ children, className = "" }: GradientTextProps) {
  return (
    <motion.span
      className={className}
      style={{
        backgroundImage:
          "linear-gradient(90deg, #FF7D00, #FFB347, #FF7D00, #FFB347, #FF7D00)",
        backgroundSize: "300% 100%",
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        color: "transparent",
        WebkitTextFillColor: "transparent",
        display: "inline-block",
      }}
      animate={{
        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
      }}
      transition={{
        duration: 5,
        ease: "linear",
        repeat: Infinity,
      }}
    >
      {children}
    </motion.span>
  );
}
