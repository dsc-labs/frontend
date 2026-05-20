import {
  extractPostUrlsFromSubmissionField,
  readMindshareSubmissionsCsv,
  type MindshareSubmissionRow,
} from './mindshareCsvStore'
import { readEpoch2LeaderboardSnapshot } from './mindshareEpoch2DailyState'
import type { Epoch2FlattenedPost } from './mindshareEpoch2Posts'
import { flattenMindshareSubmissionPosts, postsMatchingCountedKeys } from './mindshareEpoch2Posts'
import {
  loadEpoch1CarryoverRows,
  loadEpoch1LeaderboardRows,
  loadEpoch1PrizeWinnerWallets,
  mergeEpoch1CarryoverIntoUsers,
} from './mindshareEpoch1Carryover'
import {
  countEpoch2ParticipantStats,
  enrichEpoch2UsersWithCheckpointsAndSrBalance,
  epoch2CheckpointColumnsAll,
  type Epoch2CheckpointColumn,
} from './mindshareEpoch2Checkpoints'
import { enrichEpoch2UsersWithProfiles } from './mindshareEpoch2ProfileEnrichment'
import { refreshXUserProfilesInCache } from './mindshareEpoch2XProfiles'
import {
  applyGuaranteedTop7,
  loadGuaranteedTop7Epoch1Rows,
  loadGuaranteedTop7Wallets,
  reorderEpoch2GuaranteedTop7ForDisplay,
} from './mindshareEpoch2GuaranteedTop7'
import { applyEpoch2OperatorAdjustments } from './mindshareEpoch2OperatorAdjustments'
import { sortEpoch2UsersByEligibilityThenScore } from './mindshareEpoch2LeaderboardSort'
import { EPOCH2_FIRST_SNAPSHOT_SCORE_MULTIPLIER, epoch2DaysRemaining } from './mindshareEpoch2Constants'
import { applyEpoch2EngagementToStats, resolveEpoch2EngagementTotals } from './mindshareEpoch2EngagementStats'
import { bootstrapPostKeySet, epoch2PostKey, readEpoch2DailyState } from './mindshareEpoch2DailyState'
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
  fetchUsersByUsernames,
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
  totalEngagement: number
}

export type Epoch2ApiUser = {
  /** Display label (often CSV `name`). */
  username: string
  /** X handle without `@` — avatar + profile link (set by profile enrichment). */
  xHandle?: string
  /** Epoch 1 export or X-cached profile image URL. */
  avatarUrl?: string
  /** X display name when available. */
  displayName?: string
  wallet: string
  postCount: number
  score: number
  /** From daily SR eligibility snapshot (or live fallback when enabled). */
  srEligible: boolean
  /** On-chain $SR from latest daily snapshot (human units). */
  srBalance?: number
  /** SR eligibility per GMT+7 day (15–18 + 20 May); true = passed that night's snapshot. */
  checkpoints?: boolean[]
}

export type MindshareEpoch2LeaderboardPayload = {
  ok: true
  generatedAt: string
  /** SR checkpoint columns currently shown (only days whose midnight snapshot has run). */
  checkpointDays: Epoch2CheckpointColumn[]
  stats: Epoch2ApiStats
  users: Epoch2ApiUser[]
  /** Always empty on public responses; operational detail stays in server logs. */
  warnings: string[]
  /** Wallets from last SR eligibility snapshot (null if no snapshot file yet). */
  eligibleAddresses: string[] | null
  eligibleSnapshotUpdatedAt: string | null
  /** True after Epoch 1 ranks 102+ are merged into cumulative scores (once). */
  epoch1CarryoverApplied?: boolean
  /** Server-only: wallets that received guaranteed Epoch 1 baseline this run. */
  guaranteedEpoch1BaselinesMerged?: string[]
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

/** Same wallet + different @handle = separate competitors (shared wallet is allowed). */
export function epoch2CompetitorKey(wallet: string, xHandleOrUsername?: string): string {
  const wk = walletKey(wallet)
  const h = normalizeXUsername(xHandleOrUsername ?? '')
  return h ? `${wk}::${h}` : wk
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
    totalEngagement: 0,
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
    checkpointDays: epoch2CheckpointColumnsAll(),
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
  /** Tweet ids from `epoch2_daily_state` counted keys (covers multiline CSV edge cases). */
  extraTweetIds?: string[]
}): Promise<Epoch2MetricsCacheFile> {
  const cache = await readEpoch2MetricsCache()
  const { bearerToken, rows, forceRefresh, generatedAt, ttlMs, nowMs, extraTweetIds = [] } = options

  const tweetIdSet = new Set<string>()
  for (const id of extraTweetIds) {
    if (id) tweetIdSet.add(id)
  }
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
    if (forceRefresh || !c || !cacheEntryFresh(c.at, ttlMs, nowMs) || !c.profileImageUrl) {
      handlesToFetch.push(h)
    }
  }
  if (handlesToFetch.length > 0) {
    const { byHandle } = await fetchUsersByUsernames(bearerToken, handlesToFetch)
    for (const h of handlesToFetch) {
      const snap = byHandle.get(h)
      const prev = cache.users[h]
      cache.users[h] = {
        at: generatedAt,
        followersCount: snap?.followersCount ?? prev?.followersCount ?? 0,
        username: snap?.username ?? h,
        ...(snap?.profileImageUrl ? { profileImageUrl: snap.profileImageUrl } : {}),
        ...(snap?.name ? { name: snap.name } : {}),
      }
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

type DailyScoringOptions = {
  postsToScore: Epoch2FlattenedPost[]
  previousCountedKeys: string[]
  /** All CSV posts already in `previousCountedKeys` — re-scored from cache each run (not seed). */
  countedPostsForRecount: Epoch2FlattenedPost[]
  /** Posts from the bootstrap snapshot — cumulative score × {@link EPOCH2_FIRST_SNAPSHOT_SCORE_MULTIPLIER}. */
  bootstrapPostKeys: Set<string>
}

function tweetIdsFromCountedPostKeys(keys: string[]): string[] {
  const ids: string[] = []
  for (const key of keys) {
    const i = key.indexOf(':')
    if (i < 0) continue
    const id = key.slice(i + 1)
    if (id) ids.push(id)
  }
  return ids
}

type CompetitorAgg = {
  wallet: string
  username: string
  xHandle?: string
  score: number
  posts: number
}

async function loadSeedUserMap(): Promise<Map<string, CompetitorAgg>> {
  const prev = await readEpoch2LeaderboardSnapshot()
  const byKey = new Map<string, CompetitorAgg>()
  if (!prev) return byKey
  for (const u of prev.users) {
    const wk = walletKey(u.wallet)
    if (!wk) continue
    const xHandle = normalizeXUsername(u.xHandle ?? u.username)
    byKey.set(epoch2CompetitorKey(u.wallet, xHandle), {
      wallet: u.wallet,
      username: u.username,
      ...(xHandle ? { xHandle } : {}),
      score: u.score,
      posts: u.postCount,
    })
  }
  return byKey
}

/** Cumulative daily scoring: seed non-counted wallets, re-aggregate all counted posts from cache, add {@link postsToScore}. */
function scoreDailyPostsFromCache(
  postsToScore: Epoch2FlattenedPost[],
  countedPostsForRecount: Epoch2FlattenedPost[],
  allCountedTweetIds: string[],
  cache: Epoch2MetricsCacheFile,
  defaultQ: number,
  eligibleWalletKeys: Set<string>,
  seedByWallet: Map<string, CompetitorAgg>,
  bootstrapPostKeys: Set<string>,
): { users: Epoch2ApiUser[]; engagementByTweetId: Map<string, TweetMetricsSnapshot> } {
  const engagementByTweetId = new Map<string, TweetMetricsSnapshot>()
  const byCompetitor = new Map(seedByWallet)

  for (const p of countedPostsForRecount) {
    byCompetitor.delete(epoch2CompetitorKey(p.wallet, p.xHandle))
  }

  const emptyTweetMetrics = (tweetId: string): TweetMetricsSnapshot => ({
    tweetId,
    likeCount: 0,
    replyCount: 0,
    retweetCount: 0,
    quoteCount: 0,
    impressionCount: 0,
    authorId: '',
  })

  const scoredTweetKeys = new Set<string>()

  const applyPost = (p: Epoch2FlattenedPost, useDefaultMetricsIfMissing = false) => {
    const postKey = epoch2PostKey(p.walletLower, p.tweetId)
    if (scoredTweetKeys.has(postKey)) return
    let snap = cache.tweets[p.tweetId]?.snapshot ?? null
    if (!snap && useDefaultMetricsIfMissing) snap = emptyTweetMetrics(p.tweetId)
    if (!snap) return
    scoredTweetKeys.add(postKey)
    const h = normalizeXUsername(p.xHandle)
    const followers = h ? (cache.users[h]?.followersCount ?? 0) : 0
    const rowKey = epoch2CompetitorKey(p.wallet, p.xHandle)
    if (!byCompetitor.has(rowKey)) {
      byCompetitor.set(rowKey, {
        wallet: p.wallet,
        username: displayUsername(p),
        ...(h ? { xHandle: h } : {}),
        score: 0,
        posts: 0,
      })
    }
    const agg = byCompetitor.get(rowKey)!
    agg.posts += 1
    const post: Epoch2PostScoreInput = {
      qualityScore: defaultQ,
      views: snap.impressionCount,
      comments: snap.replyCount,
      retweets: retweetsForScore(snap),
    }
    const postScore = epoch2FinalScoreForPost(post, followers)
    const mult = bootstrapPostKeys.has(postKey) ? EPOCH2_FIRST_SNAPSHOT_SCORE_MULTIPLIER : 1
    agg.score += postScore * mult
    engagementByTweetId.set(p.tweetId, snap)
  }

  for (const p of countedPostsForRecount) applyPost(p, true)
  for (const p of postsToScore) applyPost(p, false)

  for (const tweetId of allCountedTweetIds) {
    const snap = cache.tweets[tweetId]?.snapshot
    if (snap) engagementByTweetId.set(tweetId, snap)
  }

  const users = sortEpoch2UsersByEligibilityThenScore(
    Array.from(byCompetitor.values())
      .filter((u) => u.posts > 0)
      .map((u) => {
        const wk = walletKey(u.wallet)
        return {
          username: u.username,
          wallet: u.wallet,
          postCount: u.posts,
          score: Math.round(u.score * 100) / 100,
          srEligible: eligibleWalletKeys.has(wk),
          ...(u.xHandle ? { xHandle: u.xHandle } : {}),
        }
      }),
  )

  return { users, engagementByTweetId }
}

function displayUsernameFromPost(p: Epoch2FlattenedPost): string {
  if (p.name) return p.name
  const h = p.xHandle.trim()
  return h.startsWith('@') ? h : `@${h}`
}

function displayUsername(rowOrPost: MindshareSubmissionRow | Epoch2FlattenedPost): string {
  if ('tweetId' in rowOrPost) return displayUsernameFromPost(rowOrPost)
  const name = rowOrPost.name.trim()
  if (name) return name
  const h = rowOrPost.xHandle.trim()
  return h.startsWith('@') ? h : `@${h}`
}

/**
 * Every wallet with at least one post URL in the CSV appears on `/epoch2`.
 * Wallets with no counted/scored posts stay at score 0 (e.g. never SR-eligible on checkpoint nights).
 */
function mergeCsvSubmittersIntoEpoch2Users(
  users: Epoch2ApiUser[],
  rows: MindshareSubmissionRow[],
  eligibleWalletKeys: Set<string>,
): Epoch2ApiUser[] {
  const byKey = new Map<string, Epoch2ApiUser>()
  for (const u of users) {
    const rk = epoch2CompetitorKey(u.wallet, u.xHandle ?? u.username)
    if (rk) byKey.set(rk, u)
  }

  for (const row of rows) {
    const wk = walletKey(row.walletAddress)
    if (!wk.startsWith('0x') || wk.length !== 42) continue
    if (!extractPostUrlsFromSubmissionField(row.postSubmitted).length) continue
    const handle = normalizeXUsername(row.xHandle)
    const rk = epoch2CompetitorKey(row.walletAddress, handle)
    if (byKey.has(rk)) continue
    byKey.set(rk, {
      username: displayUsername(row),
      wallet: row.walletAddress.trim(),
      postCount: 0,
      score: 0,
      srEligible: eligibleWalletKeys.has(wk),
      ...(handle ? { xHandle: handle } : {}),
    })
  }

  return sortEpoch2UsersByEligibilityThenScore([...byKey.values()])
}

/** Score all posts in CSV from cache (legacy live rebuild). */
async function scoreAllPostsFromCache(
  rows: MindshareSubmissionRow[],
  cache: Epoch2MetricsCacheFile,
  defaultQ: number,
  eligibleWalletKeys: Set<string>,
  bootstrapPostKeys: Set<string>,
): Promise<{ users: Epoch2ApiUser[]; engagementByTweetId: Map<string, TweetMetricsSnapshot> }> {
  const posts = flattenMindshareSubmissionPosts(rows)
  return scoreDailyPostsFromCache(
    posts,
    posts,
    posts.map((p) => p.tweetId),
    cache,
    defaultQ,
    eligibleWalletKeys,
    new Map(),
    bootstrapPostKeys,
  )
}

async function finalizeEpoch2UsersForDisplay(
  users: Epoch2ApiUser[],
  eligibleSnap: Epoch2SrEligibleWalletsFile | null,
  nowMs = Date.now(),
): Promise<Epoch2ApiUser[]> {
  const enriched = await enrichEpoch2UsersWithCheckpointsAndSrBalance(users, eligibleSnap)
  const adjusted = applyEpoch2OperatorAdjustments(enriched, nowMs)
  const reordered = await reorderEpoch2GuaranteedTop7ForDisplay(adjusted)
  return reordered.filter((u) => Number(u.score) > 0)
}

export async function getMindshareEpoch2LeaderboardForDisplay(options: {
  bearerToken: string | undefined
  csvPath?: string
  /** Operator rebuild (runs daily scoring logic only when combined with daily cron). */
  forceRefresh: boolean
}): Promise<MindshareEpoch2LeaderboardPayload> {
  const eligibleSnap = await readEpoch2SrEligibleWalletsFromSnapshot()
  if (!options.forceRefresh) {
    const snap = await readEpoch2LeaderboardSnapshot()
    if (snap) {
      const rows = await readMindshareSubmissionsCsv(options.csvPath)
      const cache = await readEpoch2MetricsCache()
      const engagement = resolveEpoch2EngagementTotals(rows, cache)
      const nowMs = Date.now()
      const users = await finalizeEpoch2UsersForDisplay(snap.users, eligibleSnap, nowMs)
      const participantStats = countEpoch2ParticipantStats(users)
      const totalScore = Math.round(users.reduce((s, u) => s + u.score, 0) * 100) / 100
      return {
        ...snap,
        checkpointDays: epoch2CheckpointColumnsAll(),
        stats: applyEpoch2EngagementToStats({ ...snap.stats, ...participantStats, totalScore }, engagement),
        users,
      }
    }
  }
  return buildMindshareEpoch2LeaderboardPayload({
    bearerToken: options.bearerToken,
    csvPath: options.csvPath,
    forceRefresh: options.forceRefresh,
  })
}

export async function buildMindshareEpoch2LeaderboardPayload(options: {
  bearerToken: string | undefined
  csvPath?: string
  forceRefresh: boolean
  dailyScoring?: DailyScoringOptions
}): Promise<MindshareEpoch2LeaderboardPayload> {
  const generatedAt = new Date().toISOString()
  const nowMs = Date.now()
  const ttlMs = defaultCacheTtlMs()
  const defaultQ = defaultQualityScore()

  const rows = await readMindshareSubmissionsCsv(options.csvPath)
  const eligibleSnap = await readEpoch2SrEligibleWalletsFromSnapshot()
  const dailyState = await readEpoch2DailyState()
  const guaranteedWallets = await loadGuaranteedTop7Wallets()
  const guaranteedEpoch1 = await loadGuaranteedTop7Epoch1Rows()
  const prizeWinnerWallets = await loadEpoch1PrizeWinnerWallets(guaranteedWallets)
  const epoch1Carryover = await loadEpoch1CarryoverRows()
  const epoch1BaselinesMerged = new Set(dailyState.guaranteedEpoch1BaselinesMerged)
  const applyEpoch1Carryover = !dailyState.epoch1CarryoverApplied

  const eligibleWalletKeys = await resolveEligibleWalletKeys(rows, eligibleSnap)

  if (rows.length === 0) {
    let users: Epoch2ApiUser[] = []
    if (applyEpoch1Carryover && epoch1Carryover.length > 0) {
      users = mergeEpoch1CarryoverIntoUsers([], epoch1Carryover, prizeWinnerWallets, eligibleWalletKeys)
    }
    const guaranteedEmpty = applyGuaranteedTop7(users, guaranteedEpoch1, epoch1BaselinesMerged)
    users = guaranteedEmpty.users
    const totalScore = users.reduce((s, u) => s + u.score, 0)
    const totalPosts = users.reduce((s, u) => s + u.postCount, 0)
    const epoch1ProfileRowsEmpty = await loadEpoch1LeaderboardRows()
    const profileHandlesEmpty = new Set<string>()
    for (const u of users) {
      const h = normalizeXUsername(u.xHandle ?? u.username)
      if (h) profileHandlesEmpty.add(h)
    }
    const bearerEmpty = options.bearerToken?.trim()
    const cacheEmpty = bearerEmpty
      ? await refreshXUserProfilesInCache({
          bearerToken: bearerEmpty,
          handles: [...profileHandlesEmpty],
          generatedAt,
          ttlMs,
          nowMs,
          forceRefresh: options.forceRefresh,
        })
      : await readEpoch2MetricsCache()
    users = enrichEpoch2UsersWithProfiles(users, epoch1ProfileRowsEmpty, [], cacheEmpty)
    users = await finalizeEpoch2UsersForDisplay(users, eligibleSnap)
    const participantStatsEmpty = countEpoch2ParticipantStats(users)

    return {
      ok: true,
      generatedAt,
      checkpointDays: epoch2CheckpointColumnsAll(),
      stats: {
        ...participantStatsEmpty,
        totalMindsharePosts: totalPosts,
        totalScore: Math.round(totalScore * 100) / 100,
        daysRemaining: epoch2DaysRemaining(nowMs),
        totalLikes: 0,
        totalComments: 0,
        totalRetweets: 0,
      },
      users,
      warnings: [],
      eligibleAddresses: eligibleSnap?.walletsLower ?? null,
      eligibleSnapshotUpdatedAt: eligibleSnap?.updatedAt ?? null,
      epoch1CarryoverApplied: applyEpoch1Carryover && users.length > 0,
      guaranteedEpoch1BaselinesMerged: [
        ...new Set([...dailyState.guaranteedEpoch1BaselinesMerged, ...guaranteedEmpty.epoch1BaselinesMerged]),
      ],
    }
  }

  const bearer = options.bearerToken?.trim()
  const extraTweetIds = tweetIdsFromCountedPostKeys(dailyState.countedPostKeys)
  const cache = bearer
    ? await refreshXMetricsForRows({
        rows,
        bearerToken: bearer,
        forceRefresh: options.forceRefresh,
        generatedAt,
        ttlMs,
        nowMs,
        extraTweetIds,
      })
    : await readEpoch2MetricsCache()

  let users: Epoch2ApiUser[]
  let engagementByTweetId: Map<string, TweetMetricsSnapshot>

  if (options.dailyScoring) {
    const seedByWallet = await loadSeedUserMap()
    const prevTweetIds = tweetIdsFromCountedPostKeys(options.dailyScoring.previousCountedKeys)
    const newTweetIds = options.dailyScoring.postsToScore.map((p) => p.tweetId)
    const allCountedTweetIds = [...new Set([...prevTweetIds, ...newTweetIds])]
    const scored = scoreDailyPostsFromCache(
      options.dailyScoring.postsToScore,
      options.dailyScoring.countedPostsForRecount,
      allCountedTweetIds,
      cache,
      defaultQ,
      eligibleWalletKeys,
      seedByWallet,
      options.dailyScoring.bootstrapPostKeys,
    )
    users = scored.users
    engagementByTweetId = scored.engagementByTweetId
  } else {
    const scored = await scoreAllPostsFromCache(
      rows,
      cache,
      defaultQ,
      eligibleWalletKeys,
      bootstrapPostKeySet(dailyState.bootstrapPostKeys),
    )
    users = scored.users
    engagementByTweetId = scored.engagementByTweetId
  }

  const engagementTotals = resolveEpoch2EngagementTotals(rows, cache)

  if (applyEpoch1Carryover && epoch1Carryover.length > 0) {
    users = mergeEpoch1CarryoverIntoUsers(users, epoch1Carryover, prizeWinnerWallets, eligibleWalletKeys)
  }

  users = mergeCsvSubmittersIntoEpoch2Users(users, rows, eligibleWalletKeys)

  const guaranteed = applyGuaranteedTop7(users, guaranteedEpoch1, epoch1BaselinesMerged)
  users = guaranteed.users
  const newGuaranteedBaselines = guaranteed.epoch1BaselinesMerged

  const totalScore = users.reduce((s, u) => s + u.score, 0)
  const totalPosts = users.reduce((s, u) => s + u.postCount, 0)
  const epoch1Merged = applyEpoch1Carryover && epoch1Carryover.length > 0

  const epoch1ProfileRows = await loadEpoch1LeaderboardRows()
  const profileHandles = new Set<string>()
  for (const row of rows) {
    const h = normalizeXUsername(row.xHandle)
    if (h) profileHandles.add(h)
  }
  for (const u of users) {
    const h = normalizeXUsername(u.xHandle ?? u.username)
    if (h) profileHandles.add(h)
  }
  const cacheForProfiles = bearer
    ? await refreshXUserProfilesInCache({
        bearerToken: bearer,
        handles: [...profileHandles],
        generatedAt,
        ttlMs,
        nowMs,
        forceRefresh: options.forceRefresh,
      })
    : cache
  users = enrichEpoch2UsersWithProfiles(users, epoch1ProfileRows, rows, cacheForProfiles)
  users = await finalizeEpoch2UsersForDisplay(users, eligibleSnap, nowMs)
  const participantStats = countEpoch2ParticipantStats(users)
  const adjustedTotalScore = users.reduce((s, u) => s + u.score, 0)

  return {
    ok: true,
    generatedAt,
    checkpointDays: epoch2CheckpointColumnsAll(),
    stats: {
      ...participantStats,
      totalMindsharePosts: totalPosts,
      totalScore: Math.round(adjustedTotalScore * 100) / 100,
      daysRemaining: epoch2DaysRemaining(nowMs),
      totalLikes: engagementTotals.totalLikes,
      totalComments: engagementTotals.totalComments,
      totalRetweets: engagementTotals.totalRetweets,
      totalEngagement: engagementTotals.totalEngagement,
    },
    users,
    warnings: [],
    eligibleAddresses: eligibleSnap?.walletsLower ?? null,
    eligibleSnapshotUpdatedAt: eligibleSnap?.updatedAt ?? null,
    epoch1CarryoverApplied: epoch1Merged || dailyState.epoch1CarryoverApplied,
    guaranteedEpoch1BaselinesMerged: [
      ...new Set([...dailyState.guaranteedEpoch1BaselinesMerged, ...newGuaranteedBaselines]),
    ],
  }
}
