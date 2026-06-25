
import { forwardRef } from "react";
import Image from "next/image";

type Props = {
  /** Image 1 — base robot hands (bottom layer) */
  baseImage: string;
  /** Image 2 — effect art revealed under the cursor (middle reveal layer). Falls back to a placeholder glow. */
  effectImage?: string;
  /** Image 3 — second effect art revealed under the cursor, stacked on top of image 2. */
  effectImage2?: string;
  /** Reveal circle radius in px (250 => 500px circle) */
  radius?: number;
  /** Solid core fraction (0..1) before the feather fades out — lower = softer/more feather */
  feather?: number;
  /** Glowing ring around the reveal circle ("viền sáng") */
  glow?: boolean;
};

/**
 * Cursor-driven spotlight reveal: image 2 sits on top of image 1, hidden behind a
 * radial-gradient mask; the mask window follows the cursor (`--mx`/`--my`) and fades
 * in via `--reveal`. Those CSS vars are set by the parent section's pointer handlers.
 */
export const HeroSpotlightHands = forwardRef<HTMLDivElement, Props>(
  function HeroSpotlightHands(
    {
      baseImage,
      effectImage,
      effectImage2,
      radius = 250,
      feather = 0.25,
      glow = false,
    },
    ref,
  ) {
    const solid = Math.round(feather * 100);
    const mask = `radial-gradient(circle ${radius}px at var(--mx) var(--my), #000 0%, #000 ${solid}%, transparent 100%)`;

    return (
      <div
        ref={ref}
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 z-0 hidden -translate-x-1/2 md:block"
        style={
          {
            width: 1200,
            height: 1045,
            opacity: 1,
            "--mx": "600px",
            "--my": "522px",
            "--reveal": "0",
          } as React.CSSProperties
        }
      >
        {/* Image 1 — base robot hands */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-center">
          <Image
            src={baseImage}
            alt=""
            width={760}
            height={836}
            priority
            draggable={false}
            className="h-[clamp(462px,66vw,935px)] w-auto select-none object-contain"
          />
        </div>

        {/* Image 3 — effect, masked cursor reveal (middle layer, no blend) */}
        {effectImage2 && (
          <div
            className="absolute inset-0"
            style={
              {
                opacity: "var(--reveal)",
                transition: "opacity 0.4s ease",
                WebkitMaskImage: mask,
                maskImage: mask,
              } as React.CSSProperties
            }
          >
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-center">
              <Image
                src={effectImage2}
                alt=""
                width={740}
                height={740}
                draggable={false}
                className="h-[clamp(462px,66vw,935px)] w-auto select-none object-contain"
              />
            </div>
          </div>
        )}

        {/* Image 2 — effect, masked cursor reveal (top layer) */}
        <div
          className="absolute inset-0"
          style={
            {
              opacity: "var(--reveal)",
              transition: "opacity 0.4s ease",
              WebkitMaskImage: mask,
              maskImage: mask,
            } as React.CSSProperties
          }
        >
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-center">
            {effectImage ? (
              <Image
                src={effectImage}
                alt=""
                width={740}
                height={740}
                draggable={false}
                className="h-[clamp(462px,66vw,935px)] w-auto select-none object-contain"
              />
            ) : (
              // Placeholder until image 2 (the real effect art) is ready
              <div
                className="h-[clamp(360px,53vw,760px)] w-[clamp(360px,53vw,760px)] rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 50% 60%, #7df9ff 0%, #4d7cff 35%, #b14dff 70%, transparent 100%)",
                }}
              />
            )}
          </div>
        </div>

        {/* "Viền sáng" — optional glowing ring around the reveal circle */}
        {glow && (
          <div
            className="absolute rounded-full"
            style={
              {
                left: "var(--mx)",
                top: "var(--my)",
                width: radius * 2,
                height: radius * 2,
                transform: "translate(-50%, -50%)",
                opacity: "var(--reveal)",
                transition: "opacity 0.4s ease",
                boxShadow:
                  "0 0 60px 6px rgba(125,249,255,0.45), inset 0 0 40px rgba(125,249,255,0.25)",
              } as React.CSSProperties
            }
          />
        )}
      </div>
    );
  },
);
