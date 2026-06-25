
import { useEffect } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";

/**
 * White overlay that fills the viewport from bottom-center via an expanding
 * `clip-path: circle()`, driven by the scroll position of `#how-it-works`.
 *
 * Z-stack:
 *   navbar (z-50)
 *   main / HowItWorks / Pricing / CTA / Footer (z-20)  ← stays visible above overlay
 *   THIS OVERLAY (z-15)                                 ← covers everything below
 *   Hero + Features content (z-10)
 *   Sticky background image (z-(-10))
 *
 * Effect: as the user approaches HowItWorks, the white "water level" rises
 * from the middle-bottom of the viewport, swallowing the background image
 * and any leftover Features content. HowItWorks (and everything after it
 * in `<main>`) stays visible on top because main has a higher z-index.
 */
const TARGET_ID = "how-it-works";
/**
 * Progress 0 when HowItWorks's top sits at this fraction of viewport height.
 * `1.0` = top of HowItWorks just touches the viewport bottom — i.e. the user
 * has scrolled past Features and HowItWorks is just about to enter view.
 * The fill stays invisible during Hero and Features.
 */
const PROGRESS_START_VH = 1.0;
/**
 * Progress 1 when HowItWorks's top sits at this fraction of viewport height.
 * `0.3` = HowItWorks fills the bottom 70% of viewport — fill is complete
 * before the user is fully reading the section.
 */
const PROGRESS_END_VH = 0.3;
/** Final clip-path radius (% of element diagonal). 150% safely covers any aspect ratio. */
const MAX_RADIUS = 150;

export function BgFillOverlay() {
  const prefersReducedMotion = useReducedMotion();
  const progress = useMotionValue(0);
  const smoothProgress = useSpring(progress, {
    stiffness: 220,
    damping: 32,
    mass: 0.6,
  });
  const radius = useTransform(smoothProgress, [0, 1], [0, MAX_RADIUS]);
  const clipPath = useMotionTemplate`circle(${radius}% at 50% 100%)`;

  useEffect(() => {
    if (prefersReducedMotion) return;

    let rafId = 0;

    const update = () => {
      const el = document.getElementById(TARGET_ID);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const startTop = PROGRESS_START_VH * vh;
      const endTop = PROGRESS_END_VH * vh;
      const range = startTop - endTop;
      if (range <= 0) return;
      const raw = (startTop - rect.top) / range;
      progress.set(Math.max(0, Math.min(1, raw)));
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        update();
        rafId = 0;
      });
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [progress, prefersReducedMotion]);

  if (prefersReducedMotion) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[15] bg-white"
      style={{ clipPath, willChange: "clip-path" }}
    />
  );
}
