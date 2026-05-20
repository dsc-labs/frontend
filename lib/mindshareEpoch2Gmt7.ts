/** Eligibility day keys align to the 17:00 UTC daily snapshot (fixed +7h offset, no DST). */
export const EPOCH2_GMT7_OFFSET_MS = 7 * 60 * 60 * 1000
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Eligibility day `YYYY-MM-DD` for instant `ms` (17:00 UTC cron windows). */
export function gmt7DayKeyFromMs(ms: number): string {
  return new Date(ms + EPOCH2_GMT7_OFFSET_MS).toISOString().slice(0, 10)
}

/** UTC instant for start of eligibility day `dayKey`. */
export function gmt7DayStartMs(dayKey: string): number {
  return Date.parse(`${dayKey}T00:00:00+07:00`)
}

/** Previous eligibility day. */
export function gmt7PreviousDayKey(dayKey: string): string {
  return gmt7DayKeyFromMs(gmt7DayStartMs(dayKey) - MS_PER_DAY)
}

/**
 * Post counting window for a daily snapshot at `snapshotMs` (17:00 UTC tick).
 *
 * Normal run (after bootstrap): if eligible on day *D*, posts submitted during eligibility day *D−1*
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

/**
 * UTC instant when the 17:00 UTC cron records SR eligibility for eligibility day `eligibilityDayKey`.
 */
export function gmt7SrEligibilitySnapshotInstantMs(eligibilityDayKey: string): number {
  return gmt7DayStartMs(eligibilityDayKey) + MS_PER_DAY
}
