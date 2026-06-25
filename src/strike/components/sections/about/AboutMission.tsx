
import Image from "next/image";
import { useState } from "react";
import {
  motion,
  useReducedMotion,
  useTransform,
  useSpring,
  useMotionValue,
} from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ABOUT_MISSION } from "@/lib/constants";
import { fadeUp } from "@/components/animations/fadeUp";
import { staggerContainer } from "@/components/animations/stagger";

const EASE = [0.25, 0.1, 0.25, 1] as const;

const LEFT_BRACKET_D =
  "M0.391113 0.311523L9.77805 12.0984C11.4699 14.2228 12.3911 16.8582 12.3911 19.574V153.049C12.3911 155.765 11.4699 158.4 9.77804 160.525L0.391113 172.312";
const RIGHT_BRACKET_D =
  "M12.5 0.311523L3.11307 12.0984C1.42121 14.2228 0.5 16.8582 0.5 19.574V153.049C0.5 155.765 1.42121 158.4 3.11307 160.525L12.5 172.312";

const WATERMARK_ITEMS = Array.from({ length: 8 }, (_, i) => i);

// Speech-bubble card silhouette (Figma) as objectBoundingBox clip paths — the
// bottom-right is scooped up so the card hugs the toggle button on the left.
// Two variants because the notch keeps a ~constant pixel depth at each height.
const CARD_CLIP_COLLAPSED =
  "M0 0.066667C0 0.029848 0.014327 0 0.032 0H0.968C0.985674 0 1 0.029848 1 0.066667V0.808333C1 0.845154 0.985674 0.875 0.968 0.875H0.401242C0.394118 0.875 0.387364 0.881592 0.382804 0.892992L0.347196 0.982008C0.342636 0.993408 0.335882 1 0.32876 1H0.032C0.014327 1 0 0.970154 0 0.933333V0.066667Z";
const CARD_CLIP_EXPANDED =
  "M0 0.032653C0 0.014619 0.014327 0 0.032 0H0.968C0.985674 0 1 0.014619 1 0.032653V0.906122C1 0.924157 0.985674 0.938776 0.968 0.938776H0.401242C0.394118 0.938776 0.387364 0.942004 0.382804 0.947588L0.347196 0.991188C0.342636 0.996771 0.335882 1 0.32876 1H0.032C0.014327 1 0 0.985382 0 0.967347V0.032653Z";

const QuoteIcon = (
  <svg
    width="22"
    height="16"
    viewBox="0 0 22 16"
    fill="currentColor"
    className="text-black/80"
    aria-hidden="true"
  >
    <path d="M0 16V9.6C0 6.72.72 4.32 2.16 2.4 3.6.8 5.64-.04 8.28 0v3.36c-1.68.16-2.88.72-3.6 1.68-.6.8-.9 1.84-.9 3.12V9.6h4.32V16H0zm12.6 0V9.6c0-2.88.72-5.28 2.16-7.2C16.2.8 18.24-.04 20.88 0v3.36c-1.68.16-2.88.72-3.6 1.68-.6.8-.9 1.84-.9 3.12V9.6H22V16h-9.4z" />
  </svg>
);

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

export function AboutMission() {
  const prefersReducedMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const cardClip = `url(#${expanded ? "about-card-expanded" : "about-card-collapsed"})`;

  // Reaching-hands hover push-away (% of each hand's own size). The diagonal
  // fly-in is a scroll-triggered reveal (whileInView) handled on the wrappers
  // below; this only adds the outward nudge when the section is hovered.
  const hover = useMotionValue(0);
  const hoverSpring = useSpring(hover, { stiffness: 140, damping: 20 });
  const leftHoverX = useTransform(hoverSpring, [0, 1], ["0%", "-5%"]);
  const leftHoverY = useTransform(hoverSpring, [0, 1], ["0%", "3%"]);
  const rightHoverX = useTransform(hoverSpring, [0, 1], ["0%", "5%"]);
  const rightHoverY = useTransform(hoverSpring, [0, 1], ["0%", "3%"]);

  return (
    <section
      id="mission"
      aria-label="Our mission"
      onMouseEnter={() => hover.set(1)}
      onMouseLeave={() => hover.set(0)}
      className="relative isolate overflow-hidden bg-gradient-to-b from-[#f5f5f5] to-[#fafafa] px-6 pt-[72px] pb-[270px] md:px-12 md:pb-[250px] md:pt-[150px] cv-auto"
    >
      {/* Card silhouette clip paths (scoped notch for both card states) */}
      <svg aria-hidden width="0" height="0" className="pointer-events-none absolute">
        <defs>
          <clipPath id="about-card-collapsed" clipPathUnits="objectBoundingBox">
            <path d={CARD_CLIP_COLLAPSED} />
          </clipPath>
          <clipPath id="about-card-expanded" clipPathUnits="objectBoundingBox">
            <path d={CARD_CLIP_EXPANDED} />
          </clipPath>
        </defs>
      </svg>

      {/* Mobile reaching hands — compact pair (desktop keeps the large hands below) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-[70px] z-[1] flex items-end justify-between md:hidden"
      >
        <Image
          src="/about/Left.png"
          alt=""
          width={218}
          height={200}
          draggable={false}
          className="h-auto w-[218px] -translate-x-4 select-none object-contain"
        />
        <Image
          src="/about/Right.png"
          alt=""
          width={198}
          height={200}
          draggable={false}
          className="h-auto w-[198px] translate-x-4 select-none object-contain"
        />
      </div>

      {/* Reaching hands — desktop only, behind content, peeking from the bottom corners */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] hidden items-end justify-between md:flex"
      >
        <motion.div
          className="w-[min(620px,40vw)]"
          initial={
            prefersReducedMotion
              ? { x: "-54%", y: "30%" }
              : { x: "-46%", y: "34%", opacity: 0 }
          }
          whileInView={
            prefersReducedMotion ? undefined : { x: "-24%", y: "20%", opacity: 1 }
          }
          viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <motion.div
            style={
              prefersReducedMotion ? undefined : { x: leftHoverX, y: leftHoverY }
            }
          >
            <Image
              src={ABOUT_MISSION.handLeft}
              alt=""
              width={1452}
              height={954}
              draggable={false}
              className="h-auto w-full select-none object-contain"
            />
          </motion.div>
        </motion.div>
        <motion.div
          className="w-[min(720px,52vw)]"
          style={{ marginBottom: 165 }}
          initial={
            prefersReducedMotion
              ? { x: "24%", y: "40%" }
              : { x: "48%", y: "56%", opacity: 0 }
          }
          whileInView={
            prefersReducedMotion ? undefined : { x: "24%", y: "40%", opacity: 1 }
          }
          viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <motion.div
            style={
              prefersReducedMotion
                ? undefined
                : { x: rightHoverX, y: rightHoverY }
            }
          >
            <Image
              src={ABOUT_MISSION.handRight}
              alt=""
              width={1024}
              height={671}
              draggable={false}
              className="h-auto w-full select-none object-contain"
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Watermark — repeated word scrolling right→left, same band as home/agentic */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-[0%] z-0 overflow-hidden mb-[24px] md:mb-[0px] md:py-[24px] py-[10px] "
      >
        <div className="agentic-watermark-marquee flex w-max items-center whitespace-nowrap font-superground text-[clamp(40px,8vw,72px)] lowercase leading-none text-black/[0.06]">
          {WATERMARK_ITEMS.map((item) => (
            <span key={item} className="flex items-center">
              <span>{ABOUT_MISSION.watermark}</span>
              <WatermarkStar />
            </span>
          ))}
        </div>
      </div>

      {/* Content band, framed like the agentic layer (vertical line + brackets + rules).
          No z-index here so the frame lines below sit behind the hands while the
          content (raised to z-[2]) stays above them. */}
      <div className="relative mx-auto w-full max-w-[1330px]">
        {/* Vertical line — spans the full band, top edge to bottom rule */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute bottom-[-120px] top-[-150px] left-[-70px] hidden w-px bg-black/15 md:block"
          style={{ transformOrigin: "50% 0%" }}
          initial={prefersReducedMotion ? undefined : { scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
        />
        {/* Bottom rule — full-bleed, meets the side brackets */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute bottom-[-120px] left-[calc(0px-max(0px,(100vw-1416px)/2))] right-[calc(0px-max(0px,(100vw-1416px)/2))] hidden h-px bg-black/15 md:block"
          initial={prefersReducedMotion ? undefined : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.05 }}
          style={{ transformOrigin: "50% 50%" }}
        />
        {/* Side brackets — pushed out to 48px from the viewport edge */}
        <svg
          aria-hidden
          viewBox="0 0 13 173"
          fill="none"
          className="pointer-events-none absolute left-[calc(0px-max(0px,(100vw-1416px)/2))] top-1/2 hidden h-[172px] w-3 -translate-y-1/2 md:block"
          preserveAspectRatio="none"
        >
          <path d={LEFT_BRACKET_D} stroke="black" strokeOpacity="0.15" />
        </svg>
        <svg
          aria-hidden
          viewBox="0 0 13 173"
          fill="none"
          className="pointer-events-none absolute right-[calc(0px-max(0px,(100vw-1416px)/2))] top-1/2 hidden h-[172px] w-3 -translate-y-1/2 md:block"
          preserveAspectRatio="none"
        >
          <path d={RIGHT_BRACKET_D} stroke="black" strokeOpacity="0.15" />
        </svg>

        <motion.div
          className="relative z-[2] flex w-full flex-col gap-[34px] md:h-[562px] md:flex-row md:items-start md:justify-between md:gap-16 md:py-14 "
          variants={prefersReducedMotion ? {} : staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Headline column — decorative edge brackets on mobile only */}
          <motion.div
            variants={prefersReducedMotion ? {} : fadeUp}
            className="relative w-full md:w-auto md:max-w-[620px]"
          >
            <svg
              aria-hidden
              width="13"
              height="173"
              viewBox="0 0 13 173"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="pointer-events-none absolute -left-6 top-1/2 -translate-y-1/2 md:hidden"
            >
              <path
                d="M-0.286194 0.311523L9.10074 12.0984C10.7926 14.2228 11.7138 16.8582 11.7138 19.574V153.049C11.7138 155.765 10.7926 158.4 9.10074 160.525L-0.286194 172.312"
                stroke="black"
                strokeOpacity="0.15"
              />
            </svg>
            <svg
              aria-hidden
              width="13"
              height="173"
              viewBox="0 0 13 173"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="pointer-events-none absolute -right-6 top-1/2 -translate-y-1/2 md:hidden"
            >
              <path
                d="M12.5 0.311523L3.11307 12.0984C1.42121 14.2228 0.5 16.8582 0.5 19.574V153.049C0.5 155.765 1.42121 158.4 3.11307 160.525L12.5 172.312"
                stroke="black"
                strokeOpacity="0.15"
              />
            </svg>
            <h2 className="max-w-[620px] text-[32px] font-normal leading-[1.25] tracking-[-0.6px] text-black md:text-[54px] md:leading-[70px] md:tracking-[-1.08px]">
              {ABOUT_MISSION.headline}
            </h2>
          </motion.div>

          {/* Content card column */}
          <motion.div
            variants={prefersReducedMotion ? {} : fadeUp}
            className="relative w-full md:max-w-[500px]"
          >
          {/* Shadow layer — carries the notch-shaped shadow so the text layer
              below stays unfiltered and renders sharp. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[#E6E6EB] [filter:drop-shadow(0_14px_36px_rgba(0,0,0,0.13))]"
            style={{ clipPath: cardClip }}
          />
          <div
            className="relative rounded-[24px] bg-[#E6E6EB] px-8 py-6"
            style={{ clipPath: cardClip }}
          >
            {QuoteIcon}

            {/* Collapsible body */}
            <div className="relative mt-4">
              <div
                className={`space-y-4 overflow-hidden transition-all duration-300 ease-out ${
                  expanded
                    ? "card-scroll -mr-8 max-h-[326px] overflow-y-auto pr-8"
                    : "max-h-[210px]"
                }`}
              >
                {ABOUT_MISSION.paragraphs.map((paragraph, paragraphIndex) => (
                  <p
                    key={paragraphIndex}
                    className="text-[18px] leading-[24px] text-black"
                  >
                    {paragraph.map((run, runIndex) =>
                      run.bold ? (
                        <span key={runIndex} className="font-bold">
                          {run.text}
                        </span>
                      ) : (
                        <span key={runIndex}>{run.text}</span>
                      ),
                    )}
                  </p>
                ))}
              </div>

              {/* Fade overlay when collapsed */}
              {!expanded && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#E6E6EB] to-transparent"
                />
              )}
            </div>

            {/* Toggle */}
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              className="mt-5 mb-2 flex cursor-pointer items-center gap-1.5 rounded-md text-[16px] font-semibold text-black"
            >
              {expanded ? (
                <>
                  <span className="md:hidden">Hide</span>
                  <span className="hidden md:inline">{ABOUT_MISSION.readLess}</span>
                </>
              ) : (
                ABOUT_MISSION.readMore
              )}
              <ChevronDown
                className={`size-[18px] transition-transform duration-300 ${
                  expanded ? "rotate-180" : ""
                }`}
                strokeWidth={2}
              />
            </button>
          </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
