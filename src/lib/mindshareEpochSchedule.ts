/**
 * Mindshare challenge epoch windows.
 *
 * All “midnight” boundaries are **00:00 GMT+7** (same as the Epoch 2 SR cron).
 *
 * Timeline:
 * - **Epoch 2 ends** → tonight’s midnight GMT+7 after the last Epoch 2 day (May 21, 2026 00:00 GMT+7).
 *   At that instant: Epoch 3 intro copy + “Starts In” countdown; `/mindshare-submit` closes.
 * - **Epoch 3 starts** → **3 full days later** at the next midnight GMT+7 (May 24, 2026 00:00 GMT+7).
 */

/** Epoch 1 ends at 00:00 GMT+7 on 23 Apr 2026 (= 22 Apr 2026 17:00 UTC). */
export const EPOCH_1_END_MS = Date.parse('2026-04-22T17:00:00Z')

/** Epoch 2 ends at 00:00 GMT+7 on 21 May 2026 (28 days after Epoch 1 end). */
export const EPOCH_2_END_MS = Date.parse('2026-05-21T00:00:00+07:00')

/** Three midnights between Epoch 2 end and Epoch 3 start. */
export const EPOCH_3_GAP_MS = 3 * 24 * 60 * 60 * 1000

/** Epoch 3 starts at 00:00 GMT+7 on 24 May 2026. */
export const EPOCH_3_START_MS = EPOCH_2_END_MS + EPOCH_3_GAP_MS

export const EPOCH_2_END_GMT7_LABEL = '12:00 AM GMT+7, May 21, 2026'
export const EPOCH_3_START_GMT7_LABEL = '12:00 AM GMT+7, May 24, 2026'

const GMT7_OFFSET_MS = 7 * 60 * 60 * 1000
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Calendar date `YYYY-MM-DD` for instant `ms` in GMT+7. */
export function gmt7DayKeyFromMs(ms: number): string {
  return new Date(ms + GMT7_OFFSET_MS).toISOString().slice(0, 10)
}

/** Start of GMT+7 calendar day `dayKey` as UTC epoch ms. */
export function gmt7DayStartMs(dayKey: string): number {
  return Date.parse(`${dayKey}T00:00:00+07:00`)
}

/** Next 00:00 GMT+7 after `nowMs` (daily leaderboard snapshot tick). */
export function nextGmt7MidnightMs(nowMs = Date.now()): number {
  return gmt7DayStartMs(gmt7DayKeyFromMs(nowMs)) + MS_PER_DAY
}

/** When false, the challenge page shows a disabled Epoch 2 Leaderboard control (no link to `/sraaaepoch2`). */
export const EPOCH2_LEADERBOARD_PUBLIC = false

export function isEpoch2LeaderboardPublic(): boolean {
  return EPOCH2_LEADERBOARD_PUBLIC
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

/** True while Epoch 1–2 accept new CSV rows (closes at `EPOCH_2_END_MS`, midnight GMT+7 after last Epoch 2 day). */
export function isMindshareSubmissionOpen(nowMs = Date.now()): boolean {
  return nowMs < EPOCH_2_END_MS
}

/** @deprecated Prefer {@link isMindshareSubmissionOpen}. */
export function isEpoch2MindshareSubmissionOpen(phase: MindshareEpochPhase): boolean {
  return phase === 'epoch1' || phase === 'epoch2'
}
