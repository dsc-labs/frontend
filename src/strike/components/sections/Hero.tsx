
import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import Image from "next/image";
import { HERO, VIDEOS } from "@/lib/constants";
import { PillButton } from "@/components/ui/PillButton";
import { AutoplayVideo } from "@/components/ui/AutoplayVideo";
import { ScrollVideoReveal } from "@/components/ui/ScrollVideoReveal";
import { fadeUp } from "@/components/animations/fadeUp";
import { staggerContainer } from "@/components/animations/stagger";
import { REVEAL_OFFSET } from "@/components/animations/scrollVideoReveal";

function PlatformIcon() {
  return (
    <span className="relative flex size-10 shrink-0 items-center justify-center">
      <Image
        src="/create-with-sr-icon.svg"
        alt=""
        aria-hidden="true"
        width={40}
        height={40}
        className="size-10 select-none"
        draggable={false}
      />
    </span>
  );
}

function BadgeSparkIcon({ color }: { color: string }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M10 5.00278L7.8387 6.09401C6.32897 6.95966 5.73014 8.5065 5.00055 10C4.86979 10 4.01165 8.03645 3.82815 7.74308C2.91287 6.2807 1.4416 5.81287 0 5.05723C1.03395 4.45827 2.27997 4.09934 3.13812 3.22814C4.01494 2.33804 4.4105 1.07456 5.00055 0C5.51148 0.936771 5.80705 1.99244 6.4861 2.83254C7.37172 3.92821 8.75508 4.43716 10 5.00278Z"
        fill={color}
      />
    </svg>
  );
}

export function Hero() {
  const prefersReducedMotion = useReducedMotion();
  const videoWrapperRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: videoWrapperRef,
    offset: REVEAL_OFFSET as unknown as ["start end", "center 65%"],
  });

  const titleOpacity = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [1, 0.7, 0]
  );
  const titleScale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);

  const titleMotionStyle = prefersReducedMotion
    ? undefined
    : { opacity: titleOpacity, scale: titleScale };

  return (
    <section className="relative z-10 flex flex-col items-center px-3 md:px-[48px]">
      {/* Title block — vertically centered in viewport below navbar */}
      <motion.div
        className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-center min-h-[calc(100dvh-72px)] md:min-h-[calc(100dvh-128px)] pt-20 md:pt-32"
        variants={prefersReducedMotion ? {} : staggerContainer}
        initial="hidden"
        animate="visible"
        style={titleMotionStyle}
      >
        <motion.div className="mb-6 flex gap-2.5" variants={prefersReducedMotion ? {} : fadeUp}>
          {[HERO.badge1, HERO.badge2].map((badge) => (
            <span
              key={badge.label}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1 text-sm font-normal"
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "1.5px solid #FFFFFF66",
                color: badge.color,
              }}
            >
              <BadgeSparkIcon color={badge.color} />
              {badge.label}
            </span>
          ))}
        </motion.div>

        <motion.h1
          className="max-w-[1200px] text-center text-[clamp(40px,4.6vw,72px)] font-normal leading-[1.05] tracking-[-0.02em] text-black"
          variants={prefersReducedMotion ? {} : fadeUp}
        >
          {HERO.headlinePrefix}
          <span className="text-[#314344]">{HERO.headlineAccent}</span>
        </motion.h1>

        <motion.p
          className="mx-auto mt-6 max-w-[800px] px-[27px] md:px-0 text-center text-base leading-6 text-black/70"
          variants={prefersReducedMotion ? {} : fadeUp}
        >
          {HERO.description}
        </motion.p>

        <motion.div
          className="mt-6 flex w-full flex-col md:flex-row md:flex-wrap items-center justify-center gap-4 md:gap-2.5 py-6"
          variants={prefersReducedMotion ? {} : fadeUp}
        >
          <PillButton
            size="lg"
            icon={<PlatformIcon />}
            showArrow={false}
            href={HERO.ctaPrimaryHref}
            className="hero-mobile-pill w-auto gap-2 px-6 py-4 tracking-[-0.02em] md:w-auto md:gap-1 md:pl-4 md:pr-6"
          >
            {HERO.ctaPrimary}
          </PillButton>
          <PillButton
            variant="outline"
            size="lg"
            href={HERO.ctaSecondaryHref}
            className="hero-mobile-pill w-auto gap-2 px-6 py-4 md:w-auto md:gap-1 md:pl-4 md:pr-6"
          >
            {HERO.ctaSecondary}
          </PillButton>
        </motion.div>
      </motion.div>

      <ScrollVideoReveal
        className="mb-16 mt-4 max-w-[calc(100vw-24px)] md:max-w-[calc(100vw-96px)] md:mb-20"
        targetRef={videoWrapperRef}
      >
        <div className="relative aspect-[1200/484] overflow-hidden rounded-3xl border border-black/10 bg-black/5 shadow-[0_32px_90px_rgba(0,0,0,0.18)]">
          <AutoplayVideo
            src={VIDEOS.hero}
            ariaLabel="SR Platform simulation environment with robotic arms"
            loadOnScroll
            mobileTapFullscreen
          />
        </div>
      </ScrollVideoReveal>
    </section>
  );
}
