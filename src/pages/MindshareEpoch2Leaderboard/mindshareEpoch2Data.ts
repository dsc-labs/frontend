/** Types and constants for the Epoch 2 leaderboard page. */

export type Epoch2StatsInput = {
  totalParticipants: number
  eligibleParticipants: number
  notEligibleParticipants: number
  totalMindsharePosts: number
  totalScore: number
  daysRemaining: number
  totalLikes: number
  totalComments: number
  totalRetweets: number
}

export type Epoch2LeaderboardUser = {
  username: string
  wallet: string
  postCount: number
  score: number
  srEligible: boolean
}

/** JSON from `GET /api/mindshare/test-epoch2-leaderboard` (matches server builder output). */
export type Epoch2LeaderboardApiPayload = {
  ok: true
  generatedAt: string
  stats: Epoch2StatsInput
  users: Epoch2LeaderboardUser[]
  warnings: string[]
  /** From `epoch2_sr_eligible_wallets.json` when present; null if no snapshot yet. */
  eligibleAddresses?: string[] | null
  eligibleSnapshotUpdatedAt?: string | null
}

export const EPOCH2_PAGE_SIZE = 5
