
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { motion, useReducedMotion } from "framer-motion";
import { AGENTIC_LAYER_SECTION, AGENTIC_PARTS } from "@/lib/constants";
import { fadeUp, fadeUpScale } from "@/components/animations/fadeUp";
import {
  staggerContainer,
  staggerContainerSlow,
} from "@/components/animations/stagger";

const EASE = [0.25, 0.1, 0.25, 1] as const;

const LINE_LEFT = 10;

const LEFT_BRACKET_D =
  "M0.391113 0.311523L9.77805 12.0984C11.4699 14.2228 12.3911 16.8582 12.3911 19.574V153.049C12.3911 155.765 11.4699 158.4 9.77804 160.525L0.391113 172.312";
const RIGHT_BRACKET_D =
  "M12.5 0.311523L3.11307 12.0984C1.42121 14.2228 0.5 16.8582 0.5 19.574V153.049C0.5 155.765 1.42121 158.4 3.11307 160.525L12.5 172.312";

const WATERMARK_ITEMS = Array.from({ length: 8 }, (_, i) => i);
const WATERMARK_WORDS = ["one", "intelligence", "layer"];

function WatermarkStar() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 10 10"
      fill="none"
      className="mx-5 size-8 shrink-0 md:mx-7 md:size-[54px]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 5.00278L7.8387 6.09401C6.32897 6.95966 5.73014 8.5065 5.00055 10C4.86979 10 4.01165 8.03645 3.82815 7.74308C2.91287 6.2807 1.4416 5.81287 0 5.05723C1.03395 4.45827 2.27997 4.09934 3.13812 3.22814C4.01494 2.33804 4.4105 1.07456 5.00055 0C5.51148 0.936771 5.80705 1.99244 6.4861 2.83254C7.37172 3.92821 8.75508 4.43716 10 5.00278Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AgenticLayer() {
  const prefersReducedMotion = useReducedMotion();

  // Mobile-only carousel: disabled at ≥640px so sm+ keeps the plain grid.
  const [emblaRef] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    breakpoints: { "(min-width: 640px)": { active: false } },
  });

  return (
    <section
      id="intelligence-layer"
      className="relative !bg-transparent pt-[80px] md:pt-[110px]"
      aria-label="Intelligence layer breakdown"
    >
      <div className="relative bg-transparent">
        {/* Inner content — locked at max 1268px, centered (matches Features.tsx
            on the homepage). Contains the text, parts grid, and the vertical
            line so it stays 50px from the content's left edge at any width. */}
        <div className="relative mx-auto w-full max-w-[1268px] bg-transparent px-6 md:px-0">
          {/* Single continuous vertical line — 50px left of content text */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-black/15 hidden md:block"
            style={{ left: LINE_LEFT, transformOrigin: "50% 0%" }}
            initial={prefersReducedMotion ? undefined : { scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
          />

          {/* Header band content */}
          <div className="relative max-md:px-5 max-md:pb-6 max-md:pt-12 md:min-h-[206px] md:pl-[60px] md:pr-[60px]">
            {/* Full-viewport top/bottom rules for the header frame */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute top-0 h-px bg-black/15 max-md:left-[-24px] max-md:right-[-24px] md:left-[calc(48px-max(0px,(100vw-1268px)/2))] md:right-[calc(48px-max(0px,(100vw-1268px)/2))]"
              initial={prefersReducedMotion ? undefined : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: EASE }}
              style={{ transformOrigin: "50% 50%" }}
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute bottom-0 h-px bg-black/15 max-md:left-[-24px] max-md:right-[-24px] md:left-[calc(48px-max(0px,(100vw-1268px)/2))] md:right-[calc(48px-max(0px,(100vw-1268px)/2))]"
              initial={prefersReducedMotion ? undefined : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.05 }}
              style={{ transformOrigin: "50% 50%" }}
            />

            {/* Side brackets — matches the Features header frame */}
            <svg
              aria-hidden
              viewBox="0 0 13 173"
              fill="none"
              className="pointer-events-none absolute top-1/2 h-[172px] w-3 -translate-y-1/2 max-md:left-[-24px] md:left-[calc(48px-max(0px,(100vw-1268px)/2))]"
              preserveAspectRatio="none"
            >
              <path d={LEFT_BRACKET_D} stroke="black" strokeOpacity="0.15" />
            </svg>
            <svg
              aria-hidden
              viewBox="0 0 13 173"
              fill="none"
              className="pointer-events-none absolute top-1/2 h-[172px] w-3 -translate-y-1/2 max-md:right-[-24px] md:right-[calc(48px-max(0px,(100vw-1268px)/2))]"
              preserveAspectRatio="none"
            >
              <path d={RIGHT_BRACKET_D} stroke="black" strokeOpacity="0.15" />
            </svg>
            <motion.div
              variants={prefersReducedMotion ? {} : staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="max-w-[913px] max-md:flex max-md:flex-col max-md:gap-4 md:pb-6 md:pt-12"
            >
              <motion.h2
                variants={prefersReducedMotion ? {} : fadeUp}
                className="text-black max-md:text-[32px] max-md:font-medium max-md:leading-normal max-md:tracking-[-0.04em] md:text-[clamp(32px,4vw,56px)] md:font-normal md:leading-[1.1] md:tracking-[-0.02em]"
              >
                {AGENTIC_LAYER_SECTION.headline}
              </motion.h2>
              <motion.p
                variants={prefersReducedMotion ? {} : fadeUp}
                className="max-w-[913px] text-[#3e424d]/70 max-md:text-sm max-md:leading-normal md:mt-4 md:text-base md:leading-6"
              >
                {AGENTIC_LAYER_SECTION.description}
              </motion.p>
            </motion.div>
          </div>

          {/* Parts. Mobile (<sm): Embla horizontal carousel (drag/swipe).
              sm+: Embla disabled via breakpoint → original responsive grid. */}
          <div
            ref={emblaRef}
            className="max-md:-mx-6 overflow-hidden py-12 sm:overflow-visible"
          >
            <motion.div
              className="flex items-start gap-4 max-md:pl-3 sm:grid sm:grid-cols-[repeat(2,308px)] sm:justify-center md:justify-start md:pl-[60px] md:pr-[60px] lg:grid-cols-[repeat(4,308px)]"
              variants={prefersReducedMotion ? {} : staggerContainerSlow}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              {AGENTIC_PARTS.map((part) => (
                <motion.article
                  key={part.id}
                  variants={prefersReducedMotion ? {} : fadeUpScale}
                  className="flex w-[270px] min-w-0 flex-[0_0_270px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] sm:w-[308px] sm:flex-[0_0_308px] sm:flex-none"
                >
                  {/* Media visual — Figma 308×150 (≈2.05:1) */}
                  <div className="relative aspect-[308/150] w-full">
                    {part.media.endsWith(".gif") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={part.media}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <Image
                        src={part.media}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover"
                      />
                    )}
                  </div>

                  {/* Text — padding 20/16/20/24, centered (Figma) */}
                  <div className="flex flex-col items-center px-5 pb-6 pt-4 text-center">
                    <h3 className="text-[22px] font-medium leading-[1.2] tracking-[-0.22px] text-black">
                      {part.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-[22px] text-[#3e424d]">
                      {part.description}
                    </p>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Bottom watermark band */}
      <motion.div
        aria-hidden
        className="pointer-events-none relative mt-8 h-16 w-full overflow-hidden md:h-[72px] lg:h-[110px]"
        initial={prefersReducedMotion ? undefined : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        <div className="agentic-watermark-marquee flex h-full w-max items-center whitespace-nowrap font-superground text-[48px] font-normal leading-none tracking-normal text-black/5 md:text-[72px]">
          {WATERMARK_ITEMS.map((item) => (
            <span key={item} className="flex items-center">
              {WATERMARK_WORDS.map((word) => (
                <span key={`${item}-${word}`} className="flex items-center">
                  <span>{word}</span>
                  <WatermarkStar />
                </span>
              ))}
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
