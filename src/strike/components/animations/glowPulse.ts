import type { Variants, Transition } from "framer-motion";

export const glowPulse: Variants = {
  idle: {
    opacity: 0.5,
    scale: 1,
  },
  pulse: {
    opacity: [0.5, 0.9, 0.5],
    scale: [1, 1.05, 1],
  },
};

export const glowPulseTransition: Transition = {
  duration: 4,
  repeat: Infinity,
  ease: "easeInOut",
};

export const accentGlowPulse: Variants = {
  idle: {
    opacity: 0.4,
  },
  pulse: {
    opacity: [0.4, 0.8, 0.4],
  },
};

export const orb: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.5,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 1.2,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export const borderGlow: Variants = {
  idle: {
    borderColor: "rgba(108,99,255,0.12)",
  },
  hover: {
    borderColor: "rgba(108,99,255,0.4)",
    boxShadow: "0 0 20px rgba(108,99,255,0.12)",
    transition: { duration: 0.3 },
  },
};
