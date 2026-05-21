import {
  EPOCH2_CHECKPOINT_DAY_KEYS,
  EPOCH2_SNAPSHOT_UTC_HOUR,
  type Epoch2CheckpointDayKey,
} from './mindshareEpoch2Constants'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function isEpoch2CheckpointDayKey(dayKey: string): dayKey is Epoch2CheckpointDayKey {
  return (EPOCH2_CHECKPOINT_DAY_KEYS as readonly string[]).includes(dayKey)
}

/** UTC calendar day for instant `ms` (used when cron runs at 05:00 UTC on tick days). */
export function gmt7DayKeyFromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** UTC instant for the 05:00 UTC snapshot on checkpoint day `dayKey`. */
export function gmt7DayStartMs(dayKey: string): number {
  const h = String(EPOCH2_SNAPSHOT_UTC_HOUR).padStart(2, '0')
  return Date.parse(`${dayKey}T${h}:00:00.000Z`)
}

/** Previous checkpoint calendar day (UTC date arithmetic). */
export function gmt7PreviousDayKey(dayKey: string): string {
  return gmt7DayKeyFromMs(gmt7DayStartMs(dayKey) - MS_PER_DAY)
}

/**
 * Post counting window for a checkpoint snapshot at `snapshotMs` (05:00 UTC on tick days).
 *
 * Bootstrap: all posts with `submittedAt <` this tick count when eligible.
 * Later ticks: if eligible on day *D*, posts submitted during the 24h before the day *D* tick count.
 */
export function gmt7PostCountWindowForSnapshot(
  snapshotMs: number,
  isBootstrap: boolean,
): { startMs: number; endMs: number; eligibilityDayKey: string; snapshotDayKey: string } {
  const snapshotDayKey = gmt7DayKeyFromMs(snapshotMs)
  const snapshotInstant = gmt7DayStartMs(snapshotDayKey)

  if (isBootstrap) {
    return {
      startMs: 0,
      endMs: snapshotInstant,
      eligibilityDayKey: snapshotDayKey,
      snapshotDayKey,
    }
  }

  const eligibilityDayKey = snapshotDayKey
  const eligibilityDayStart = gmt7DayStartMs(eligibilityDayKey)
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

/** UTC instant when the cron records SR eligibility for checkpoint day `eligibilityDayKey`. */
export function gmt7SrEligibilitySnapshotInstantMs(eligibilityDayKey: string): number {
  return gmt7DayStartMs(eligibilityDayKey)
}

/** True when `nowMs` falls on a checkpoint tick day (UTC date in {@link EPOCH2_CHECKPOINT_DAY_KEYS}). */
export function isEpoch2CheckpointSnapshotDay(nowMs = Date.now()): boolean {
  return isEpoch2CheckpointDayKey(gmt7DayKeyFromMs(nowMs))
}

/** Next 05:00 UTC on a checkpoint tick day, strictly after `nowMs`. */
export function nextEpoch2CheckpointSnapshotUtcMs(nowMs = Date.now()): number {
  for (let i = 0; i < 32; i += 1) {
    const probe = nowMs + i * MS_PER_DAY
    const dayKey = gmt7DayKeyFromMs(probe)
    if (!isEpoch2CheckpointDayKey(dayKey)) continue
    const target = gmt7DayStartMs(dayKey)
    if (target > nowMs) return target
  }
  const last = EPOCH2_CHECKPOINT_DAY_KEYS[EPOCH2_CHECKPOINT_DAY_KEYS.length - 1]!
  return gmt7DayStartMs(last)
}
