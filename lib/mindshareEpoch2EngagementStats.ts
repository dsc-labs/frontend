import type { MindshareSubmissionRow } from './mindshareCsvStore'
import { EPOCH2_PUBLIC_ENGAGEMENT_STATS } from './mindshareEpoch2Constants'
import { flattenMindshareSubmissionPosts } from './mindshareEpoch2Posts'
import type { Epoch2MetricsCacheFile } from './mindshareEpoch2MetricsCache'
import type { TweetMetricsSnapshot } from './xTweetMetrics'

export type Epoch2EngagementTotals = {
  totalLikes: number
  totalComments: number
  totalRetweets: number
  totalEngagement: number
}

function retweetsForEngagement(m: TweetMetricsSnapshot): number {
  return m.retweetCount + m.quoteCount
}

/** Sum likes / comments / retweets for every unique tweet URL in the submissions CSV (metrics cache). */
export function computeEpoch2EngagementFromCsvAndCache(
  rows: MindshareSubmissionRow[],
  cache: Epoch2MetricsCacheFile,
): Epoch2EngagementTotals {
  const posts = flattenMindshareSubmissionPosts(rows)
  const seen = new Set<string>()
  let totalLikes = 0
  let totalComments = 0
  let totalRetweets = 0
  for (const p of posts) {
    if (seen.has(p.tweetId)) continue
    seen.add(p.tweetId)
    const snap = cache.tweets[p.tweetId]?.snapshot
    if (!snap) continue
    totalLikes += snap.likeCount
    totalComments += snap.replyCount
    totalRetweets += retweetsForEngagement(snap)
  }
  return {
    totalLikes,
    totalComments,
    totalRetweets,
    totalEngagement: totalLikes + totalComments + totalRetweets,
  }
}

/**
 * Stats row engagement for the public leaderboard.
 * Default: {@link EPOCH2_PUBLIC_ENGAGEMENT_STATS}. Set `MINDSHARE_EPOCH2_USE_COMPUTED_ENGAGEMENT_STATS=1` to sum from cache.
 */
export function resolveEpoch2EngagementTotals(
  rows: MindshareSubmissionRow[],
  cache: Epoch2MetricsCacheFile,
): Epoch2EngagementTotals {
  if (process.env.MINDSHARE_EPOCH2_USE_COMPUTED_ENGAGEMENT_STATS === '1') {
    return computeEpoch2EngagementFromCsvAndCache(rows, cache)
  }
  return { ...EPOCH2_PUBLIC_ENGAGEMENT_STATS }
}

export function applyEpoch2EngagementToStats<T extends Epoch2EngagementTotals>(
  stats: T,
  engagement: Epoch2EngagementTotals,
): T {
  return {
    ...stats,
    totalLikes: engagement.totalLikes,
    totalComments: engagement.totalComments,
    totalRetweets: engagement.totalRetweets,
    totalEngagement: engagement.totalEngagement,
  }
}
