/**
 * Public waitlist points pages (`/join`, `/test`) and waitlist APIs.
 * Aligns with `src/lib/srPlatformWaitlistLaunch.ts` — keep both in sync.
 *
 * Closed at the same instant as Mindshare Epoch 3 end (midnight GMT+7, 26 Jul 2026).
 */
export const WAITLIST_PAGES_END_MS = Date.parse('2026-07-26T00:00:00+07:00')

export function isWaitlistPagesOpen(nowMs = Date.now()): boolean {
  return Number.isFinite(WAITLIST_PAGES_END_MS) && nowMs < WAITLIST_PAGES_END_MS
}

export const WAITLIST_CLOSED_ERROR = 'The SR Platform waitlist is closed.'
