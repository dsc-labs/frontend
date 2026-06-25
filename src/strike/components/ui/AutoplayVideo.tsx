
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type AutoplayVideoProps = {
  src: string;
  className?: string;
  objectPosition?: string;
  ariaLabel?: string;
  /** Load immediately without waiting for IntersectionObserver (e.g. above-the-fold) */
  eager?: boolean;
  /** Defer loading until the user has scrolled (scrollY > 0) */
  loadOnScroll?: boolean;
  /** `press` — load/play only while user is pressing (mobile-friendly) */
  playMode?: "auto" | "press";
  /** Required when playMode is `press` */
  isPressing?: boolean;
  /** On mobile, keep the inline video paused and play it on tap. */
  mobileTapFullscreen?: boolean;
};

export function AutoplayVideo({
  src,
  className,
  objectPosition = "center",
  ariaLabel,
  eager = false,
  loadOnScroll = false,
  playMode = "auto",
  isPressing = false,
  mobileTapFullscreen = false,
}: AutoplayVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const isPressMode = playMode === "press";
  const [isMobileViewport, setIsMobileViewport] = useState(mobileTapFullscreen);
  const [isMobileInlinePlaying, setIsMobileInlinePlaying] = useState(false);
  const shouldUseMobileTapPlay = mobileTapFullscreen && isMobileViewport;
  const [shouldLoad, setShouldLoad] = useState(
    eager && !isPressMode && !shouldUseMobileTapPlay
  );

  useEffect(() => {
    if (!mobileTapFullscreen) return;

    const media = window.matchMedia("(max-width: 767px)");
    const updateViewport = () => setIsMobileViewport(media.matches);

    updateViewport();
    media.addEventListener("change", updateViewport);
    return () => media.removeEventListener("change", updateViewport);
  }, [mobileTapFullscreen]);

  useEffect(() => {
    if (shouldUseMobileTapPlay) return;
    if (loadOnScroll && prefersReducedMotion) {
      setShouldLoad(true);
    }
  }, [loadOnScroll, prefersReducedMotion, shouldUseMobileTapPlay]);

  useEffect(() => {
    if (shouldUseMobileTapPlay || !loadOnScroll || shouldLoad || prefersReducedMotion) return;

    const onScroll = () => {
      if (window.scrollY > 0) {
        setShouldLoad(true);
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [loadOnScroll, shouldLoad, prefersReducedMotion, shouldUseMobileTapPlay]);

  // Lazy-load: only set src when video is near the viewport
  useEffect(() => {
    if (shouldUseMobileTapPlay) return;
    if (eager || loadOnScroll || shouldLoad) return;
    const el = containerRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager, loadOnScroll, shouldLoad, shouldUseMobileTapPlay]);

  useEffect(() => {
    if (shouldUseMobileTapPlay) return;
    if (!shouldLoad || isPressMode) return;
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container || prefersReducedMotion) return;

    const tryPlay = () => video.play().catch(() => {});

    // Pause video khi out of viewport — giảm tải decode/render cost.
    // Resume khi vào lại viewport.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) tryPlay();
        else video.pause();
      },
      { rootMargin: "200px" }
    );
    observer.observe(container);

    tryPlay();
    video.addEventListener("loadeddata", tryPlay);

    return () => {
      observer.disconnect();
      video.removeEventListener("loadeddata", tryPlay);
    };
  }, [isPressMode, shouldLoad, prefersReducedMotion, shouldUseMobileTapPlay, src]);

  useEffect(() => {
    if (shouldUseMobileTapPlay) return;
    if (!isPressMode || !shouldLoad) return;
    const video = videoRef.current;
    if (!video || prefersReducedMotion) return;

    const pauseAtStart = () => {
      video.pause();
      if (video.readyState >= 1) {
        try {
          video.currentTime = 0;
        } catch {
          /* ignore seek errors before metadata */
        }
      }
    };

    const onLoaded = () => {
      if (!isPressing) pauseAtStart();
    };

    video.addEventListener("loadeddata", onLoaded);

    if (isPressing) {
      void video.play();
    } else {
      pauseAtStart();
    }

    return () => {
      video.removeEventListener("loadeddata", onLoaded);
    };
  }, [isPressMode, isPressing, shouldLoad, prefersReducedMotion, shouldUseMobileTapPlay, src]);

  const toggleMobileInlinePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video
        .play()
        .then(() => setIsMobileInlinePlaying(true))
        .catch(() => setIsMobileInlinePlaying(false));
    } else {
      video.pause();
      setIsMobileInlinePlaying(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("h-full w-full", className)}>
      {shouldUseMobileTapPlay ? (
        <div className="group relative h-full w-full overflow-hidden">
          <video
            ref={videoRef}
            src={src}
            className="h-full w-full object-cover"
            style={{ objectPosition }}
            muted
            playsInline
            preload="metadata"
            aria-label={ariaLabel}
            onClick={toggleMobileInlinePlay}
            onPlay={() => setIsMobileInlinePlaying(true)}
            onPause={() => setIsMobileInlinePlaying(false)}
            onEnded={() => setIsMobileInlinePlaying(false)}
          />
          {!isMobileInlinePlaying && (
            <button
              type="button"
              aria-label={`Play ${ariaLabel ?? "video"}`}
              className="absolute inset-0 flex items-center justify-center bg-black/5 transition-colors active:bg-black/10"
              onClick={toggleMobileInlinePlay}
            >
              <span className="flex size-16 items-center justify-center rounded-full bg-white/25 text-white shadow-[0_10px_28px_rgba(0,0,0,0.22)] backdrop-blur-sm transition-transform active:scale-95">
                <svg
                  aria-hidden
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-12 translate-x-0.5"
                >
                  <path
                    d="M31.2864 22.304C32.5397 23.0873 32.5397 24.9127 31.2864 25.696L21.06 32.0875C19.7279 32.9201 18 31.9624 18 30.3915L18 17.6085C18 16.0376 19.7279 15.0799 21.06 15.9125L31.2864 22.304Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
            </button>
          )}
        </div>
      ) : shouldLoad ? (
        <video
          ref={videoRef}
          src={src}
          className="h-full w-full object-cover"
          style={{ objectPosition }}
          autoPlay={!prefersReducedMotion && !isPressMode}
          loop
          muted
          playsInline
          preload={isPressMode ? "auto" : "metadata"}
          aria-label={ariaLabel}
        />
      ) : null}
    </div>
  );
}
