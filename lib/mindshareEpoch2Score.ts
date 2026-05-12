/**
 * StrikeRobot Mindshare Challenge — Epoch 2 scoring (see repo `score.md`).
 *
 * - **Quality (0–5)**: not derivable from metrics alone; supply from human review, rubric, or model.
 * - **Engagement (0–5)**: proportional to views / comments / retweets vs targets for “max” (50k / 100 / 100).
 * - **Follower multiplier**: tiered by follower count.
 * - **Per post**: `(quality + engagement) × followerMultiplier` (same multiplier for all posts of that author).
 * - **Participant total**: sum of per-post finals (typical); change to average if product prefers.
 */

const MAX_QUALITY = 5
const MAX_ENGAGEMENT = 5

/** Approximate thresholds for full engagement points (score.md). */
export const EPOCH2_ENGAGEMENT_TARGETS = {
  views: 50_000,
  comments: 100,
  retweets: 100,
} as const

function clamp01(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(1, n)
}

/** 0–5 from organic views / comments / retweets (equal weight on each capped axis). */
export function engagementScoreFromMetrics(
  views: number,
  comments: number,
  retweets: number,
): number {
  const rv = clamp01(views / EPOCH2_ENGAGEMENT_TARGETS.views)
  const rc = clamp01(comments / EPOCH2_ENGAGEMENT_TARGETS.comments)
  const rr = clamp01(retweets / EPOCH2_ENGAGEMENT_TARGETS.retweets)
  const raw = (MAX_ENGAGEMENT * (rv + rc + rr)) / 3
  return Math.round(raw * 100) / 100
}

/** Follower tier multiplier (score.md table; inclusive lower bounds). */
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

export function clampEngagementScore(engagement: number): number {
  if (!Number.isFinite(engagement)) return 0
  const e = Math.max(0, Math.min(MAX_ENGAGEMENT, engagement))
  return Math.round(e * 100) / 100
}

/**
 * Exact formula from score.md: `(quality + engagement) × followerMultiplier`
 * with both subscores already on 0–5 (e.g. reviewer engagement 4.0).
 */
export function epoch2FinalScoreFromComponents(
  qualityScore: number,
  engagementScore: number,
  authorFollowerCount: number,
): number {
  const q = clampQualityScore(qualityScore)
  const e = clampEngagementScore(engagementScore)
  const m = followerMultiplier(authorFollowerCount)
  return Math.round((q + e) * m * 100) / 100
}

export type Epoch2PostScoreInput = {
  /** 0–5 from rubric / reviewer / LLM (not auto from URL alone). */
  qualityScore: number
  views: number
  comments: number
  retweets: number
}

/**
 * One post: engagement from metrics (0–5), quality supplied, same multiplier for the author.
 * For purely manual engagement (like the worked example), use {@link epoch2FinalScoreFromComponents} instead.
 */
export function epoch2FinalScoreForPost(
  post: Epoch2PostScoreInput,
  authorFollowerCount: number,
): number {
  const e = engagementScoreFromMetrics(post.views, post.comments, post.retweets)
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
  const engagement = engagementScoreFromMetrics(post.views, post.comments, post.retweets)
  const multiplier = followerMultiplier(authorFollowerCount)
  const final = epoch2FinalScoreFromComponents(quality, engagement, authorFollowerCount)
  return { quality, engagement, multiplier, final }
}
