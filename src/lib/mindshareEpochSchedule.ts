/** Mindshare challenge epoch windows (17:00 UTC boundaries; aligned with server `mindshareEpoch2Constants`). */

export const EPOCH_1_END_MS = Date.parse('2026-04-22T17:00:00Z')
export const EPOCH_2_DURATION_MS = 28 * 24 * 60 * 60 * 1000
export const EPOCH_2_END_MS = EPOCH_1_END_MS + EPOCH_2_DURATION_MS
/** Gap after Epoch 2 ends before Epoch 3 starts. */
export const EPOCH_3_GAP_MS = 3 * 24 * 60 * 60 * 1000
export const EPOCH_3_START_MS = EPOCH_2_END_MS + EPOCH_3_GAP_MS

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
      return 'Strike Robot Mindshare Challenge — Epoch 3 Begins In'
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
