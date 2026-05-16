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
  type Epoch2MetricsCacheFile,
} from './mindshareEpoch2MetricsCache'
import { epoch2FinalScoreForPost, type Epoch2PostScoreInput } from './mindshareEpoch2Score'
import { loadEpoch2MindshareEligibleBySrHold } from './mindshareEpoch2SrEligibility'
import {
  readEpoch2SrEligibleWalletsFromSnapshot,
  type Epoch2SrEligibleWalletsFile,
} from './mindshareEpoch2SrSnapshot'
import { getServerBaseRpcUrl } from './serverBaseRpc'
import {
  extractTweetIdFromStatusUrl,
  fetchTweetMetricsByIds,
  fetchUserByUsername,
  normalizeXUsername,
  type TweetMetricsSnapshot,
} from './xTweetMetrics'

function epoch2MinSrTokens(): number {
  const n = Number(process.env.MINDSHARE_EPOCH2_MIN_SR_TOKENS ?? '10000')
  if (!Number.isFinite(n) || n < 0) return 10_000
  return n
}

export type Epoch2ApiStats = {
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

export type Epoch2ApiUser = {
  username: string
  wallet: string
  postCount: number
  score: number
  /** From daily SR eligibility snapshot (or live fallback when enabled). */
  srEligible: boolean
}

export type MindshareEpoch2LeaderboardPayload = {
  ok: true
  generatedAt: string
  stats: Epoch2ApiStats
  users: Epoch2ApiUser[]
  /** Always empty on public responses; operational detail stays in server logs. */
  warnings: string[]
  /** Wallets from last SR eligibility snapshot (null if no snapshot file yet). */
  eligibleAddresses: string[] | null
  eligibleSnapshotUpdatedAt: string | null
}

function defaultQualityScore(): number {
  const raw = Number(process.env.MINDSHARE_EPOCH2_DEFAULT_QUALITY ?? '4')
  if (!Number.isFinite(raw)) return 4
  return Math.max(0, Math.min(7, raw))
}

function defaultCacheTtlMs(): number {
  /** Default 1h: keep ≥ your epoch2-refresh cron interval so normal API traffic does not refetch X (only cron uses forceRefresh). */
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

function emptyEpoch2Stats(nowMs: number): Epoch2ApiStats {
  return {
    totalParticipants: 0,
    eligibleParticipants: 0,
    notEligibleParticipants: 0,
    totalMindsharePosts: 0,
    totalScore: 0,
    daysRemaining: epoch2DaysRemaining(nowMs),
    totalLikes: 0,
    totalComments: 0,
    totalRetweets: 0,
  }
}

function emptyPayload(
  generatedAt: string,
  nowMs: number,
  eligibleSnap: Epoch2SrEligibleWalletsFile | null,
): MindshareEpoch2LeaderboardPayload {
  return {
    ok: true,
    generatedAt,
    stats: emptyEpoch2Stats(nowMs),
    users: [],
    warnings: [],
    eligibleAddresses: eligibleSnap?.walletsLower ?? null,
    eligibleSnapshotUpdatedAt: eligibleSnap?.updatedAt ?? null,
  }
}

/** SR-eligible wallet keys for labeling only; scoring uses all CSV rows. */
async function resolveEligibleWalletKeys(
  rows: MindshareSubmissionRow[],
  eligibleSnap: Epoch2SrEligibleWalletsFile | null,
): Promise<Set<string>> {
  const skipWaitlistSrGate = process.env.MINDSHARE_EPOCH2_SKIP_WAITLIST_SR_GATE === '1'
  if (skipWaitlistSrGate) {
    return new Set(rows.map((r) => walletKey(r.walletAddress)).filter(Boolean))
  }

  if (eligibleSnap) {
    return new Set(eligibleSnap.walletsLower)
  }

  const liveFallback = process.env.MINDSHARE_EPOCH2_SR_GATE_LIVE_FALLBACK === '1'
  if (!liveFallback) {
    return new Set()
  }

  const rpcUrl = getServerBaseRpcUrl()
  const mindshareWalletKeysLower = [
    ...new Set(rows.map((r) => walletKey(r.walletAddress)).filter(Boolean)),
  ]
  const { eligible } = await loadEpoch2MindshareEligibleBySrHold({
    minSrTokens: epoch2MinSrTokens(),
    waitlistStatePath: process.env.WAITLIST_STATE_PATH,
    rpcUrl,
    mindshareWalletKeysLower,
  })
  return eligible
}

/**
 * X API for all CSV rows (posts + follower counts → metrics cache).
 */
async function refreshXMetricsForRows(options: {
  rows: MindshareSubmissionRow[]
  bearerToken: string
  forceRefresh: boolean
  generatedAt: string
  ttlMs: number
  nowMs: number
}): Promise<Epoch2MetricsCacheFile> {
  const cache = await readEpoch2MetricsCache()
  const { bearerToken, rows, forceRefresh, generatedAt, ttlMs, nowMs } = options

  const tweetIdSet = new Set<string>()
  const handleSet = new Set<string>()
  for (const row of rows) {
    handleSet.add(normalizeXUsername(row.xHandle))
    for (const url of extractPostUrlsFromSubmissionField(row.postSubmitted)) {
      const id = extractTweetIdFromStatusUrl(url)
      if (id) tweetIdSet.add(id)
    }
  }

  const handlesToFetch: string[] = []
  for (const h of Array.from(handleSet)) {
    if (!h) continue
    const c = cache.users[h]
    if (forceRefresh || !c || !cacheEntryFresh(c.at, ttlMs, nowMs)) {
      handlesToFetch.push(h)
    }
  }
  for (const h of handlesToFetch) {
    const { user } = await fetchUserByUsername(bearerToken, h)
    cache.users[h] = {
      at: generatedAt,
      followersCount: user?.followersCount ?? 0,
    }
  }

  const tweetIdsToFetch: string[] = []
  for (const id of Array.from(tweetIdSet)) {
    const c = cache.tweets[id]
    if (forceRefresh || !c || !cacheEntryFresh(c.at, ttlMs, nowMs)) {
      tweetIdsToFetch.push(id)
    }
  }
  if (tweetIdsToFetch.length > 0) {
    const { byId } = await fetchTweetMetricsByIds(bearerToken, tweetIdsToFetch)
    for (const [id, snapshot] of Array.from(byId.entries())) {
      cache.tweets[id] = { at: generatedAt, snapshot }
    }
  }

  await writeEpoch2MetricsCache(cache)
  return cache
}

/** Score all {@link rows} from cache; mark SR eligibility per wallet. */
function scoreRowsFromCache(
  rows: MindshareSubmissionRow[],
  cache: Epoch2MetricsCacheFile,
  defaultQ: number,
  eligibleWalletKeys: Set<string>,
): { users: Epoch2ApiUser[]; engagementByTweetId: Map<string, TweetMetricsSnapshot> } {
  type Agg = { wallet: string; username: string; score: number; posts: number }
  const byWallet = new Map<string, Agg>()
  const engagementByTweetId = new Map<string, TweetMetricsSnapshot>()

  const getSnapshot = (tweetId: string): TweetMetricsSnapshot | null => {
    return cache.tweets[tweetId]?.snapshot ?? null
  }

  for (const row of rows) {
    const wk = walletKey(row.walletAddress)
    if (!wk) continue
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
      if (!tweetId) continue
      const snap = getSnapshot(tweetId)
      if (!snap) continue
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
    .map((u) => {
      const wk = walletKey(u.wallet)
      return {
        username: u.username,
        wallet: u.wallet,
        postCount: u.posts,
        score: Math.round(u.score * 100) / 100,
        srEligible: eligibleWalletKeys.has(wk),
      }
    })
    .sort((a, b) => b.score - a.score)

  return { users, engagementByTweetId }
}

export async function buildMindshareEpoch2LeaderboardPayload(options: {
  bearerToken: string | undefined
  csvPath?: string
  forceRefresh: boolean
}): Promise<MindshareEpoch2LeaderboardPayload> {
  const generatedAt = new Date().toISOString()
  const nowMs = Date.now()
  const ttlMs = defaultCacheTtlMs()
  const defaultQ = defaultQualityScore()

  const rows = await readMindshareSubmissionsCsv(options.csvPath)
  const eligibleSnap = await readEpoch2SrEligibleWalletsFromSnapshot()

  if (rows.length === 0) {
    return emptyPayload(generatedAt, nowMs, eligibleSnap)
  }

  const eligibleWalletKeys = await resolveEligibleWalletKeys(rows, eligibleSnap)

  const bearer = options.bearerToken?.trim()
  const cache = bearer
    ? await refreshXMetricsForRows({
        rows,
        bearerToken: bearer,
        forceRefresh: options.forceRefresh,
        generatedAt,
        ttlMs,
        nowMs,
      })
    : await readEpoch2MetricsCache()

  const { users, engagementByTweetId } = scoreRowsFromCache(rows, cache, defaultQ, eligibleWalletKeys)

  let totalLikes = 0
  let totalComments = 0
  let totalRetweets = 0
  for (const m of Array.from(engagementByTweetId.values())) {
    totalLikes += m.likeCount
    totalComments += m.replyCount
    totalRetweets += retweetsForScore(m)
  }

  const eligibleParticipants = users.filter((u) => u.srEligible).length
  const notEligibleParticipants = users.length - eligibleParticipants
  const totalScore = users.reduce((s, u) => s + u.score, 0)
  const totalPosts = users.reduce((s, u) => s + u.postCount, 0)

  return {
    ok: true,
    generatedAt,
    stats: {
      totalParticipants: users.length,
      eligibleParticipants,
      notEligibleParticipants,
      totalMindsharePosts: totalPosts,
      totalScore: Math.round(totalScore * 100) / 100,
      daysRemaining: epoch2DaysRemaining(nowMs),
      totalLikes,
      totalComments,
      totalRetweets,
    },
    users,
    warnings: [],
    eligibleAddresses: eligibleSnap?.walletsLower ?? null,
    eligibleSnapshotUpdatedAt: eligibleSnap?.updatedAt ?? null,
  }
}
