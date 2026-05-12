import {
  extractPostUrlsFromSubmissionField,
  readMindshareSubmissionsCsv,
  type MindshareSubmissionRow,
} from './mindshareCsvStore'
import { epoch2DaysRemaining } from './mindshareEpoch2Constants'
import {
  cacheEntryFresh,
  readEpoch2MetricsCache,
  writeEpoch2MetricsCache,
} from './mindshareEpoch2MetricsCache'
import { epoch2FinalScoreForPost, type Epoch2PostScoreInput } from './mindshareEpoch2Score'
import {
  extractTweetIdFromStatusUrl,
  fetchTweetMetricsByIds,
  fetchUserByUsername,
  normalizeXUsername,
  type TweetMetricsSnapshot,
} from './xTweetMetrics'

export type Epoch2ApiStats = {
  totalParticipants: number
  totalMindsharePosts: number
  totalScore: number
  daysRemaining: number
  totalLikes: number
  totalComments: number
  totalRetweets: number
}

export type Epoch2ApiUser = {
  username: string
  wallet: string
  postCount: number
  score: number
}

export type MindshareEpoch2LeaderboardPayload = {
  ok: true
  generatedAt: string
  stats: Epoch2ApiStats
  users: Epoch2ApiUser[]
  warnings: string[]
}

function defaultQualityScore(): number {
  const raw = Number(process.env.MINDSHARE_EPOCH2_DEFAULT_QUALITY ?? '2.5')
  if (!Number.isFinite(raw)) return 2.5
  return Math.max(0, Math.min(5, raw))
}

function defaultCacheTtlMs(): number {
  const n = Number(process.env.MINDSHARE_EPOCH2_CACHE_TTL_MS ?? String(60 * 60 * 1000))
  return Number.isFinite(n) && n >= 0 ? n : 60 * 60 * 1000
}

function walletKey(wallet: string): string {
  return wallet.trim().toLowerCase()
}

function displayUsername(row: MindshareSubmissionRow): string {
  const name = row.name.trim()
  if (name) return name
  const h = row.xHandle.trim()
  return h.startsWith('@') ? h : `@${h}`
}

/** Retweets + quote-tweets as “reposts” for engagement. */
function retweetsForScore(m: TweetMetricsSnapshot): number {
  return m.retweetCount + m.quoteCount
}

export async function buildMindshareEpoch2LeaderboardPayload(options: {
  bearerToken: string | undefined
  csvPath?: string
  forceRefresh: boolean
}): Promise<MindshareEpoch2LeaderboardPayload> {
  const warnings: string[] = []
  const generatedAt = new Date().toISOString()
  const nowMs = Date.now()
  const ttlMs = defaultCacheTtlMs()
  const defaultQ = defaultQualityScore()

  const rows = await readMindshareSubmissionsCsv(options.csvPath)
  if (rows.length === 0) {
    return {
      ok: true,
      generatedAt,
      stats: {
        totalParticipants: 0,
        totalMindsharePosts: 0,
        totalScore: 0,
        daysRemaining: epoch2DaysRemaining(nowMs),
        totalLikes: 0,
        totalComments: 0,
        totalRetweets: 0,
      },
      users: [],
      warnings: [],
    }
  }

  const cache = await readEpoch2MetricsCache()
  const bearer = options.bearerToken?.trim()

  const tweetIdSet = new Set<string>()
  const handleSet = new Set<string>()
  for (const row of rows) {
    handleSet.add(normalizeXUsername(row.xHandle))
    for (const url of extractPostUrlsFromSubmissionField(row.postSubmitted)) {
      const id = extractTweetIdFromStatusUrl(url)
      if (id) tweetIdSet.add(id)
    }
  }

  if (bearer) {
    const handlesToFetch: string[] = []
    for (const h of Array.from(handleSet)) {
      if (!h) continue
      const c = cache.users[h]
      if (options.forceRefresh || !c || !cacheEntryFresh(c.at, ttlMs, nowMs)) {
        handlesToFetch.push(h)
      }
    }
    for (const h of handlesToFetch) {
      const { user, error } = await fetchUserByUsername(bearer, h)
      if (error) warnings.push(`${h}: ${error}`)
      cache.users[h] = {
        at: generatedAt,
        followersCount: user?.followersCount ?? 0,
      }
    }

    const tweetIdsToFetch: string[] = []
    for (const id of Array.from(tweetIdSet)) {
      const c = cache.tweets[id]
      if (options.forceRefresh || !c || !cacheEntryFresh(c.at, ttlMs, nowMs)) {
        tweetIdsToFetch.push(id)
      }
    }
    if (tweetIdsToFetch.length > 0) {
      const { byId, errors } = await fetchTweetMetricsByIds(bearer, tweetIdsToFetch)
      for (const e of errors) warnings.push(e)
      for (const [id, snapshot] of Array.from(byId.entries())) {
        cache.tweets[id] = { at: generatedAt, snapshot }
      }
      const missing = tweetIdsToFetch.filter((id) => !byId.has(id))
      if (missing.length > 0) {
        warnings.push(
          `${missing.length} linked post(s) were not returned by X (deleted, private, or invalid URL).`,
        )
      }
    }

    await writeEpoch2MetricsCache(cache)
  } else {
    warnings.push('TWITTER_BEARER_TOKEN is not set; scores are 0 (CSV only).')
  }

  type Agg = { wallet: string; username: string; score: number; posts: number }
  const byWallet = new Map<string, Agg>()
  const engagementByTweetId = new Map<string, TweetMetricsSnapshot>()

  const getSnapshot = (tweetId: string): TweetMetricsSnapshot | null => {
    return cache.tweets[tweetId]?.snapshot ?? null
  }

  for (const row of rows) {
    const wk = walletKey(row.walletAddress)
    if (!wk) {
      warnings.push(`Row skipped: missing wallet for ${row.xHandle}`)
      continue
    }
    const h = normalizeXUsername(row.xHandle)
    const followers = h ? (cache.users[h]?.followersCount ?? 0) : 0
    const urls = extractPostUrlsFromSubmissionField(row.postSubmitted)

    if (!byWallet.has(wk)) {
      byWallet.set(wk, {
        wallet: row.walletAddress.trim(),
        username: displayUsername(row),
        score: 0,
        posts: 0,
      })
    }
    const agg = byWallet.get(wk)!

    for (const url of urls) {
      const tweetId = extractTweetIdFromStatusUrl(url)
      if (!tweetId) {
        warnings.push(`Unrecognized post URL (need x.com/.../status/<id>): ${url.slice(0, 80)}`)
        continue
      }
      const snap = getSnapshot(tweetId)
      if (!snap) {
        continue
      }
      agg.posts += 1
      engagementByTweetId.set(tweetId, snap)

      const post: Epoch2PostScoreInput = {
        qualityScore: defaultQ,
        views: snap.impressionCount,
        comments: snap.replyCount,
        retweets: retweetsForScore(snap),
      }
      const add = epoch2FinalScoreForPost(post, followers)
      agg.score += add
    }
  }

  const users: Epoch2ApiUser[] = Array.from(byWallet.values())
    .filter((u) => u.posts > 0)
    .map((u) => ({
      username: u.username,
      wallet: u.wallet,
      postCount: u.posts,
      score: Math.round(u.score * 100) / 100,
    }))
    .sort((a, b) => b.score - a.score)

  let totalLikes = 0
  let totalComments = 0
  let totalRetweets = 0
  for (const m of Array.from(engagementByTweetId.values())) {
    totalLikes += m.likeCount
    totalComments += m.replyCount
    totalRetweets += retweetsForScore(m)
  }

  const totalScore = users.reduce((s, u) => s + u.score, 0)
  const totalPosts = users.reduce((s, u) => s + u.postCount, 0)

  return {
    ok: true,
    generatedAt,
    stats: {
      totalParticipants: users.length,
      totalMindsharePosts: totalPosts,
      totalScore: Math.round(totalScore * 100) / 100,
      daysRemaining: epoch2DaysRemaining(nowMs),
      totalLikes,
      totalComments,
      totalRetweets,
    },
    users,
    warnings: [],
  }
}
