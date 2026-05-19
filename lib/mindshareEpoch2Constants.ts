/** Aligns with `MindshareChallenge.tsx` epoch window (Epoch 2 end = Epoch 1 end + 28d). */
export const EPOCH_1_END_MS = Date.parse('2026-04-22T17:00:00Z')
export const EPOCH_2_DURATION_MS = 28 * 24 * 60 * 60 * 1000
export const EPOCH_2_END_MS = EPOCH_1_END_MS + EPOCH_2_DURATION_MS

/** Public `/epoch2` engagement cards (update after full metrics pass or set `MINDSHARE_EPOCH2_USE_COMPUTED_ENGAGEMENT_STATS=1`). */
export const EPOCH2_PUBLIC_ENGAGEMENT_STATS = {
  totalLikes: 31_842,
  totalComments: 12_476,
  totalRetweets: 4_983,
  totalEngagement: 31_842 + 12_476 + 4_983,
} as const

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
