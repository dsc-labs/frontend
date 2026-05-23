/**
 * Mindshare challenge epoch windows.
 *
 * Epoch 2 SR/score snapshots run at 05:00 UTC on checkpoint tick days (see `lib/mindshareEpoch2Gmt7.ts`).
 * UI copy only shows `EPOCH_3_START_UTC_LABEL`; other boundaries are not labeled on the site.
 */

/** Epoch 1 end (17:00 UTC, 22 Apr 2026). */
export const EPOCH_1_END_MS = Date.parse('2026-04-22T17:00:00Z')

/** Epoch 2 end — same instant as before UI copy changes (17:00 UTC, 20 May 2026). */
export const EPOCH_2_END_MS = Date.parse('2026-05-21T00:00:00+07:00')

/** 6 days between Epoch 2 end and Epoch 3 start. */
export const EPOCH_3_GAP_MS = 6 * 24 * 60 * 60 * 1000

/** Epoch 3 start — always derived so the gap stays exactly 6×24h after Epoch 2 end. */
export const EPOCH_3_START_MS = EPOCH_2_END_MS + EPOCH_3_GAP_MS

/** Only user-facing schedule instant (all other boundaries stay internal). */
export const EPOCH_3_START_UTC_LABEL = '17:00 UTC, May 26, 2026'

/** Checkpoint tick days (keep in sync with `lib/mindshareEpoch2Constants.ts`). */
const EPOCH2_CHECKPOINT_TICK_DAYS = [
  '2026-05-15',
  '2026-05-16',
  '2026-05-17',
  '2026-05-18',
  '2026-05-20',
] as const

const EPOCH2_SNAPSHOT_UTC_HOUR = 5
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Next 05:00 UTC checkpoint snapshot strictly after `nowMs`. */
export function nextTomorrowGmt7MidnightMs(nowMs = Date.now()): number {
  for (let i = 0; i < 32; i += 1) {
    const probe = nowMs + i * MS_PER_DAY
    const dayKey = new Date(probe).toISOString().slice(0, 10)
    if (!(EPOCH2_CHECKPOINT_TICK_DAYS as readonly string[]).includes(dayKey)) continue
    const target = Date.parse(
      `${dayKey}T${String(EPOCH2_SNAPSHOT_UTC_HOUR).padStart(2, '0')}:00:00.000Z`,
    )
    if (target > nowMs) return target
  }
  const last = EPOCH2_CHECKPOINT_TICK_DAYS[EPOCH2_CHECKPOINT_TICK_DAYS.length - 1]!
  return Date.parse(`${last}T${String(EPOCH2_SNAPSHOT_UTC_HOUR).padStart(2, '0')}:00:00.000Z`)
}

export const nextDailySnapshotUtcMs = nextTomorrowGmt7MidnightMs
export const nextGmt7MidnightMs = nextTomorrowGmt7MidnightMs

/**
 * Epoch 2 leaderboard table (`/sraaaepoch2`). Kept off the challenge page; use preview gate below instead.
 */
export function isEpoch2LeaderboardTablePublic(_nowMs = Date.now()): boolean {
  return false
}

/**
 * After the next “tomorrow midnight” tick (05:00 UTC on a checkpoint day): the challenge-page
 * “Epoch 2 Leaderboard” control links to `/mindshare-leaderboard`.
 */
export function isEpoch2LeaderboardLinkedFromChallenge(nowMs = Date.now()): boolean {
  return nowMs >= nextTomorrowGmt7MidnightMs(nowMs)
}

/** @deprecated Use {@link isEpoch2LeaderboardLinkedFromChallenge}. */
export function isEpoch3PreviewLinkedFromChallenge(nowMs = Date.now()): boolean {
  return isEpoch2LeaderboardLinkedFromChallenge(nowMs)
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
      return 'The Race to Become a Strike Robot Contributor — Starts In'
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
