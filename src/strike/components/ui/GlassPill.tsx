import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Iridescent conic border — matches desktop nav + Figma mobile header pill. */
export const METALLIC_BORDER_BG =
  "linear-gradient(from 0deg at 50% 50%, #D9D9D9 0deg, #D9D9D9 65deg, #F2F2F2 150deg, #DFD0EA 176deg, #D9D9D9 204deg, #D9D9D9 255deg, #A6CEDA 285deg, #ECECEC 319deg, #D9D9D9 360deg)";

export const PILL_BAR_BG =
  "linear-gradient(95deg, rgba(255,255,255,0.80) 4.23%, rgba(255,255,255,0.40) 56%, rgba(223,227,229,0.50) 99.91%)";

export const PILL_BAR_SHADOW =
  "inset 0 4px 6px 0 rgba(255,255,255,0.20), inset 0 -2px 4px 0 rgba(255,255,255,0.30)";

export const GPU_LAYER = "translateZ(0)";

const PILL_GLASS: CSSProperties = {
  background: PILL_BAR_BG,
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  boxShadow: PILL_BAR_SHADOW,
  transform: GPU_LAYER,
  willChange: "backdrop-filter",
};

type GlassPillProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  /** Outer radius in px — default 12 (mobile header). */
  radius?: number;
};

export function GlassPill({
  children,
  className,
  innerClassName,
  radius = 12,
}: GlassPillProps) {
  const innerRadius = radius - 1.4;

  return (
    <div
      className={cn("p-[1.4px]", className)}
      style={{
        borderRadius: radius,
        background: METALLIC_BORDER_BG,
      }}
    >
      <div
        className={innerClassName}
        style={{
          ...PILL_GLASS,
          borderRadius: innerRadius,
        }}
      >
        {children}
      </div>
    </div>
  );
}
