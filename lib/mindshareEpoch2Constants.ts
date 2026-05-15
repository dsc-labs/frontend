/** Aligns with `MindshareChallenge.tsx` epoch window (Epoch 2 end = Epoch 1 end + 28d). */
export const EPOCH_1_END_MS = Date.parse('2026-04-22T17:00:00Z')
export const EPOCH_2_DURATION_MS = 28 * 24 * 60 * 60 * 1000
export const EPOCH_2_END_MS = EPOCH_1_END_MS + EPOCH_2_DURATION_MS

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
