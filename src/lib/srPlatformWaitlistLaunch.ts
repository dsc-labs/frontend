/**
 * SR Platform waitlist unlocks at a fixed instant (browser compares with Date.now()).
 * Thu 7 May 2026, 01:00 UTC.
 */
const LAUNCH_AT_MS = Date.parse('2026-05-07T08:00:00+07:00')

/**
 * Public waitlist points pages (`/join`, `/test`) and new registrations close here.
 * Keep in sync with `lib/waitlistPages.ts`.
 */
export const WAITLIST_PAGES_END_MS = Date.parse('2026-07-26T00:00:00+07:00')

export function getSrPlatformWaitlistLaunchMs(): number {
  return LAUNCH_AT_MS
}

export function isSrPlatformWaitlistLive(nowMs: number = Date.now()): boolean {
  return Number.isFinite(LAUNCH_AT_MS) && nowMs >= LAUNCH_AT_MS
}

/** `/join` + `/test` + waitlist popup stay up until {@link WAITLIST_PAGES_END_MS}. */
export function isWaitlistPagesOpen(nowMs: number = Date.now()): boolean {
  return Number.isFinite(WAITLIST_PAGES_END_MS) && nowMs < WAITLIST_PAGES_END_MS
}
