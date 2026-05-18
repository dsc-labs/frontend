import { readMindshareSubmissionsCsv } from '../lib/mindshareCsvStore.ts'
import { flattenMindshareSubmissionPosts, postsForCountedKeys } from '../lib/mindshareEpoch2Posts.ts'
import { readEpoch2DailyState, readEpoch2LeaderboardSnapshot } from '../lib/mindshareEpoch2DailyState.ts'
import { readEpoch2MetricsCache } from '../lib/mindshareEpoch2MetricsCache.ts'
import { buildMindshareEpoch2LeaderboardPayload } from '../lib/mindshareEpoch2LeaderboardBuild.ts'
import { gmt7PostCountWindowForSnapshot } from '../lib/mindshareEpoch2Gmt7.ts'
import { shouldScorePostForEpoch2DailySnapshot } from '../lib/mindshareEpoch2Posts.ts'
import { readEpoch2SrEligibleWalletsFromSnapshot } from '../lib/mindshareEpoch2SrSnapshot.ts'

const wallet = (process.argv[2] ?? '0x471faf231212caad6554b4e3ec1fc5255f36f468').toLowerCase()

const rows = await readMindshareSubmissionsCsv()
const all = flattenMindshareSubmissionPosts(rows)
const daily = await readEpoch2DailyState()
const snap = await readEpoch2LeaderboardSnapshot()
const cache = await readEpoch2MetricsCache()
const eligibleSnap = await readEpoch2SrEligibleWalletsFromSnapshot()
const eligible = new Set(eligibleSnap?.walletsLower ?? [])
const counted = new Set(daily.countedPostKeys)

const keys = daily.countedPostKeys.filter((k) => k.startsWith(wallet))
const full = postsForCountedKeys(all, keys, rows)
const csvPosts = all.filter((p) => p.walletLower === wallet)
const uniqueIds = [...new Set(csvPosts.map((p) => p.tweetId))]
const withCache = full.filter((p) => cache.tweets[p.tweetId]?.snapshot)
const snapUser = snap?.users.find((u) => u.wallet.toLowerCase() === wallet)

const nowMs = Date.parse(snap?.generatedAt ?? new Date().toISOString())
const postWindow = gmt7PostCountWindowForSnapshot(nowMs, false)
const postsToScore = all.filter((p) =>
  shouldScorePostForEpoch2DailySnapshot(p, {
    eligibleWallets: eligible,
    countedKeys: counted,
    countedPostKeys: daily.countedPostKeys,
    postWindow,
    isBootstrap: false,
  }),
)

const payload = await buildMindshareEpoch2LeaderboardPayload({
  bearerToken: undefined,
  forceRefresh: false,
  dailyScoring: {
    postsToScore,
    previousCountedKeys: daily.countedPostKeys,
    countedPostsForRecount: full,
  },
})

const rebuilt = payload.users.find((u) => u.wallet.toLowerCase() === wallet)

console.log(
  JSON.stringify(
    {
      wallet,
      snapshotPostCount: snapUser?.postCount ?? null,
      rebuiltPostCount: rebuilt?.postCount ?? null,
      csvFlattenedRows: csvPosts.length,
      uniqueTweetIdsInCsv: uniqueIds.length,
      countedKeysInDailyState: keys.length,
      postsForCountedKeys: full.length,
      tweetsWithMetricsCache: withCache.length,
      postsToScoreNow: postsToScore.filter((p) => p.walletLower === wallet).length,
    },
    null,
    2,
  ),
)
