
import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { AGENTIC_HERO, VIDEOS } from "@/lib/constants";
import { PillButton } from "@/components/ui/PillButton";
import { AutoplayVideo } from "@/components/ui/AutoplayVideo";
import { ScrollVideoReveal } from "@/components/ui/ScrollVideoReveal";
import { fadeUp } from "@/components/animations/fadeUp";
import { staggerContainer } from "@/components/animations/stagger";
import { REVEAL_OFFSET } from "@/components/animations/scrollVideoReveal";

function BadgeSparkIcon() {
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
        fill="#69419D"
      />
    </svg>
  );
}

export function AgenticHero() {
  const prefersReducedMotion = useReducedMotion();
  const videoWrapperRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: videoWrapperRef,
    offset: REVEAL_OFFSET as unknown as ["start end", "center 65%"],
  });

  const titleOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.7, 0]);

  const titleMotionStyle = prefersReducedMotion
    ? undefined
    : { opacity: titleOpacity };

  return (
    <section
      className="relative z-10 flex flex-col items-center px-3 md:px-[48px]"
      aria-label="Agentic hero"
    >
      {/* Title block — vertically centered in viewport below navbar */}
      <motion.div
        className="flex w-full flex-col items-center max-lg:justify-center min-h-[calc(100dvh-72px)] md:min-h-[calc(100dvh-128px)] pt-12 md:pt-28 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16"
        variants={prefersReducedMotion ? {} : staggerContainer}
        initial="hidden"
        animate="visible"
        style={titleMotionStyle}
      >
        {/* Left column on lg. On mobile `contents` promotes children into the
            centered flex so each piece can be reordered via `order-*` to match
            the Figma mobile layout (wordmark → dash → badge → headline → copy
            → buttons), then `lg:*` restores the original two-column desktop. */}
        <div className="contents lg:flex lg:flex-col lg:items-start">
          <motion.h1
            variants={prefersReducedMotion ? {} : fadeUp}
            className="order-1 font-superground bg-gradient-to-r from-black to-[#314344] bg-clip-text text-center text-[min(32px,8.2vw)] font-normal leading-none tracking-normal text-transparent max-lg:whitespace-nowrap [filter:drop-shadow(0_14px_24px_rgba(0,0,0,0.28))] lg:order-none lg:text-left lg:text-[clamp(42px,8vw,78px)]"
          >
            <span className="inline lg:block">sr</span>
            <span className="inline lg:block"> agentic</span>
          </motion.h1>

          <motion.span
            variants={prefersReducedMotion ? {} : fadeUp}
            aria-hidden
            className="order-2 mt-4 block h-1 w-6 rounded-[2px] bg-[#020202] lg:order-none lg:mt-[48px] lg:h-1.5 lg:w-11"
          />

          <motion.div
            variants={prefersReducedMotion ? {} : fadeUp}
            className="order-6 mt-6 flex w-full flex-col items-center gap-2.5 lg:order-none lg:mt-[120px] lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:gap-3"
          >
            <PillButton
              size="lg"
              showArrow
              href={AGENTIC_HERO.ctaPrimaryHref}
              className="hero-mobile-pill w-auto gap-2 px-6 py-4 lg:w-auto lg:pr-5"
            >
              {AGENTIC_HERO.ctaPrimary}
            </PillButton>
            <PillButton
              variant="outline"
              size="lg"
              showArrow={false}
              href={AGENTIC_HERO.ctaSecondaryHref}
              className="hero-mobile-pill w-auto gap-2 px-6 py-4 lg:w-auto"
            >
              {AGENTIC_HERO.ctaSecondary}
            </PillButton>
          </motion.div>
        </div>

        {/* Right column on lg; interleaved with the left pieces on mobile. */}
        <div className="contents lg:flex lg:flex-col lg:items-start">
          <motion.h2
            variants={prefersReducedMotion ? {} : fadeUp}
            className="order-4 mt-6 w-full max-w-[760px] text-center text-[clamp(36px,4.4vw,68px)] font-normal leading-[1.05] tracking-[-0.02em] text-black lg:order-none lg:mt-0 lg:w-auto lg:text-left"
          >
            {AGENTIC_HERO.headlinePrefix}
            <span className="text-[#314344]">{AGENTIC_HERO.headlineAccent}</span>
          </motion.h2>

          <motion.p
            variants={prefersReducedMotion ? {} : fadeUp}
            className="order-5 mt-6 w-full max-w-[600px] text-center text-base leading-6 text-black/70 lg:order-none lg:w-auto lg:text-left"
          >
            {AGENTIC_HERO.description}
          </motion.p>

          <motion.span
            variants={prefersReducedMotion ? {} : fadeUp}
            className="order-3 mt-6 inline-flex items-center gap-2.5 rounded-lg px-2 py-1 text-sm font-normal text-[#69419D] backdrop-blur-sm lg:order-none"
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "1.5px solid #FFFFFF66",
            }}
          >
            <BadgeSparkIcon />
            {AGENTIC_HERO.badge}
          </motion.span>
        </div>
      </motion.div>

      <ScrollVideoReveal
        className="mb-16 mt-4 max-w-[calc(100vw-24px)] md:max-w-[calc(100vw-96px)] md:mb-20"
        targetRef={videoWrapperRef}
      >
        <div className="relative aspect-[1632/720] overflow-hidden rounded-3xl border border-black/10 bg-black/5 shadow-[0_32px_90px_rgba(0,0,0,0.18)]">
          <AutoplayVideo
            src={VIDEOS.hero}
            ariaLabel="SR Agentic robotics task demonstration"
            loadOnScroll
            mobileTapFullscreen
          />
        </div>

        <p className="mx-auto mt-6 max-w-[760px] text-center text-sm leading-relaxed text-black/55 md:text-base">
          {AGENTIC_HERO.videoCaption}
        </p>
      </ScrollVideoReveal>
    </section>
  );
}
