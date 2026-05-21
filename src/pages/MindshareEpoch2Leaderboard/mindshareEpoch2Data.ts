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
  totalEngagement: number
}

export type Epoch2LeaderboardUser = {
  /** Display label (often submission `name`). */
  username: string
  /** X handle for avatar + profile link (Epoch 1 export or mindshare CSV). */
  xHandle?: string
  /** Profile image from X cache or Epoch 1 export. */
  avatarUrl?: string
  /** X display name when available. */
  displayName?: string
  wallet: string
  postCount: number
  score: number
  srEligible: boolean
  /** On-chain $SR from latest daily snapshot. */
  srBalance?: number
  /** SR eligibility for 15–18 + 20 May (05:00 UTC checkpoint snapshots). */
  checkpoints?: boolean[]
}

/** Full epoch checkpoint calendar — keep in sync with `lib/mindshareEpoch2Checkpoints.ts`. */
export const EPOCH2_CHECKPOINTS = [
  { dayKey: '2026-05-15', dateLabel: '15 May 2026' },
  { dayKey: '2026-05-16', dateLabel: '16 May 2026' },
  { dayKey: '2026-05-17', dateLabel: '17 May 2026' },
  { dayKey: '2026-05-18', dateLabel: '18 May 2026' },
  { dayKey: '2026-05-20', dateLabel: '20 May 2026' },
] as const

export type Epoch2CheckpointColumn = { dayKey: string; dateLabel: string }

/** Client fallback when API has no `checkpointDays` (matches server: all five columns). */
export function epoch2PublishedCheckpointsClient(_nowMs = Date.now()): Epoch2CheckpointColumn[] {
  return [...EPOCH2_CHECKPOINTS]
}

/** JSON from `GET /api/mindshare/test-epoch2-leaderboard` (matches server builder output). */
export type Epoch2LeaderboardApiPayload = {
  ok: true
  generatedAt: string
  /** Five checkpoint columns from the API (`epoch2CheckpointColumnsAll` on server). */
  checkpointDays?: Epoch2CheckpointColumn[]
  stats: Epoch2StatsInput
  users: Epoch2LeaderboardUser[]
  warnings: string[]
  /** From `epoch2_sr_eligible_wallets.json` when present; null if no snapshot yet. */
  eligibleAddresses?: string[] | null
  eligibleSnapshotUpdatedAt?: string | null
}

export const EPOCH2_PAGE_SIZE = 20
