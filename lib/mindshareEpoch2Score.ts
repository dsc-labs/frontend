/**
 * StrikeRobot Mindshare Challenge — Epoch 2 scoring (see repo `score.md`).
 *
 * - **Quality (0–7)**: rubric / human; not derivable from URL alone.
 * - **Interaction (0–3)**: `MIN(3, comments×0.01 + retweets×0.04)`; views and likes are not used.
 * - **Quality gate**: quality ≤ 3 → interaction = 0 (score.md §2).
 * - **Follower multiplier**: tiered table (score.md §3).
 * - **Per post**: `(quality + interaction) × followerMultiplier`.
 *
 * **§4 Instant snapshot (score.md)**: metrics are expected at submit time and locked thereafter.
 * This repo’s CSV pipeline still reads live X metrics when building the leaderboard unless you
 * persist counts at submit time — align storage with §4 for production lock-in.
 */

export const MAX_QUALITY = 7
export const MAX_INTERACTION = 3

const COMMENT_WEIGHT = 0.01
const RETWEET_WEIGHT = 0.04

/** Quality above this (on 0–7 scale) unlocks interaction scoring (score.md). */
export const EPOCH2_QUALITY_GATE_EXCLUSIVE = 3

/**
 * Raw interaction points from comments + retweets/reposts only, capped at 3 (score.md §2).
 * Likes and views are intentionally excluded.
 */
export function interactionScoreFromCommentsRetweets(comments: number, retweets: number): number {
  const c = Math.max(0, Number.isFinite(comments) ? comments : 0)
  const r = Math.max(0, Number.isFinite(retweets) ? retweets : 0)
  const raw = c * COMMENT_WEIGHT + r * RETWEET_WEIGHT
  return Math.round(Math.min(MAX_INTERACTION, raw) * 100) / 100
}

/**
 * Interaction score after quality gate: quality ≤ 3 → 0; else same as
 * {@link interactionScoreFromCommentsRetweets}.
 */
export function engagementScoreAfterQualityGate(
  qualityScore: number,
  comments: number,
  retweets: number,
): number {
  const q = clampQualityScore(qualityScore)
  if (q <= EPOCH2_QUALITY_GATE_EXCLUSIVE) return 0
  return interactionScoreFromCommentsRetweets(comments, retweets)
}

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

export function clampInteractionScore(interaction: number): number {
  if (!Number.isFinite(interaction)) return 0
  const e = Math.max(0, Math.min(MAX_INTERACTION, interaction))
  return Math.round(e * 100) / 100
}

/**
 * Per score.md: `(quality + interaction) × followerMultiplier`
 * with quality on 0–7 and interaction on 0–3.
 */
export function epoch2FinalScoreFromComponents(
  qualityScore: number,
  interactionScore: number,
  authorFollowerCount: number,
): number {
  const q = clampQualityScore(qualityScore)
  const e = clampInteractionScore(interactionScore)
  const m = followerMultiplier(authorFollowerCount)
  return Math.round((q + e) * m * 100) / 100
}

export type Epoch2PostScoreInput = {
  /** 0–7 from rubric / reviewer (score.md §1). */
  qualityScore: number
  /** Unused for interaction math (score.md excludes views); kept for §4 submit snapshots / API shape. */
  views: number
  comments: number
  retweets: number
}

/**
 * One post: interaction from comments + retweets with quality gate; same follower multiplier for the author.
 */
export function epoch2FinalScoreForPost(
  post: Epoch2PostScoreInput,
  authorFollowerCount: number,
): number {
  const e = engagementScoreAfterQualityGate(post.qualityScore, post.comments, post.retweets)
  return epoch2FinalScoreFromComponents(post.qualityScore, e, authorFollowerCount)
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
  const rawInteraction = interactionScoreFromCommentsRetweets(post.comments, post.retweets)
  const interaction = engagementScoreAfterQualityGate(post.qualityScore, post.comments, post.retweets)
  const multiplier = followerMultiplier(authorFollowerCount)
  const final = epoch2FinalScoreFromComponents(quality, interaction, authorFollowerCount)
  return {
    quality,
    rawInteraction,
    interaction,
    interactionGated: quality <= EPOCH2_QUALITY_GATE_EXCLUSIVE,
    multiplier,
    final,
  }
}
