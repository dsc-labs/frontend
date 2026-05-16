/**
 * StrikeRobot Mindshare Challenge — Epoch 2 scoring (see repo `score.md`).
 *
 * - **Quality (0–7)**: rubric / human; not derivable from URL alone (score.md §1).
 * - **Follower multiplier**: tiered table (score.md §3).
 * - **Per post**: `quality × followerMultiplier` (no engagement/interaction term in the current rubric).
 *
 * **§4 Instant snapshot (score.md)**: metrics are expected at submit time and locked thereafter.
 * This repo’s CSV pipeline still reads cached X metrics when building the leaderboard unless you
 * persist counts at submit time — align storage with §4 for production lock-in.
 */

export const MAX_QUALITY = 7

/** @deprecated Interaction is not part of the current score.md rubric; kept for legacy callers. */
export const MAX_INTERACTION = 0

/** @deprecated Quality gate for interaction was removed with the interaction term. */
export const EPOCH2_QUALITY_GATE_EXCLUSIVE = 0

/** Follower tier multiplier (score.md §3; inclusive lower bounds on tiers). */
export function followerMultiplier(followers: number): number {
  const f = Math.max(0, Math.floor(followers))
  if (f < 3001) return 1.0
  if (f < 5001) return 1.1
  if (f < 10001) return 1.2
  if (f < 20001) return 1.3
  if (f < 50001) return 1.4
  return 1.5
}

export function clampQualityScore(quality: number): number {
  if (!Number.isFinite(quality)) return 0
  const q = Math.max(0, Math.min(MAX_QUALITY, quality))
  return Math.round(q * 100) / 100
}

/**
 * Per score.md: `quality × followerMultiplier` (quality on 0–7).
 */
export function epoch2FinalScoreFromComponents(
  qualityScore: number,
  authorFollowerCount: number,
): number {
  const q = clampQualityScore(qualityScore)
  const m = followerMultiplier(authorFollowerCount)
  return Math.round(q * m * 100) / 100
}

export type Epoch2PostScoreInput = {
  /** 0–7 from rubric / reviewer (score.md §1). */
  qualityScore: number
  /** Optional snapshot fields (§4 / display); not used in score math. */
  views?: number
  comments?: number
  retweets?: number
}

/**
 * One post: quality × follower multiplier for the author.
 */
export function epoch2FinalScoreForPost(
  post: Epoch2PostScoreInput,
  authorFollowerCount: number,
): number {
  return epoch2FinalScoreFromComponents(post.qualityScore, authorFollowerCount)
}

/** Sum of per-post scores for one participant in the epoch. */
export function epoch2ParticipantTotalScore(
  posts: Epoch2PostScoreInput[],
  authorFollowerCount: number,
): number {
  let sum = 0
  for (const p of posts) {
    sum += epoch2FinalScoreForPost(p, authorFollowerCount)
  }
  return Math.round(sum * 100) / 100
}

/** Optional breakdown for UI or audits. */
export function epoch2ScoreBreakdown(post: Epoch2PostScoreInput, authorFollowerCount: number) {
  const quality = clampQualityScore(post.qualityScore)
  const multiplier = followerMultiplier(authorFollowerCount)
  const final = epoch2FinalScoreFromComponents(quality, authorFollowerCount)
  return {
    quality,
    multiplier,
    final,
  }
}
