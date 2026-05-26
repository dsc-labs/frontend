export type Epoch3LaneContent = {
  name: string
  allocation: string
  forItems: string[]
  howItems: string[]
  scoringItems: string[]
  note: string
}

export const EPOCH_3_DURATION =
  'Starts at 17:00 UTC, May 26, 2026 — runs for 60 days.'

export const EPOCH_3_LANES: Epoch3LaneContent[] = [
  {
    name: 'Operator Lane',
    allocation: '50% allocation',
    forItems: ['Creators & yappers', 'Ecosystem contributors', 'Active community members'],
    howItems: ['Content creation', 'Ecosystem contributions', 'Growing Strike Robot awareness'],
    scoringItems: ['AI-evaluated', 'Based on quality — not likes, reposts, or views'],
    note: 'Higher waitlist rank unlocks additional score multipliers.',
  },
  {
    name: 'Capital Lane',
    allocation: '50% allocation',
    forItems: ['$SR holders', '$VVV holders', 'Long-term ecosystem supporters'],
    howItems: [
      'Hold at least 10,000 $SR or 5 $VVV to be eligible for snapshots',
      'Points calculated based on USD value of holdings — snapshot every ~15 minutes',
      'Hold both $SR + $VVV to receive a ×1.2 points multiplier',
    ],
    scoringItems: [
      'Points accumulate per snapshot throughout the campaign',
      'Dropping below both minimums on a snapshot yields no points for that interval',
      'Higher cumulative points = higher rank.',
    ],
    note: 'A higher Operator Lane score increases your Capital Lane score.',
  },
]

export const EPOCH_3_SUBMISSION_REQUIREMENTS = [
  'Hold at least 10,000 $SR',
  'Join the SR Platform Waitlist',
  'X account must be verified and active for at least 3 months',
  'Submit contribution posts through the submission form',
] as const

export const EPOCH_3_CONTRIBUTOR_BENEFITS = [
  'Early access to the SR Platform',
  'Weekly activities and rewards',
  'Access to contributor discussions and team meetings',
  'Early previews of upcoming features',
] as const

export const EPOCH_3_CONTRIBUTOR_PATHS = [
  'Strike Robot Core Contributor',
  'Strike Robot Ambassador',
  'Long-term contributor with fixed compensation',
] as const
