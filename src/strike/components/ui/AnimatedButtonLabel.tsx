
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

const EASING = [0.25, 0.1, 0.25, 1] as const;

type LetterMeta = {
  y: number;
  scale: number;
  rotate: number;
  opacity: number;
  delay: number;
};

function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function buildLetterMeta(text: string): LetterMeta[] {
  return text.split("").map((char, i) => {
    if (char === " ") {
      return { y: 0, scale: 1, rotate: 0, opacity: 1, delay: 0 };
    }
    const r1 = pseudoRand(i + 1);
    const r2 = pseudoRand(i + 11);
    const r3 = pseudoRand(i + 23);
    const r4 = pseudoRand(i + 37);
    const r5 = pseudoRand(i + 53);
    return {
      y: -(1 + r1 * 3),
      scale: 1.2 + r5 * 0.25,
      rotate: (r2 - 0.5) * 24,
      opacity: 0.7 + r3 * 0.22,
      delay: r4 * 0.08,
    };
  });
}

const buildVariants = (restWeight: number, hoverWeight: number): Variants => ({
  rest: {
    y: 0,
    scale: 1,
    rotate: 0,
    opacity: 1,
    fontWeight: restWeight,
    transition: { duration: 0.25, ease: EASING },
  },
  active: (meta: LetterMeta) => ({
    y: [0, meta.y, 0],
    scale: [1, meta.scale, 1],
    rotate: [0, meta.rotate, 0],
    opacity: [1, meta.opacity, 1],
    fontWeight: [restWeight, hoverWeight, restWeight],
    transition: {
      delay: meta.delay,
      duration: 0.55,
      ease: EASING,
      times: [0, 0.45, 1],
    },
  }),
});

type AnimatedButtonLabelProps = {
  children: string;
  className?: string;
  active?: boolean;
  /** [restWeight, hoverWeight] — defaults to [500, 700]. Pass [400, 700] for outline variant. */
  weightRange?: [number, number];
};

export function AnimatedButtonLabel({
  children,
  className,
  active = false,
  weightRange = [500, 700],
}: AnimatedButtonLabelProps) {
  const prefersReducedMotion = useReducedMotion();
  const letters = useMemo(() => children.split(""), [children]);
  const letterMeta = useMemo(() => buildLetterMeta(children), [children]);
  const [canAnimate, setCanAnimate] = useState(false);

  useEffect(() => {
    setCanAnimate(
      prefersReducedMotion !== true &&
        window.matchMedia("(pointer: fine)").matches
    );
  }, [prefersReducedMotion]);

  const [restWeight, hoverWeight] = weightRange;
  const variants = useMemo(
    () => buildVariants(restWeight, hoverWeight),
    [restWeight, hoverWeight]
  );

  const shouldAnimate = canAnimate && active;

  return (
    <span
      className={cn("relative inline-flex items-center justify-center", className)}
    >
      <span
        className="invisible whitespace-pre"
        aria-hidden="true"
        style={{ fontWeight: hoverWeight }}
      >
        {children}
      </span>
      <span
        className="absolute inset-0 flex items-center justify-center whitespace-pre"
        aria-hidden="true"
      >
        {letters.map((char, i) => (
          <motion.span
            key={i}
            className="inline-block"
            custom={letterMeta[i]}
            initial={false}
            animate={shouldAnimate ? "active" : "rest"}
            variants={canAnimate ? variants : undefined}
            style={{
              willChange: shouldAnimate
                ? "transform, font-weight, opacity"
                : undefined,
              fontWeight: canAnimate ? undefined : restWeight,
              transformOrigin: "50% 60%",
            }}
          >
            {char}
          </motion.span>
        ))}
      </span>
      <span className="sr-only">{children}</span>
    </span>
  );
}
