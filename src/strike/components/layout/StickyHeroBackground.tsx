import { HERO_BACKGROUND, HERO_BACKGROUND_MOBILE } from "@/lib/constants";

/**
 * Sticky full-viewport hero bg. Mobile loads the lighter Top Bg_Sticky asset;
 * desktop keeps Background.png — picture media query avoids fetching both.
 */
export function StickyHeroBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none sticky top-0 -z-10 h-[100dvh] w-full"
    >
      <picture className="absolute inset-0 block size-full">
        <source media="(min-width: 768px)" srcSet={HERO_BACKGROUND} />
        <img
          src={HERO_BACKGROUND_MOBILE}
          alt=""
          decoding="async"
          fetchPriority="high"
          className="size-full object-cover object-center"
        />
      </picture>
    </div>
  );
}
