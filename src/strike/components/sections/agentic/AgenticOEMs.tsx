
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { AGENTIC_OEMS } from "@/lib/constants";
import { fadeUp, fadeUpScale } from "@/components/animations/fadeUp";
import {
  staggerContainer,
  staggerContainerSlow,
} from "@/components/animations/stagger";
import { cn } from "@/lib/utils";

function OEMBullet({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <>
      <div className="relative mx-auto flex size-[72px] shrink-0 items-center justify-center lg:mx-0">
        <Image
          src={icon}
          alt=""
          width={144}
          height={144}
          className="h-[72px] w-[72px] object-contain"
        />
      </div>
      <div className="flex-1">
        <h3 className="text-[20px] font-medium leading-[1.2] tracking-[-0.2px] text-black">
          {title}
        </h3>
        <p className="mt-3 text-[14px] leading-[22px] text-[#3e424d]/75 lg:max-w-[460px]">
          {description}
        </p>
      </div>
    </>
  );
}

export function AgenticOEMs() {
  const prefersReducedMotion = useReducedMotion();
  const EASE = [0.25, 0.1, 0.25, 1] as const;

  return (
    <section
      id="oems"
      className="relative px-3 py-[90px] md:px-[48px] cv-auto"
      aria-label="Built for robotics teams and OEMs"
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
        className="relative mx-auto grid w-full max-w-[1268px] grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,544px)] lg:gap-16"
        variants={prefersReducedMotion ? {} : staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <motion.div
          variants={prefersReducedMotion ? {} : fadeUp}
          className="order-1 flex flex-col items-center text-center lg:order-2 lg:items-start lg:text-left"
        >
          <span className="text-[14px] font-normal uppercase leading-[18px] tracking-normal text-[#8FA6B0] lg:text-base lg:leading-[22px]">
            {AGENTIC_OEMS.tag}
          </span>

          <h2 className="mt-8 max-w-[544px] text-[34px] font-normal leading-[1.08] tracking-[-0.02em] text-black lg:mt-9 lg:text-[64px] lg:leading-[70px]">
            {AGENTIC_OEMS.headlinePart1}
            {AGENTIC_OEMS.headlinePart2}{" "}
            <span className="font-superground text-[29px] font-normal leading-[1.08] tracking-[-0.02em] text-black lg:text-[54px] lg:leading-[70px]">
              {AGENTIC_OEMS.headlineAccent}
            </span>
          </h2>

          <p className="mt-4 max-w-[444px] text-[14px] leading-6 text-[#3E424D]/70 lg:text-base lg:leading-[22px]">
            {AGENTIC_OEMS.description}
          </p>
        </motion.div>

        <motion.div
          variants={prefersReducedMotion ? {} : staggerContainerSlow}
          className="order-2 flex flex-col lg:order-1"
        >
          {AGENTIC_OEMS.bullets.map((bullet, i) => (
            <motion.div
              key={bullet.title}
              variants={prefersReducedMotion ? {} : fadeUpScale}
              className={cn(
                "flex flex-col items-center gap-4 py-6 text-center",
                "lg:flex-row lg:items-start lg:gap-8 lg:py-6 lg:text-left",
                i < AGENTIC_OEMS.bullets.length - 1
                  ? "border-b border-black/15"
                  : ""
              )}
            >
              <OEMBullet
                title={bullet.title}
                description={bullet.description}
                icon={bullet.icon}
              />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
