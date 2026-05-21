/** Aligns with `src/lib/mindshareEpochSchedule.ts` — do not change instants without updating both files. */
export const EPOCH_1_END_MS = Date.parse('2026-04-22T17:00:00Z')
export const EPOCH_2_END_MS = Date.parse('2026-05-21T00:00:00+07:00')
export const EPOCH_2_DURATION_MS = EPOCH_2_END_MS - EPOCH_1_END_MS
export const EPOCH_3_GAP_MS = 3 * 24 * 60 * 60 * 1000
export const EPOCH_3_START_MS = EPOCH_2_END_MS + EPOCH_3_GAP_MS

/** Public `/epoch2` engagement cards (update after full metrics pass or set `MINDSHARE_EPOCH2_USE_COMPUTED_ENGAGEMENT_STATS=1`). */
export const EPOCH2_PUBLIC_ENGAGEMENT_STATS = {
  totalLikes: 31_842,
  totalComments: 12_476,
  totalRetweets: 4_983,
  totalEngagement: 31_842 + 12_476 + 4_983,
} as const

/** Score multiplier for posts counted on the **first** (bootstrap) midnight snapshot. */
export const EPOCH2_FIRST_SNAPSHOT_SCORE_MULTIPLIER = 5

/** SR / score snapshots run at this UTC hour on {@link EPOCH2_CHECKPOINT_DAY_KEYS}. */
export const EPOCH2_SNAPSHOT_UTC_HOUR = 5

/** Eligibility days shown as status checkpoints (15–18 + 20 May; no 19 May tick). */
export const EPOCH2_CHECKPOINT_DAY_KEYS = [
  '2026-05-15',
  '2026-05-16',
  '2026-05-17',
  '2026-05-18',
  '2026-05-20',
] as const

export type Epoch2CheckpointDayKey = (typeof EPOCH2_CHECKPOINT_DAY_KEYS)[number]

/** Written into snapshot JSON metadata. */
export const EPOCH2_SNAPSHOT_CRON_NOTE =
  'Checkpoint snapshots at 05:00 UTC on 15–18 + 20 May 2026 (Vercel: 0 5 15,16,17,18,20 5 *)'

/** Mindshare form + API submissions (closes when Epoch 2 ends). */
export function isMindshareSubmissionOpen(nowMs = Date.now()): boolean {
  return nowMs < EPOCH_2_END_MS
}

export function epoch2DaysRemaining(nowMs = Date.now()): number {
  const t = EPOCH_2_END_MS - nowMs
  if (t <= 0) return 0
  return Math.ceil(t / (24 * 60 * 60 * 1000))
}

/**
 * Epoch 2 **daily SR eligibility snapshot** (cron `/api/mindshare/epoch2-sr-snapshot`):
 * a mindshare submission wallet counts as eligible iff on-chain $SR **strictly exceeds** this value
 * (human token units). Not read from env — product rule is fixed at 10,000.
 */
export const EPOCH2_MINDSHARE_SR_SNAPSHOT_THRESHOLD_EXCLUSIVE = 10_000

/** Epoch 1 prize winners (ranks 1–101) do not receive Epoch 1 score carryover; they may still appear on Epoch 2. */
export const EPOCH1_PRIZE_WINNER_MAX_RANK = 101
/** Epoch 1 ranks 102+ merge into Epoch 2 as cumulative score/post baselines. */
export const EPOCH1_CARRYOVER_MIN_RANK = 102
