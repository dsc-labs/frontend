import type { Epoch2ApiUser } from './mindshareEpoch2LeaderboardBuild'
import { userHasAnyCheckpointEligible } from './mindshareEpoch2Checkpoints'

function isRankedEligible(u: Epoch2ApiUser): boolean {
  return u.srEligible || userHasAnyCheckpointEligible(u.checkpoints)
}

/** ≥1 checkpoint tick ranks above latest-night-only `srEligible` with zero ticks; then score. */
export function compareEpoch2RankByCheckpointThenScore(a: Epoch2ApiUser, b: Epoch2ApiUser): number {
  const aTick = userHasAnyCheckpointEligible(a.checkpoints) ? 1 : 0
  const bTick = userHasAnyCheckpointEligible(b.checkpoints) ? 1 : 0
  if (bTick !== aTick) return bTick - aTick
  return b.score - a.score
}

/** Eligible pool first; within it, checkpoint ticks before score-only eligible; then not eligible by score. */
export function sortEpoch2UsersByEligibilityThenScore(users: Epoch2ApiUser[]): Epoch2ApiUser[] {
  const eligible = users.filter(isRankedEligible).sort(compareEpoch2RankByCheckpointThenScore)
  const ineligible = users.filter((u) => !isRankedEligible(u)).sort((a, b) => b.score - a.score)
  return [...eligible, ...ineligible]
}
