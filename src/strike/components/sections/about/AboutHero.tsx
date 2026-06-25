
import { useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ABOUT_HERO } from "@/lib/constants";
import { BRAND_SOCIAL_ICONS } from "@/lib/socialLinks";
import { fadeUp } from "@/components/animations/fadeUp";
import { staggerContainer } from "@/components/animations/stagger";
import { StarBorderLayer } from "@/components/ui/StarBorder";
import { cn } from "@/lib/utils";
import { HeroSpotlightHands } from "./HeroSpotlightHands";

const darkGradient =
  "linear-gradient(131deg, rgb(51, 51, 51) 0.79%, rgb(13, 13, 13) 35.22%, rgb(38, 38, 38) 99.16%)";

const tapEase = [0.25, 0.1, 0.25, 1] as const;

const XIcon = BRAND_SOCIAL_ICONS.X;

const SOCIAL_ICONS = BRAND_SOCIAL_ICONS;

export function AboutHero() {
  const prefersReducedMotion = useReducedMotion();
  const [followHovered, setFollowHovered] = useState(false);
  const spotlightRef = useRef<HTMLDivElement>(null);

  const followTap = prefersReducedMotion
    ? {}
    : { whileTap: { scale: 0.97 }, transition: { duration: 0.2, ease: tapEase } };

  // Rendered twice: inside the title column on desktop, after the description on
  // mobile (Figma order). `extraClassName` controls visibility / height / order.
  const followButton = (extraClassName: string) => (
    <motion.a
      href={ABOUT_HERO.followHref}
      onMouseEnter={() => setFollowHovered(true)}
      onMouseLeave={() => setFollowHovered(false)}
      className={cn(
        "relative cursor-pointer select-none items-center justify-center gap-1.5 overflow-hidden rounded-3xl px-[50px] text-sm font-medium text-[#e0e0e0]",
        extraClassName
      )}
      style={{
        background: darkGradient,
        boxShadow:
          "inset 0 2px 4px rgba(0,0,0,0.2), inset 0 -2px 4px rgba(255,255,255,0.2)",
      }}
      {...followTap}
    >
      {!prefersReducedMotion && (
        <>
          <StarBorderLayer
            color="rgba(255,255,255,0.95)"
            speed={followHovered ? "2s" : "5s"}
          />
          <span
            aria-hidden
            className="absolute z-[1] rounded-[inherit]"
            style={{ inset: 1.5, background: darkGradient }}
          />
        </>
      )}
      <span className="relative z-[2] flex items-center gap-2">
        {ABOUT_HERO.followLabel}
        <span className="flex size-4 items-center justify-center">{XIcon}</span>
      </span>
      <ArrowRight
        className="relative z-[2] h-[18px] w-[18px] shrink-0 text-white/80"
        strokeWidth={2}
      />
    </motion.a>
  );

  // Drive the spotlight reveal from the section so the cursor is tracked even when
  // it hovers the content layer (events bubble up to the section).
  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const zone = spotlightRef.current;
    if (!zone) return;
    const rect = zone.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const inside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
    zone.style.setProperty("--mx", `${x}px`);
    zone.style.setProperty("--my", `${y}px`);
    zone.style.setProperty("--reveal", inside ? "1" : "0");
  };

  const handlePointerLeave = () => {
    spotlightRef.current?.style.setProperty("--reveal", "0");
  };

  return (
    <section
      className="relative overflow-hidden px-3 md:px-12 cv-auto"
      aria-label="About StrikeRobot"
      onPointerMove={prefersReducedMotion ? undefined : handlePointerMove}
      onPointerLeave={prefersReducedMotion ? undefined : handlePointerLeave}
    >
      {/* Robot hands spotlight reveal — centered behind the columns on desktop */}
      <HeroSpotlightHands
        ref={spotlightRef}
        baseImage="/about/layer-1.png"
        effectImage="/about/layer-2.png"
        effectImage2="/about/layer-3-glow.png"
      />

      <motion.div
        className="relative z-10 mx-auto flex w-full flex-col pt-28 md:min-h-[1080px] md:pb-16 md:pt-36"
        variants={prefersReducedMotion ? {} : staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <div className="flex flex-1 flex-col items-center gap-8 md:flex-row md:items-center md:justify-between">
          {/* Title (+ desktop button) */}
          <motion.div
            variants={prefersReducedMotion ? {} : fadeUp}
            className="order-1 flex flex-col items-center md:items-start"
          >
            <h1 className="bg-gradient-to-r from-black to-[#314344] bg-clip-text text-center text-[clamp(56px,9vw,96px)] font-normal leading-[1.02] tracking-[-0.02em] text-transparent md:text-left">
              <span className="block">{ABOUT_HERO.titlePrefix}</span>
              <span className="block text-[clamp(52px,8.4vw,88px)]">
                {ABOUT_HERO.titleAccent}
              </span>
            </h1>

            <span
              aria-hidden
              className="mt-[72px] hidden h-1.5 w-11 rounded-[2px] bg-[#020202] md:block"
            />

            {followButton("mt-[84px] hidden h-11 md:flex")}
          </motion.div>

          {/* Description */}
          <motion.div
            variants={prefersReducedMotion ? {} : fadeUp}
            className="order-2 flex flex-col items-center text-center md:flex-row md:items-start md:gap-[26px] md:pt-2 md:text-left"
          >
            {/* Decorative left marker — desktop only; mt nudges the line onto the first text row */}
            <svg
              aria-hidden
              width="103"
              height="17"
              viewBox="0 0 103 17"
              fill="none"
              className="hidden shrink-0 md:mt-[15px] md:block"
            >
              <path d="M0 8.26514H96" stroke="black" strokeOpacity="0.2" />
              <path d="M92 16.2651L102 0.265137" stroke="black" strokeOpacity="0.2" />
            </svg>
            <p className="text-[20px] leading-[30px] tracking-[-0.4px] text-black md:max-w-[420px] md:text-[32px] md:leading-[48px] md:tracking-[-0.64px]">
              {ABOUT_HERO.description}
            </p>
          </motion.div>

          {/* Mobile follow button — after the description per Figma */}
          {followButton("order-3 flex h-[52px] md:hidden")}

          {/* Mobile hands image */}
          <div
            aria-hidden
            className="order-4 flex justify-center md:hidden"
          >
            <Image
              src={ABOUT_HERO.image}
              alt=""
              width={760}
              height={836}
              className="h-auto w-[min(360px,78vw)] select-none object-contain"
              draggable={false}
            />
          </div>
        </div>

        {/* Social links */}
        <motion.div
          variants={prefersReducedMotion ? {} : fadeUp}
          className="mt-12 md:flex hidden items-center gap-3 opacity-60 md:mt-0"
          role="list"
          aria-label="Social links"
        >
          {ABOUT_HERO.socials.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              role="listitem"
              aria-label={label}
              className="flex size-9 items-center justify-center rounded-[10px] bg-black/[0.06] text-[#3e424d] transition-colors duration-200 hover:bg-black/[0.1]"
            >
              {SOCIAL_ICONS[label]}
            </a>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
