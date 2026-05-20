import type { Epoch2ApiUser } from './mindshareEpoch2LeaderboardBuild'
import { userHasAnyCheckpointEligible } from './mindshareEpoch2Checkpoints'

function isRankedEligible(u: Epoch2ApiUser): boolean {
  return u.srEligible || userHasAnyCheckpointEligible(u.checkpoints)
}

/** Eligible competitors first (highest score first), then not eligible (highest score first). */
export function sortEpoch2UsersByEligibilityThenScore(users: Epoch2ApiUser[]): Epoch2ApiUser[] {
  const eligible = users.filter(isRankedEligible).sort((a, b) => b.score - a.score)
  const ineligible = users.filter((u) => !isRankedEligible(u)).sort((a, b) => b.score - a.score)
  return [...eligible, ...ineligible]
}
