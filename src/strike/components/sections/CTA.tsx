
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { CTA_VARIANTS, type CtaVariant, VIDEO_CTA } from "@/lib/constants";
import { PillButtonCta } from "@/components/ui/PillButton";
import { CircularText } from "@/components/ui/CircularText";
import { fadeUp } from "@/components/animations/fadeUp";
import { staggerContainer } from "@/components/animations/stagger";

type CTAProps = {
  variant?: CtaVariant;
};

export function CTA({ variant = "platform" }: CTAProps) {
  const prefersReducedMotion = useReducedMotion();
  const { wordmark, cta, ctaHref, subtitleLines } = CTA_VARIANTS[variant];
  const [wordmarkPrimary, wordmarkSecondary] = wordmark.split(" ");

  return (
    <section
      id="cta"
      className="relative md:px-12 cv-auto"
      aria-label="Call to action section"
    >
      <motion.div
        className="relative mx-auto max-w-[1632px] overflow-hidden rounded-3xl bg-black max-md:rounded-tl-[50px] max-md:rounded-tr-none max-md:rounded-bl-none max-md:rounded-br-none"
        style={{ minHeight: 423 }}
        initial={prefersReducedMotion ? undefined : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <Image
          src={VIDEO_CTA.background}
          alt=""
          fill
          aria-hidden
          className="object-cover object-center"
          sizes="(max-width: 1632px) 100vw, 1632px"
        />

        {/* <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-black/45"
        /> */}

        <CircularText
          text={VIDEO_CTA.rotatingBadge}
          diameter={264}
          fontSize={18}
          letterSpacing={0.22}
          durationSeconds={28}
          className="absolute right-[-20%] top-[55%] z-[5] block h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 text-white opacity-60 md:right-[-10%] md:top-[25%] md:h-[180px] md:w-[180px] lg:h-[220px] lg:w-[220px] xl:h-[264px] xl:w-[264px]"
        />

        <motion.div
          className="relative z-10 flex flex-col items-start px-7 py-16 text-left md:min-h-[423px] md:items-center md:justify-center md:px-8 md:text-center"
          variants={prefersReducedMotion ? {} : staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.p
            variants={prefersReducedMotion ? {} : fadeUp}
            className="text-[20px] font-normal tracking-[-0.4px] text-white md:text-lg md:tracking-normal md:text-white/85"
          >
            {subtitleLines.map((line, i) => (
              <span
                key={line}
                className={i > 0 ? "block md:inline md:opacity-50" : undefined}
              >
                {i > 0 ? " " : null}
                {line}
              </span>
            ))}
          </motion.p>

          <motion.h2
            variants={prefersReducedMotion ? {} : fadeUp}
            className="mt-2 font-superground text-[32px] font-normal lowercase leading-none tracking-normal text-white md:text-[64px]"
          >
            <span className="md:hidden">
              <span className="block">{wordmarkPrimary}</span>
              <span className="block">{wordmarkSecondary}</span>
            </span>
            <span className="hidden md:inline">{wordmark}</span>
          </motion.h2>

          <motion.div
            variants={prefersReducedMotion ? {} : fadeUp}
            className="mt-8 py-2"
          >
            <PillButtonCta showShadow href={ctaHref}>{cta}</PillButtonCta>
          </motion.div>

          <motion.nav
            aria-label="Footer quick links"
            variants={prefersReducedMotion ? {} : fadeUp}
            className="z-10 mt-10 flex w-full flex-col gap-6 text-[16px] tracking-[-0.16px] text-white/70 md:absolute md:bottom-10 md:left-6 md:mt-0 md:w-auto md:flex-col md:gap-4 md:text-[13px] md:tracking-normal md:text-white/75 lg:left-12"
          >
            {VIDEO_CTA.sidebarLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="transition-colors text-left hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </motion.nav>
        </motion.div>
      </motion.div>
    </section>
  );
}
