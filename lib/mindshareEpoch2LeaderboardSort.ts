import type { Epoch2ApiUser } from './mindshareEpoch2LeaderboardBuild'

/** Eligible competitors first (highest score first), then not eligible (highest score first). */
export function sortEpoch2UsersByEligibilityThenScore(users: Epoch2ApiUser[]): Epoch2ApiUser[] {
  const eligible = users.filter((u) => u.srEligible).sort((a, b) => b.score - a.score)
  const ineligible = users.filter((u) => !u.srEligible).sort((a, b) => b.score - a.score)
  return [...eligible, ...ineligible]
}
