
import { useEffect, useRef, useState } from "react";
import {
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
} from "framer-motion";
import { SCROLLING_TEXT } from "@/lib/constants";

/**
 * 10 phrases + modulo wrap đo theo phrase width thực tế.
 * Vì phrases giống hệt nhau, wrap đúng tại 1 phrase width là seamless
 * (đoạn visible trước/sau wrap là identical). Giảm ~80% text layout work
 * mỗi frame so với bản 50-phrase unrolled cũ.
 */
const REPEAT_COUNT = 10;
const SEPARATOR = "  ·  ";

const OFFSET_START = 48;
const DRIFT_SPEED = -10;

const FONT_SIZE = 96;

const PATH_D_DESKTOP = "M -200 75 L 1050 75 C 1280 75 1400 150 1440 230";
const PATH_D_MOBILE = "M -200 75 L 700 75 C 760 75 790 140 800 230";

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const textDesktopRef = useRef<SVGTextElement>(null);
  const textMobileRef = useRef<SVGTextElement>(null);
  const textPathDesktopRef = useRef<SVGTextPathElement>(null);
  const textPathMobileRef = useRef<SVGTextPathElement>(null);
  const pathDesktopRef = useRef<SVGPathElement>(null);
  const pathMobileRef = useRef<SVGPathElement>(null);
  const wrapIntervalRef = useRef<number | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Đo 1 phrase width theo % path length → dùng cho modulo wrap.
  // Đo lại khi đổi mobile/desktop và khi font web load xong (advance khác).
  useEffect(() => {
    const measure = () => {
      const textEl = isMobile ? textMobileRef.current : textDesktopRef.current;
      const pathEl = isMobile ? pathMobileRef.current : pathDesktopRef.current;
      if (!textEl || !pathEl) return;
      try {
        const totalLen = textEl.getComputedTextLength();
        const pathLen = pathEl.getTotalLength();
        if (totalLen > 0 && pathLen > 0) {
          wrapIntervalRef.current = (totalLen / REPEAT_COUNT / pathLen) * 100;
        }
      } catch {
        wrapIntervalRef.current = null;
      }
    };
    const rafId = requestAnimationFrame(measure);
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(measure).catch(() => {});
    }
    return () => cancelAnimationFrame(rafId);
  }, [isMobile]);

  const phrase = `${SCROLLING_TEXT.parts[0]} ${SCROLLING_TEXT.parts[1]} ${SCROLLING_TEXT.parts[2]}`;
  const repeatedText = Array.from({ length: REPEAT_COUNT })
    .map(() => phrase)
    .join(SEPARATOR);

  // Drift độc lập với scroll — tốc độ không đổi dù user scroll lên/xuống/đứng yên.
  // driftOffset chính là giá trị startOffset (%) sẽ apply lên textPath.
  const driftOffset = useMotionValue(OFFSET_START);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const section = sectionRef.current;
    if (!section) return;

    // Throttle mobile xuống ~30fps để giảm số lần SVG textPath re-layout.
    const minFrameMs = isMobile ? 1000 / 30 : 0;
    let rafId: number | null = null;
    let lastTime = 0;
    let lastFrameTime = 0;

    const tick = (now: number) => {
      if (now - lastFrameTime >= minFrameMs) {
        const delta = now - lastTime;
        lastTime = now;
        lastFrameTime = now;
        let next = driftOffset.get() + (DRIFT_SPEED * delta) / 1000;
        const wrap = wrapIntervalRef.current;
        // Modulo wrap tại đúng 1 phrase width → seam invisible vì phrases identical.
        // Drift cycles trong [OFFSET_START - wrap, OFFSET_START].
        if (wrap && next <= OFFSET_START - wrap) next += wrap;
        driftOffset.set(next);
      }
      rafId = requestAnimationFrame(tick);
    };
    const start = () => {
      if (rafId !== null) return;
      lastTime = performance.now();
      lastFrameTime = lastTime;
      rafId = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (rafId === null) return;
      cancelAnimationFrame(rafId);
      rafId = null;
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) start();
        else stop();
      },
      { rootMargin: "100px" }
    );
    observer.observe(section);
    return () => {
      observer.disconnect();
      stop();
    };
  }, [prefersReducedMotion, driftOffset, isMobile]);

  useMotionValueEvent(driftOffset, "change", (v) => {
    if (prefersReducedMotion) return;
    const offsetStr = `${v}%`;
    // Chỉ touch ref đang visible — SVG kia đang display:none, không cần update.
    const ref = isMobile ? textPathMobileRef : textPathDesktopRef;
    ref.current?.setAttribute("startOffset", offsetStr);
  });

  const initialOffset = prefersReducedMotion ? "0%" : `${OFFSET_START}%`;
  const gradientStops = (
    <>
      <stop offset="0%" stopColor="#000000" />
      <stop offset="38%" stopColor="#000000" />
      <stop offset="46%" stopColor="#5a4059" />
      <stop offset="54%" stopColor="#4a606d" />
      <stop offset="61%" stopColor="#515a6e" />
      <stop offset="72%" stopColor="#000000" />
      <stop offset="100%" stopColor="#000000" />
    </>
  );
  const textStyle = {
    fontSize: FONT_SIZE,
    fontFamily: "var(--font-golos-text), sans-serif",
    letterSpacing: "-0.01em" as const,
  };
  // Promote section sang compositor layer riêng + cô lập paint
  // → repaint của textPath không invalidate cả trang.
  const svgStyle = {
    overflow: "visible" as const,
    transform: "translateZ(0)",
    contain: "layout paint" as const,
  };

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative overflow-hidden pt-[150px] max-md:hidden"
      aria-label="Platform title section"
    >
      {/* Desktop: SVG full width, curve ở viewBox x≈1050→1440. */}
      <svg
        className="hidden md:block w-full"
        viewBox="0 0 1440 230"
        fill="none"
        aria-hidden="true"
        style={svgStyle}
      >
        <defs>
          <linearGradient id="arc-text-gradient-d" x1="0%" y1="0%" x2="100%" y2="0%">
            {gradientStops}
          </linearGradient>
          <path ref={pathDesktopRef} id="arc-text-path-d" d={PATH_D_DESKTOP} />
        </defs>
        <text ref={textDesktopRef} fill="url(#arc-text-gradient-d)" style={textStyle}>
          <textPath
            ref={textPathDesktopRef}
            href="#arc-text-path-d"
            startOffset={initialOffset}
          >
            {repeatedText}
          </textPath>
        </text>
      </svg>

      {/* Mobile: SVG w-[180%] — vùng nhìn thấy là viewBox 0-800, curve kết thúc ở (800, 230). */}
      <svg
        className="block md:hidden w-[180%]"
        viewBox="0 0 1440 230"
        fill="none"
        aria-hidden="true"
        style={svgStyle}
      >
        <defs>
          <linearGradient id="arc-text-gradient-m" x1="0%" y1="0%" x2="100%" y2="0%">
            {gradientStops}
          </linearGradient>
          <path ref={pathMobileRef} id="arc-text-path-m" d={PATH_D_MOBILE} />
        </defs>
        <text ref={textMobileRef} fill="url(#arc-text-gradient-m)" style={textStyle}>
          <textPath
            ref={textPathMobileRef}
            href="#arc-text-path-m"
            startOffset={initialOffset}
          >
            {repeatedText}
          </textPath>
        </text>
      </svg>
      <p className="sr-only">{phrase}</p>
    </section>
  );
}
