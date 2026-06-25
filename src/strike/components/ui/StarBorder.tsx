/**
 * Star-border traveling glow (reactbits StarBorder).
 * Drop these two layers inside any `position:relative; overflow:hidden` pill;
 * the pill itself plays the library's container + inner-content role.
 * Keep page content above them with `z-index >= 1` (the layers sit at z-0).
 */
type StarBorderLayerProps = {
  /** Glow color — white on dark pills, a dark tone on white pills */
  color?: string;
  /** CSS animation-duration, e.g. "5s". Pass a shorter value to speed up on hover. */
  speed?: string;
};

export function StarBorderLayer({
  color = "white",
  speed = "5s",
}: StarBorderLayerProps) {
  const bg = `radial-gradient(circle, ${color}, transparent 10%)`;
  return (
    <>
      <span
        aria-hidden
        className="border-gradient-bottom"
        style={{ background: bg, animationDuration: speed }}
      />
      <span
        aria-hidden
        className="border-gradient-top"
        style={{ background: bg, animationDuration: speed }}
      />
    </>
  );
}
