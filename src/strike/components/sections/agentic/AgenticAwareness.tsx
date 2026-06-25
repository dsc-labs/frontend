
import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AGENTIC_AWARENESS } from "@/lib/constants";
import { fadeUp, fadeUpScale } from "@/components/animations/fadeUp";
import { staggerContainer } from "@/components/animations/stagger";
import { cn } from "@/lib/utils";

const SLIDES = AGENTIC_AWARENESS.slides;

const EASE = [0.25, 0.1, 0.25, 1] as const;
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
  }),
  center: {
    x: "0%",
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
  }),
};

function SlideCounter({
  index,
  total,
  className,
}: {
  index: number;
  total: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex h-[26px] w-[66px] shrink-0 items-center gap-2.5 self-start overflow-hidden rounded-xl px-3 py-1 backdrop-blur-[10px] md:h-[43px] md:w-20 md:px-[13px] md:py-0 md:backdrop-blur-[20px]",
        className
      )}
      style={{ background: "rgba(0,0,0,0.3)" }}
    >
      <span className="inline-flex h-4 items-center font-superground text-[18px] leading-none text-white md:h-auto md:text-[28px]">
        {index + 1}
      </span>
      <span className="inline-flex h-4 items-center gap-0.5 text-[16px] leading-none text-white/60 md:h-auto md:text-xl">
        <span>/</span>
        <span>{total}</span>
      </span>
    </div>
  );
}

function SlideInfoCard({
  title,
  description,
  className,
  variant = "mobile",
}: {
  title: string;
  description: string;
  className?: string;
  variant?: "mobile" | "desktop";
}) {
  const surfaceStyle =
    variant === "desktop"
      ? {
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(15px)",
          WebkitBackdropFilter: "blur(15px)",
        }
      : {
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(7.5px) saturate(120%)",
          WebkitBackdropFilter: "blur(7.5px) saturate(120%)",
        };

  return (
    <div
      className={cn("rounded-[20px] p-5 md:rounded-xl md:p-6", className)}
      style={surfaceStyle}
    >
      <h3 className="text-[20px] font-medium leading-normal tracking-[-0.4px] text-white md:text-[32px] md:leading-[38px] md:tracking-normal">
        {title}
      </h3>
      <p className="mt-2.5 text-xs leading-5 text-white/70 md:mt-[17px] md:text-base md:leading-[22px] md:text-white/70">
        {description}
      </p>
    </div>
  );
}

function MobilePagination({
  index,
  onGoTo,
}: {
  index: number;
  onGoTo: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {SLIDES.map((s, i) => (
        <button
          key={s.id}
          type="button"
          aria-label={`Go to slide ${i + 1}`}
          onClick={() => onGoTo(i)}
          className={cn(
            "h-1 cursor-pointer rounded-xl transition-all duration-500 ease-out",
            i === index ? "w-[62px] bg-black" : "w-5 bg-black/30 hover:bg-black/45"
          )}
        />
      ))}
    </div>
  );
}

function DesktopPagination({
  index,
  onGoTo,
}: {
  index: number;
  onGoTo: (next: number) => void;
}) {
  return (
    <div className="flex w-[216px] items-center gap-1.5">
      {SLIDES.map((s, i) => (
        <button
          key={s.id}
          type="button"
          aria-label={`Go to slide ${i + 1}`}
          onClick={() => onGoTo(i)}
          className={cn(
            "h-1 cursor-pointer rounded-full transition-all duration-500 ease-out",
            i === index
              ? "w-[124px] bg-white"
              : "w-10 bg-white/30 hover:bg-white/45"
          )}
        />
      ))}
    </div>
  );
}

export function AgenticAwareness() {
  const prefersReducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const slide = SLIDES[index];

  const goTo = (next: number) => {
    const total = SLIDES.length;
    const wrapped = ((next % total) + total) % total;
    if (wrapped === index) return;

    const forwardDistance = (wrapped - index + total) % total;
    const backwardDistance = (index - wrapped + total) % total;
    setDirection(forwardDistance <= backwardDistance ? 1 : -1);
    setIndex(wrapped);
  };

  return (
    <section
      id="awareness"
      className="relative px-3 pb-12 pt-16 md:px-[48px] md:pb-20 cv-auto"
      aria-label="Awareness engine across deployments"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-3 right-3 top-0 h-px bg-black/15 md:left-[48px] md:right-[48px]"
        initial={prefersReducedMotion ? undefined : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: EASE }}
        style={{ transformOrigin: "50% 50%" }}
      />

      <motion.div
        className="relative mx-auto flex w-full max-w-[1268px] flex-col items-center gap-6 md:items-stretch md:gap-0"
        variants={prefersReducedMotion ? {} : staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className="flex w-full flex-col items-center px-3 text-center md:items-start md:px-0 md:text-left">
          <motion.span
            variants={prefersReducedMotion ? {} : fadeUp}
            className="block text-[14px] font-normal uppercase leading-[18px] tracking-normal text-[#8FA6B0] md:text-base md:leading-[22px]"
          >
            {AGENTIC_AWARENESS.tag}
          </motion.span>

          <motion.h2
            variants={prefersReducedMotion ? {} : fadeUp}
            className="mt-3 w-full max-w-[914px] text-[32px] font-medium leading-9 tracking-[-0.64px] text-[#3E424D] md:mt-[31px] md:text-[64px] md:font-normal md:leading-[70px] md:tracking-normal"
          >
            {AGENTIC_AWARENESS.headline}
          </motion.h2>

          <motion.p
            variants={prefersReducedMotion ? {} : fadeUp}
            className="mt-3 w-full max-w-[914px] text-[14px] leading-6 text-[#3E424D]/80 md:mt-[42px] md:text-base md:leading-[22px] md:text-[#3E424D]"
          >
            {AGENTIC_AWARENESS.description}
          </motion.p>
        </div>

        <motion.div
          variants={prefersReducedMotion ? {} : fadeUpScale}
          className="flex w-full flex-col items-center gap-2.5 md:mt-12"
        >
          {/* Mobile carousel card — swipe horizontally to change slides */}
          <div className="relative w-full max-w-[406px] overflow-hidden rounded-[20px] md:hidden">
            <motion.div
              className="relative aspect-[406/512] w-full touch-pan-y select-none bg-white"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              dragMomentum={false}
              onDragEnd={(_, info) => {
                const swipe = 50;
                if (info.offset.x < -swipe || info.velocity.x < -400) {
                  goTo(index + 1);
                } else if (info.offset.x > swipe || info.velocity.x > 400) {
                  goTo(index - 1);
                }
              }}
            >
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={slide.id}
                  custom={direction}
                  variants={prefersReducedMotion ? undefined : slideVariants}
                  initial={prefersReducedMotion ? undefined : "enter"}
                  animate="center"
                  exit={prefersReducedMotion ? undefined : "exit"}
                  transition={{ duration: 0.55, ease: EASE }}
                  className="absolute inset-0"
                >
                  <Image
                    src={slide.mobileImageSrc}
                    alt={slide.title}
                    fill
                    sizes="406px"
                    className="object-cover"
                  />
                </motion.div>
              </AnimatePresence>

              <div className="absolute inset-0 flex flex-col justify-between px-3 pb-4 pt-6">
                <SlideCounter index={index} total={SLIDES.length} />

                <div className="flex w-full justify-start">
                  <SlideInfoCard
                    title={slide.title}
                    description={slide.description}
                    className="w-full max-w-[309px]"
                  />
                </div>
              </div>
            </motion.div>
          </div>

          <div className="flex justify-center md:hidden">
            <MobilePagination index={index} onGoTo={goTo} />
          </div>

          {/* Desktop carousel */}
          <div className="relative hidden w-full overflow-hidden rounded-[20px] bg-white md:block">
            <div className="relative aspect-[2/1] w-full">
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={slide.id}
                  custom={direction}
                  variants={prefersReducedMotion ? undefined : slideVariants}
                  initial={prefersReducedMotion ? undefined : "enter"}
                  animate="center"
                  exit={prefersReducedMotion ? undefined : "exit"}
                  transition={{ duration: 0.55, ease: EASE }}
                  className="absolute inset-0"
                >
                  <Image
                    src={slide.imageSrc}
                    alt={slide.title}
                    fill
                    sizes="1200px"
                    className="object-cover"
                    priority={index === 0}
                  />
                </motion.div>
              </AnimatePresence>

              <SlideCounter
                index={index}
                total={SLIDES.length}
                className="absolute left-6 top-6 hidden md:flex"
              />

              <div className="absolute bottom-6 left-6 right-7 flex items-end justify-between gap-6">
                <div className="flex w-[416px] flex-col gap-[68px]">
                  <SlideInfoCard
                    variant="desktop"
                    title={slide.title}
                    description={slide.description}
                    className="h-[228px] w-[416px]"
                  />
                  <DesktopPagination index={index} onGoTo={goTo} />
                </div>

                <div className="flex shrink-0 items-center gap-3.5">
                  <button
                    type="button"
                    aria-label="Previous slide"
                    onClick={() => goTo(index - 1)}
                    className="flex size-16 cursor-pointer items-center justify-center rounded-full bg-black/10 text-white backdrop-blur-[20px] transition-colors hover:bg-black/20"
                  >
                    <ChevronLeft className="size-7" strokeWidth={2.25} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next slide"
                    onClick={() => goTo(index + 1)}
                    className="flex size-16 cursor-pointer items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-[20px] transition-colors hover:bg-black/40"
                  >
                    <ChevronRight className="size-7" strokeWidth={2.25} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
