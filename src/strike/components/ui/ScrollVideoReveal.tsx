
import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";
import {
  INITIAL_ROTATE_X_DEG,
  INITIAL_SCALE,
  REVEAL_OFFSET,
  REVEAL_PERSPECTIVE_PX,
} from "@/components/animations/scrollVideoReveal";

type ScrollVideoRevealProps = {
  children: React.ReactNode;
  className?: string;
  targetRef?: React.RefObject<HTMLDivElement | null>;
};

export function ScrollVideoReveal({
  children,
  className,
  targetRef,
}: ScrollVideoRevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = (targetRef ?? internalRef) as React.RefObject<HTMLElement>;

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: REVEAL_OFFSET as unknown as ["start end", "center 65%"],
  });

  const rotateX = useTransform(
    scrollYProgress,
    [0, 1],
    [INITIAL_ROTATE_X_DEG, 0]
  );
  const scale = useTransform(
    scrollYProgress,
    [0, 1],
    [INITIAL_SCALE, 1]
  );

  if (prefersReducedMotion) {
    return <div className={cn("w-full", className)}>{children}</div>;
  }

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className={cn("w-full", className)}
      style={{ perspective: `${REVEAL_PERSPECTIVE_PX}px` }}
    >
      <motion.div
        style={{
          rotateX,
          scale,
          transformOrigin: "50% 100%",
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
