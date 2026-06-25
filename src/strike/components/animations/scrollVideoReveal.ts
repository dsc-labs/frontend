export const SCROLL_REVEAL_EASE = [0.16, 1, 0.3, 1] as const;

/** Initial tilt state when the page loads */
export const INITIAL_ROTATE_X_DEG = 55;
export const INITIAL_SCALE = 0.72;

/** CSS perspective applied to the wrapper for the 3D tilt */
export const REVEAL_PERSPECTIVE_PX = 1600;

/**
 * Scroll offset tuple for `useScroll({ target, offset })`.
 * - "start end" → tilt starts when the top of the video meets the bottom of the viewport.
 * - "center 65%" → tilt completes when the center of the video reaches 65% from the top
 *   of the viewport (slightly above middle, so it stands fully upright as the user is
 *   actually looking at it).
 */
export const REVEAL_OFFSET = ["start end", "center 65%"] as const;
