/**
 * Mindshare challenge epoch windows.
 *
 * Event instants are unchanged from the original schedule (daily 17:00 UTC cron ticks).
 * UI copy only shows `EPOCH_3_START_UTC_LABEL`; other boundaries are not labeled on the site.
 */

/** Epoch 1 end (17:00 UTC, 22 Apr 2026). */
export const EPOCH_1_END_MS = Date.parse('2026-04-22T17:00:00Z')

/** Epoch 2 end — same instant as before UI copy changes (17:00 UTC, 20 May 2026). */
export const EPOCH_2_END_MS = Date.parse('2026-05-21T00:00:00+07:00')

/** 72 hours between Epoch 2 end and Epoch 3 start. */
export const EPOCH_3_GAP_MS = 3 * 24 * 60 * 60 * 1000

/** Epoch 3 start — always derived so the gap stays exactly 3×24h after Epoch 2 end. */
export const EPOCH_3_START_MS = EPOCH_2_END_MS + EPOCH_3_GAP_MS

/** Only user-facing schedule instant (all other boundaries stay internal). */
export const EPOCH_3_START_UTC_LABEL = '17:00 UTC, May 23, 2026'

const EPOCH2_ELIGIBILITY_DAY_OFFSET_MS = 7 * 60 * 60 * 1000
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Eligibility day key `YYYY-MM-DD` for snapshot windows (aligned to 17:00 UTC cron). */
export function epoch2EligibilityDayKeyFromMs(ms: number): string {
  return new Date(ms + EPOCH2_ELIGIBILITY_DAY_OFFSET_MS).toISOString().slice(0, 10)
}

/** UTC instant for 17:00 UTC on eligibility day `dayKey` (start of that eligibility window). */
export function epoch2EligibilityDayStartMs(dayKey: string): number {
  return Date.parse(`${dayKey}T00:00:00+07:00`)
}

/**
 * Next 00:00 GMT+7 (17:00 UTC daily snapshot) strictly after `nowMs`.
 * Matches “tomorrow midnight” on the eligibility calendar (same day boundary as Epoch 2 snapshots).
 */
export function nextTomorrowGmt7MidnightMs(nowMs = Date.now()): number {
  const dayKey = epoch2EligibilityDayKeyFromMs(nowMs)
  let target = epoch2EligibilityDayStartMs(dayKey) + MS_PER_DAY
  while (target <= nowMs) {
    target += MS_PER_DAY
  }
  return target
}

/** Next 17:00 UTC daily snapshot after `nowMs`. */
export function nextDailySnapshotUtcMs(nowMs = Date.now()): number {
  return nextTomorrowGmt7MidnightMs(nowMs)
}

/** @deprecated Use {@link epoch2EligibilityDayKeyFromMs}. */
export const gmt7DayKeyFromMs = epoch2EligibilityDayKeyFromMs

/** @deprecated Use {@link epoch2EligibilityDayStartMs}. */
export const gmt7DayStartMs = epoch2EligibilityDayStartMs

/** @deprecated Use {@link nextDailySnapshotUtcMs}. */
export const nextGmt7MidnightMs = nextDailySnapshotUtcMs

/**
 * Epoch 2 leaderboard table (`/sraaaepoch2`). Kept off the challenge page; use preview gate below instead.
 */
export function isEpoch2LeaderboardTablePublic(_nowMs = Date.now()): boolean {
  return false
}

/**
 * After Epoch 2 ends (17:00 UTC): the challenge-page “Epoch 2 Leaderboard” control links to `/epoch3-preview`.
 * The preview URL itself is always open (no redirect).
 */
export function isEpoch3PreviewLinkedFromChallenge(nowMs = Date.now()): boolean {
  return nowMs >= EPOCH_2_END_MS
}

export type MindshareEpochPhase = 'epoch1' | 'epoch2' | 'epoch3_countdown' | 'epoch3'

export function getMindshareEpochPhase(nowMs = Date.now()): MindshareEpochPhase {
  if (nowMs < EPOCH_1_END_MS) return 'epoch1'
  if (nowMs < EPOCH_2_END_MS) return 'epoch2'
  if (nowMs < EPOCH_3_START_MS) return 'epoch3_countdown'
  return 'epoch3'
}

export function mindshareChallengeTitle(phase: MindshareEpochPhase): string {
  switch (phase) {
    case 'epoch1':
      return 'STRIKE ROBOT MINDSHARE CHALLENGE - EPOCH 1'
    case 'epoch2':
      return 'STRIKE ROBOT MINDSHARE CHALLENGE - EPOCH 2'
    case 'epoch3_countdown':
      return 'Strike Robot Mindshare Challenge — Epoch 3 Starts In'
    case 'epoch3':
      return 'STRIKE ROBOT MINDSHARE CHALLENGE - EPOCH 3'
  }
}

/** Countdown target for the current phase; `null` when no timer should run. */
export function mindshareCountdownEndMs(phase: MindshareEpochPhase): number | null {
  switch (phase) {
    case 'epoch1':
      return EPOCH_1_END_MS
    case 'epoch2':
      return EPOCH_2_END_MS
    case 'epoch3_countdown':
      return EPOCH_3_START_MS
    case 'epoch3':
      return null
  }
}

/** Epoch number shown in article copy (1–3). */
export function mindshareArticleEpoch(phase: MindshareEpochPhase): 1 | 2 | 3 {
  if (phase === 'epoch1') return 1
  if (phase === 'epoch2') return 2
  return 3
}

/** True while Epoch 1–2 accept new CSV rows (closes at `EPOCH_2_END_MS`). */
export function isMindshareSubmissionOpen(nowMs = Date.now()): boolean {
  return nowMs < EPOCH_2_END_MS
}

/** @deprecated Prefer {@link isMindshareSubmissionOpen}. */
export function isEpoch2MindshareSubmissionOpen(phase: MindshareEpochPhase): boolean {
  return phase === 'epoch1' || phase === 'epoch2'
}
