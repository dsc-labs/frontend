import type { ReactNode } from "react";

/**
 * Background gradient từ Figma main container (node 28:398).
 * 0deg → white ở trên fading to transparent ở dưới.
 */
const GRADIENT =
  "linear-gradient(0deg, rgba(242,242,242,0) 0%, rgb(224,224,224) 30.945%, rgb(215,215,215) 45.719%, rgb(255,255,255) 100%)";

/**
 * Wraps the lower half of the landing page (HowItWorks → Footer):
 * - Figma gradient bg + soft top mask để blend với hero bg phía trên
 * - KHÔNG có scroll-driven motion để giảm tải render
 *   (translateY toàn bộ main containing 4 sections quá nặng)
 */
export function MainSection({
  children,
  transparent = false,
}: {
  children: ReactNode;
  /**
   * When true, render only the bare <main> wrapper without the white gradient
   * + top-fade mask — lets a page-level sticky background show through (used
   * on the Agentic page, where the hero bg spans the whole page).
   */
  transparent?: boolean;
}) {
  if (transparent) {
    return <main className="relative z-20 overflow-hidden">{children}</main>;
  }

  return (
    <main
      className="main-section-fade relative z-20 overflow-hidden"
      style={{
        backgroundImage: GRADIENT,
      }}
    >
      {children}
    </main>
  );
}
