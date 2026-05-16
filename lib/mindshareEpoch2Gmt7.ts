/** Fixed UTC+7 (GMT+7, no DST) for Epoch 2 daily boundaries. */
export const EPOCH2_GMT7_OFFSET_MS = 7 * 60 * 60 * 1000
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Calendar date `YYYY-MM-DD` for instant `ms` in GMT+7. */
export function gmt7DayKeyFromMs(ms: number): string {
  return new Date(ms + EPOCH2_GMT7_OFFSET_MS).toISOString().slice(0, 10)
}

/** Start of GMT+7 calendar day `dayKey` as UTC epoch ms. */
export function gmt7DayStartMs(dayKey: string): number {
  return Date.parse(`${dayKey}T00:00:00+07:00`)
}

/** Previous GMT+7 calendar day. */
export function gmt7PreviousDayKey(dayKey: string): string {
  return gmt7DayKeyFromMs(gmt7DayStartMs(dayKey) - MS_PER_DAY)
}

/**
 * Post counting window for a daily snapshot at `snapshotMs` (typically 00:00 GMT+7).
 *
 * Normal run (after bootstrap): if eligible on day *D*, posts submitted during GMT+7 day *D−1*
 * count (user-facing “14 → 15” when *D* is the 15th).
 *
 * Bootstrap (first run): all posts with `submittedAt <` this midnight count when eligible.
 */
export function gmt7PostCountWindowForSnapshot(
  snapshotMs: number,
  isBootstrap: boolean,
): { startMs: number; endMs: number; eligibilityDayKey: string; snapshotDayKey: string } {
  const snapshotDayKey = gmt7DayKeyFromMs(snapshotMs)
  const snapshotDayStart = gmt7DayStartMs(snapshotDayKey)

  if (isBootstrap) {
    return {
      startMs: 0,
      endMs: snapshotDayStart,
      eligibilityDayKey: snapshotDayKey,
      snapshotDayKey,
    }
  }

  const eligibilityDayStart = snapshotDayStart - MS_PER_DAY
  const eligibilityDayKey = gmt7DayKeyFromMs(eligibilityDayStart)
  const postWindowStart = eligibilityDayStart - MS_PER_DAY

  return {
    startMs: postWindowStart,
    endMs: eligibilityDayStart,
    eligibilityDayKey,
    snapshotDayKey,
  }
}

export function postSubmittedInWindow(submittedAtMs: number, startMs: number, endMs: number): boolean {
  return submittedAtMs >= startMs && submittedAtMs < endMs
}
