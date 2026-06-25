
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { FEATURES, FEATURES_SECTION } from "@/lib/constants";
import { PillButtonCta } from "@/components/ui/PillButton";
import { AutoplayVideo } from "@/components/ui/AutoplayVideo";
import { fadeUp } from "@/components/animations/fadeUp";
import { staggerContainer } from "@/components/animations/stagger";

const EASE = [0.25, 0.1, 0.25, 1] as const;

const INDICATOR_SPRING = {
  type: "spring" as const,
  stiffness: 420,
  damping: 36,
  mass: 0.85,
};

const HEADER_BAND_MIN_H = 206;
const BRACKET_HEIGHT = 173;
const BRACKET_TOP = (HEADER_BAND_MIN_H - BRACKET_HEIGHT) / 2;
const LINE_LEFT = 10;
const INDICATOR_HEIGHT = 40;
const INDICATOR_WIDTH = 3;
const ITEM_ICON_CENTER_FROM_TOP = 36;

const ICON_SRC: Record<string, string> = {
  "asset-creation": "/icons/features/asset-creation.svg",
  "spatial-layout": "/icons/features/spatial-layout.svg",
  "stimulation": "/icons/features/stimulation.svg",
  "realtime-edit": "/icons/features/realtime-edit.svg",
};

const ACTIVE_GRADIENT =
  "linear-gradient(91.36deg, #fff 4.23%, #ebebeb 56%, #fff 99.91%)";

const LEFT_BRACKET_D =
  "M0.391113 0.311523L9.77805 12.0984C11.4699 14.2228 12.3911 16.8582 12.3911 19.574V153.049C12.3911 155.765 11.4699 158.4 9.77804 160.525L0.391113 172.312";
const RIGHT_BRACKET_D =
  "M12.5 0.311523L3.11307 12.0984C1.42121 14.2228 0.5 16.8582 0.5 19.574V153.049C0.5 155.765 1.42121 158.4 3.11307 160.525L12.5 172.312";

const MOBILE_ITEM_ICON_CENTER = 28;

function FeatureDescription({
  description,
  boldPhrase,
  className,
}: {
  description: string;
  boldPhrase?: string;
  className?: string;
}) {
  if (!boldPhrase || !description.includes(boldPhrase)) {
    return (
      <p className={cn("text-[#3e424d]", className)}>{description}</p>
    );
  }

  const [before, after] = description.split(boldPhrase);
  return (
    <p className={cn("text-[#3e424d]", className)}>
      {before}
      <span className="font-semibold">{boldPhrase}</span>
      {after}
    </p>
  );
}

type FeatureItemProps = {
  feature: (typeof FEATURES)[number];
  index: number;
  isActive: boolean;
  showTopBorder: boolean;
  onSelect: () => void;
  prefersReducedMotion: boolean | null;
  buttonRef: (el: HTMLButtonElement | null) => void;
};

function FeatureItem({
  feature,
  index,
  isActive,
  showTopBorder,
  onSelect,
  prefersReducedMotion,
  buttonRef,
}: FeatureItemProps) {
  const iconSrc = ICON_SRC[feature.id];
  const videoSrc = feature.videoSrc;

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onSelect}
      aria-expanded={isActive}
      className={cn(
        "group relative w-full cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-black/15",
        isActive
          ? "max-md:flex max-md:flex-col max-md:gap-2 max-md:rounded-2xl max-md:border max-md:border-white/60 max-md:border-l-2 max-md:px-6 max-md:pb-6 max-md:pt-5 max-md:shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.15)]"
          : cn(
              "max-md:px-6 max-md:py-3",
              index > 0 && "max-md:border-t max-md:border-black/10"
            ),
        "md:rounded-xl md:px-6 md:py-3"
      )}
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-black/10 md:hidden"
        initial={false}
        animate={{ opacity: !isActive && index > 0 ? 1 : 0 }}
        transition={
          prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: EASE }
        }
      />

      <motion.span
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-0 hidden h-px origin-center bg-black/10 md:block"
        initial={false}
        animate={{ opacity: showTopBorder ? 1 : 0 }}
        transition={
          prefersReducedMotion ? { duration: 0 } : { duration: 0.25, ease: EASE }
        }
      />

      <motion.span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 border border-white/60 border-l-2 border-l-white/60",
          isActive ? "max-md:rounded-2xl md:rounded-xl" : "md:rounded-xl"
        )}
        style={{ background: ACTIVE_GRADIENT, willChange: "opacity" }}
        initial={false}
        animate={{ opacity: isActive ? 1 : 0 }}
        transition={
          prefersReducedMotion ? { duration: 0 } : { duration: 0.4, ease: EASE }
        }
      />

      <div className="relative flex items-center gap-4 max-md:gap-4 md:gap-6">
        <span
          aria-hidden
          className={cn(
            "relative block h-8 w-8 shrink-0 transition-opacity duration-300 md:h-12 md:w-12",
            isActive ? "opacity-100" : "opacity-60"
          )}
        >
          {iconSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={iconSrc}
              alt=""
              className="h-full w-full select-none object-contain"
              draggable={false}
            />
          )}
        </span>

        {/* Mobile title — static sizes per Figma */}
        <span
          className={cn(
            "block text-black leading-[1.2] md:hidden",
            isActive
              ? "text-[20px] font-medium tracking-[-0.2px]"
              : "text-[18px] font-normal tracking-[-0.36px]"
          )}
        >
          {feature.title}
        </span>

        {/* Desktop title — animated */}
        <motion.span
          className="hidden text-black md:block"
          initial={false}
          animate={{
            fontSize: isActive ? "22px" : "20px",
            letterSpacing: isActive ? "-0.22px" : "-0.2px",
            fontWeight: isActive ? 500 : 400,
            opacity: isActive ? 1 : 0.92,
          }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.3, ease: EASE }
          }
          style={{ lineHeight: 1.2, willChange: "font-size, font-weight" }}
        >
          {feature.title}
        </motion.span>
      </div>

      <motion.div
        className="relative overflow-hidden"
        initial={false}
        animate={{
          height: isActive ? "auto" : 0,
          opacity: isActive ? 1 : 0,
        }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : {
                height: { duration: 0.45, ease: EASE },
                opacity: { duration: isActive ? 0.4 : 0.18, ease: "easeOut" },
              }
        }
        aria-hidden={!isActive}
      >
        <div
          className={cn(
            "max-md:border-t max-md:border-black/10 max-md:pb-4 max-md:pt-3",
            "md:pb-1 md:pl-[72px] md:pr-1"
          )}
        >
          <FeatureDescription
            description={feature.description}
            boldPhrase={feature.boldPhrase}
            className="max-md:text-[14px] max-md:leading-5 md:text-[16px] md:leading-[22px]"
          />
        </div>
        {isActive && videoSrc && (
          <div className="relative max-md:pt-3 md:mt-3 lg:hidden">
            <div className="relative aspect-[5/3] w-full max-w-[334px] overflow-hidden rounded-xl border border-black/60 bg-black/5">
              <AutoplayVideo
                src={videoSrc}
                objectPosition="top center"
                ariaLabel={`${feature.title} preview`}
              />
            </div>
          </div>
        )}
      </motion.div>
    </button>
  );
}

export function Features() {
  const [activeId, setActiveId] = useState(FEATURES[0].id);
  const [indicator, setIndicator] = useState({ top: 0, ready: false });
  const prefersReducedMotion = useReducedMotion();
  const activeFeature = FEATURES.find((f) => f.id === activeId) ?? FEATURES[0];

  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [lineHeight, setLineHeight] = useState<number | null>(null);

  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const updateIndicator = useCallback((id: string) => {
    const wrapperEl = wrapperRef.current;
    const itemEl = itemRefs.current.get(id);
    if (!wrapperEl || !itemEl) return;

    const wrapperRect = wrapperEl.getBoundingClientRect();
    const itemRect = itemEl.getBoundingClientRect();
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches;
    const iconCenterY =
      itemRect.top -
      wrapperRect.top +
      (isDesktop ? ITEM_ICON_CENTER_FROM_TOP : MOBILE_ITEM_ICON_CENTER);
    const top = iconCenterY - INDICATOR_HEIGHT / 2;

    setIndicator((prev) =>
      prev.top === top && prev.ready ? prev : { top, ready: true }
    );
  }, []);

  const updateLineHeight = useCallback(() => {
    const innerEl = innerRef.current;
    const ctaEl = ctaRef.current;
    if (!innerEl || !ctaEl) return;

    const innerRect = innerEl.getBoundingClientRect();
    const ctaRect = ctaEl.getBoundingClientRect();
    const next = ctaRect.bottom - innerRect.top;
    setLineHeight((prev) => (prev === next ? prev : next));
  }, []);

  // Update khi active item đổi. Re-measure mỗi frame trong suốt animation
  // expand/collapse (~0.45s): vị trí item active dịch chuyển khi item cũ co lại,
  // nên đo 1 lần lúc bắt đầu sẽ chốt nhầm vị trí (rõ nhất ở item cuối). Bám theo
  // tới khi layout ổn định để thanh chỉ báo dừng đúng hàng icon trên cùng.
  useEffect(() => {
    const start = performance.now();
    let rafId = requestAnimationFrame(function tick() {
      updateIndicator(activeId);
      if (performance.now() - start < 520) {
        rafId = requestAnimationFrame(tick);
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [activeId, updateIndicator]);

  // Single ResizeObserver, RAF-throttled — bao phủ cả window resize
  // (window resize gây wrapper resize). Dùng activeIdRef tránh re-attach
  // observer mỗi lần activeId đổi.
  useEffect(() => {
    const wrapperEl = wrapperRef.current;
    if (!wrapperEl) return;

    let rafId: number | null = null;
    const ro = new ResizeObserver(() => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateIndicator(activeIdRef.current);
        updateLineHeight();
      });
    });
    ro.observe(wrapperEl);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [updateIndicator, updateLineHeight]);

  useEffect(() => {
    const raf = requestAnimationFrame(updateLineHeight);
    return () => cancelAnimationFrame(raf);
  }, [activeId, updateLineHeight]);

  const setItemRef = useCallback(
    (id: string) => (el: HTMLButtonElement | null) => {
      if (el) itemRefs.current.set(id, el);
      else itemRefs.current.delete(id);
    },
    []
  );

  return (
    <section
      id="features"
      className="relative bg-transparent pt-[80px] md:pt-[110px]"
      aria-label="Features section"
    >
      <div ref={wrapperRef} className="relative px-3 md:mx-[48px] md:px-0">
        {/* Top horizontal line of header band — full frame width */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-black/15"
          initial={prefersReducedMotion ? undefined : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: EASE }}
          style={{ transformOrigin: "50% 50%" }}
        />

        {/* Bottom horizontal line of header band — desktop only */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 hidden h-px bg-black/15 md:block"
          style={{ top: HEADER_BAND_MIN_H, transformOrigin: "50% 50%" }}
          initial={prefersReducedMotion ? undefined : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.05 }}
        />

        {/* Left bracket — desktop only (outer frame) */}
        <motion.svg
          aria-hidden
          width="13"
          height={BRACKET_HEIGHT}
          viewBox="0 0 13 173"
          fill="none"
          className="pointer-events-none absolute hidden md:block"
          style={{ left: 0, top: BRACKET_TOP }}
          initial={prefersReducedMotion ? undefined : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.45 }}
        >
          <path d={LEFT_BRACKET_D} stroke="black" strokeOpacity="0.15" />
        </motion.svg>

        {/* Right bracket — desktop only (outer frame) */}
        <motion.svg
          aria-hidden
          width="13"
          height={BRACKET_HEIGHT}
          viewBox="0 0 13 173"
          fill="none"
          className="pointer-events-none absolute hidden md:block"
          style={{ right: 0, top: BRACKET_TOP }}
          initial={prefersReducedMotion ? undefined : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.45 }}
        >
          <path d={RIGHT_BRACKET_D} stroke="black" strokeOpacity="0.15" />
        </motion.svg>

        {/* Inner content — locked at max 1268px, centered. Contains the text,
            features grid, and the vertical line + indicator so the line stays
            50px from the content's left edge regardless of viewport width. */}
        <div ref={innerRef} className="relative mx-auto w-full max-w-[1268px]">
          {/* Single continuous vertical line — sits 50px left of content text */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute top-0 hidden w-px bg-black/15 md:block"
            style={{
              left: LINE_LEFT,
              height: lineHeight ?? "100%",
              transformOrigin: "50% 0%",
            }}
            initial={prefersReducedMotion ? undefined : { scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
          />

          {/* Animated indicator sits to the right of the vertical line. */}
          <motion.svg
            aria-hidden
            className="pointer-events-none absolute hidden md:block"
            viewBox="0 0 3 40"
            fill="none"
            style={{
              left: LINE_LEFT + 1,
              width: INDICATOR_WIDTH,
              height: INDICATOR_HEIGHT,
              willChange: "top",
            }}
            initial={false}
            animate={{
              top: indicator.top,
              opacity: indicator.ready ? 1 : 0,
            }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    top: INDICATOR_SPRING,
                    opacity: { duration: 0.35, ease: EASE, delay: indicator.ready ? 0.15 : 0 },
                  }
            }
          >
            <path
              d="M0 0.428569C0 0.191876 0.191878 0 0.428571 0C1.84873 0 3 1.15127 3 2.57143V37.4286C3 38.8487 1.84873 40 0.428571 40C0.191878 40 0 39.8081 0 39.5714V0.428569Z"
              fill="#4D4D4D"
            />
          </motion.svg>

          {/* Header band content */}
          <div className="relative max-md:px-5 max-md:pb-6 max-md:pt-12 md:min-h-[206px] md:pl-[60px] md:pr-[60px]">
          {/* Mobile brackets — centered on header band, flush to screen edges */}
          <svg
            aria-hidden
            viewBox="0 0 13 173"
            fill="none"
            className="pointer-events-none absolute top-1/2 h-[172px] w-3 -translate-y-1/2 max-md:left-[-12px] md:hidden"
            preserveAspectRatio="none"
          >
            <path d={LEFT_BRACKET_D} stroke="black" strokeOpacity="0.15" />
          </svg>
          <svg
            aria-hidden
            viewBox="0 0 13 173"
            fill="none"
            className="pointer-events-none absolute top-1/2 h-[172px] w-3 -translate-y-1/2 max-md:right-[-12px] md:hidden"
            preserveAspectRatio="none"
          >
            <path d={RIGHT_BRACKET_D} stroke="black" strokeOpacity="0.15" />
          </svg>
          <motion.div
            variants={prefersReducedMotion ? {} : staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="max-w-[913px] max-md:flex max-md:flex-col max-md:gap-4 md:py-12"
          >
            <motion.h2
              variants={prefersReducedMotion ? {} : fadeUp}
              className="max-md:text-[32px] max-md:font-medium max-md:leading-normal max-md:tracking-[-0.04em] md:text-[clamp(36px,4vw,64px)] md:font-normal md:leading-[1.1] md:tracking-[-0.02em] text-black"
            >
              {FEATURES_SECTION.headline}
            </motion.h2>
            <motion.p
              variants={prefersReducedMotion ? {} : fadeUp}
              className="max-md:text-sm max-md:leading-normal max-md:text-[#3e424d]/70 md:mt-4 md:text-base md:leading-6 text-[#3e424d]/70 max-w-[913px]"
            >
              {FEATURES_SECTION.description}
            </motion.p>
          </motion.div>
        </div>

        {/* Features content — Figma 23:2855: p-24 mobile */}
        <div className="flex flex-col items-start gap-12 max-md:mt-2.5 max-md:px-3 max-md:pb-12 max-md:pt-6 md:py-[64px] lg:flex-row lg:gap-12 md:pl-[60px] md:pr-[60px]">
          <motion.div
            className="w-full shrink-0 lg:w-[462px]"
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <div className="flex w-full flex-col max-md:pt-0 md:pt-0">
              {FEATURES.map((feature, index) => {
                const isActive = feature.id === activeId;
                const prev = index > 0 ? FEATURES[index - 1] : null;
                const prevIsActive = prev ? prev.id === activeId : false;
                const showTopBorder = index > 0 && !isActive && !prevIsActive;
                return (
                  <FeatureItem
                    key={feature.id}
                    feature={feature}
                    index={index}
                    isActive={isActive}
                    showTopBorder={showTopBorder}
                    onSelect={() => setActiveId(feature.id)}
                    prefersReducedMotion={prefersReducedMotion}
                    buttonRef={setItemRef(feature.id)}
                  />
                );
              })}
            </div>

            <div ref={ctaRef} className="flex justify-center pt-4 md:justify-start md:pt-6">
              <PillButtonCta className="w-[276px]" href={FEATURES_SECTION.ctaHref}>{FEATURES_SECTION.cta}</PillButtonCta>
            </div>
          </motion.div>

          {/* Desktop-only right column — switch video theo activeId
              (key remount để clean reset state mỗi lần đổi feature). */}
          <div className="relative hidden h-[480px] w-[800px] shrink-0 overflow-hidden rounded-2xl border border-[#d9d9d9] bg-black/5 lg:block">
            <AutoplayVideo
              key={activeFeature.id}
              src={activeFeature.videoSrc}
              objectPosition="top center"
              ariaLabel={`${activeFeature.title} preview`}
            />
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
