
import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import VanillaTilt, { type TiltOptions } from "vanilla-tilt";

type TiltElement = HTMLElement & {
  vanillaTilt?: { destroy: () => void };
};

const DEFAULT_OPTIONS: TiltOptions = {
  max: 8,
  speed: 200,
  perspective: 1400,
  scale: 1,
  glare: false,
  gyroscope: false,
  transition: true,
  reset: true,
  easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
};

export function useVanillaTilt<T extends HTMLElement>(
  options?: Partial<TiltOptions>,
  enabled = true
) {
  const ref = useRef<T>(null);
  const prefersReducedMotion = useReducedMotion();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const el = ref.current as TiltElement | null;
    if (!el || prefersReducedMotion || !enabled) return;

    VanillaTilt.init(el, { ...DEFAULT_OPTIONS, ...optionsRef.current });

    return () => {
      el.vanillaTilt?.destroy();
    };
  }, [enabled, prefersReducedMotion]);

  return ref;
}
