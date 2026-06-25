
import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type CircularTextProps = {
  text: string;
  diameter?: number;
  fontSize?: number;
  letterSpacing?: number;
  durationSeconds?: number;
  reverse?: boolean;
  className?: string;
  textClassName?: string;
};

export function CircularText({
  text,
  diameter = 240,
  fontSize = 18,
  letterSpacing = 0.18,
  durationSeconds = 22,
  reverse = false,
  className,
  textClassName,
}: CircularTextProps) {
  const prefersReducedMotion = useReducedMotion();
  const pathId = useId();

  const radius = diameter / 2;
  const pathRadius = radius - fontSize;

  // Circle traced counter-clockwise from top so text reads left-to-right.
  const circlePath = [
    `M ${radius},${radius - pathRadius}`,
    `a ${pathRadius},${pathRadius} 0 1,1 0,${pathRadius * 2}`,
    `a ${pathRadius},${pathRadius} 0 1,1 0,${-pathRadius * 2}`,
  ].join(" ");

  const rotateTo = reverse ? -360 : 360;

  return (
    <motion.div
      aria-hidden
      className={cn("pointer-events-none select-none", className)}
      animate={prefersReducedMotion ? undefined : { rotate: rotateTo }}
      transition={
        prefersReducedMotion
          ? undefined
          : {
              duration: durationSeconds,
              repeat: Infinity,
              ease: "linear",
            }
      }
    >
      <svg
        viewBox={`0 0 ${diameter} ${diameter}`}
        className="block size-full"
        fill="none"
      >
        <defs>
          <path id={pathId} d={circlePath} />
        </defs>
        <text
          className={cn("fill-current", textClassName)}
          fontSize={fontSize}
          letterSpacing={`${letterSpacing}em`}
          style={{ textTransform: "uppercase" }}
        >
          <textPath href={`#${pathId}`} startOffset="0%">
            {text}
          </textPath>
        </text>
      </svg>
    </motion.div>
  );
}
