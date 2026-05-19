import { appendFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { defaultEpoch2DailySnapshotLogPath } from './mindshareEpoch2DataPaths'
import { EPOCH_2_END_MS } from './mindshareEpoch2Constants'
import {
  bootstrapPostKeySet,
  epoch2PostKey,
  readEpoch2DailyState,
  writeEpoch2DailyState,
  writeEpoch2LeaderboardSnapshot,
  type Epoch2LeaderboardSnapshotFile,
} from './mindshareEpoch2DailyState'
import { gmt7PostCountWindowForSnapshot } from './mindshareEpoch2Gmt7'
import {
  buildMindshareEpoch2LeaderboardPayload,
  type MindshareEpoch2LeaderboardPayload,
} from './mindshareEpoch2LeaderboardBuild'
import {
  flattenMindshareSubmissionPosts,
  postsForCountedKeys,
  shouldScorePostForEpoch2DailySnapshot,
} from './mindshareEpoch2Posts'
import { readMindshareSubmissionsCsv } from './mindshareCsvStore'
import { readEpoch2SrEligibleWalletsFromSnapshot, runMindshareEpoch2SrEligibilitySnapshot } from './mindshareEpoch2SrSnapshot'

function defaultDailyLogPath(): string {
  return defaultEpoch2DailySnapshotLogPath()
}

export type MindshareEpoch2DailySnapshotResult =
  | {
      ok: true
      skipped: true
      reason: 'epoch2-ended'
      epoch2EndMs: number
      nowMs: number
    }
  | {
      ok: true
      skipped: false
      srSnapshot: Awaited<ReturnType<typeof runMindshareEpoch2SrEligibilitySnapshot>>
      leaderboard: MindshareEpoch2LeaderboardPayload
      snapshotDayKey: string
      isBootstrap: boolean
      postWindow: { startMs: number; endMs: number; eligibilityDayKey: string }
      newPostsScored: number
      dailyStatePath: string
      leaderboardSnapshotPath: string
    }
  | { ok: false; error: string }

/**
 * Midnight GMT+7 job (two separate steps):
 * 1. SR eligibility — archive RPC balances at the block for midnight GMT+7 (`runMindshareEpoch2SrEligibilitySnapshot`)
 * 2. Posts + scores — GMT+7 post windows + X metrics (`buildMindshareEpoch2LeaderboardPayload`); uses SR list from step 1 only for gating
 *
 * Public `/epoch2` reads the written leaderboard snapshot until the next run.
 */
export async function runMindshareEpoch2DailySnapshot(
  options: {
    bearerToken: string | undefined
    csvPath?: string
    nowMs?: number
  },
): Promise<MindshareEpoch2DailySnapshotResult> {
  const nowMs = options.nowMs ?? Date.now()
  if (nowMs >= EPOCH_2_END_MS) {
    return { ok: true, skipped: true, reason: 'epoch2-ended', epoch2EndMs: EPOCH_2_END_MS, nowMs }
  }

  const srSnapshot = await runMindshareEpoch2SrEligibilitySnapshot(nowMs)
  if (!srSnapshot.ok) {
    return { ok: false, error: srSnapshot.error }
  }
  if (srSnapshot.skipped) {
    return { ok: true, skipped: true, reason: 'epoch2-ended', epoch2EndMs: EPOCH_2_END_MS, nowMs }
  }

  const dailyState = await readEpoch2DailyState()
  const isBootstrap = !dailyState.bootstrapCompleted
  const postWindow = gmt7PostCountWindowForSnapshot(nowMs, isBootstrap)

  const eligibleSnap = await readEpoch2SrEligibleWalletsFromSnapshot()
  const eligibleWallets = new Set(eligibleSnap?.walletsLower ?? [])
  const counted = new Set(dailyState.countedPostKeys)

  const rows = await readMindshareSubmissionsCsv(options.csvPath)
  const allPosts = flattenMindshareSubmissionPosts(rows)

  const postsToScore = allPosts.filter((p) =>
    shouldScorePostForEpoch2DailySnapshot(p, {
      eligibleWallets,
      countedKeys: counted,
      countedPostKeys: dailyState.countedPostKeys,
      postWindow,
      isBootstrap,
    }),
  )

  const countedPostsForRecount = postsForCountedKeys(allPosts, dailyState.countedPostKeys, rows)

  const bootstrapKeysThisRun = postsToScore.map((p) => epoch2PostKey(p.walletLower, p.tweetId))
  const bootstrapForScoring = bootstrapPostKeySet(
    isBootstrap
      ? [...dailyState.bootstrapPostKeys, ...bootstrapKeysThisRun]
      : dailyState.bootstrapPostKeys,
  )

  const payload = await buildMindshareEpoch2LeaderboardPayload({
    bearerToken: options.bearerToken,
    csvPath: options.csvPath,
    forceRefresh: true,
    dailyScoring: {
      postsToScore,
      previousCountedKeys: dailyState.countedPostKeys,
      countedPostsForRecount,
      bootstrapPostKeys: bootstrapForScoring,
    },
  })

  const newCountedKeys = [...counted]
  for (const p of postsToScore) {
    const key = epoch2PostKey(p.walletLower, p.tweetId)
    if (!newCountedKeys.includes(key)) newCountedKeys.push(key)
  }
  const bootstrapPostKeys = isBootstrap
    ? [...new Set([...dailyState.bootstrapPostKeys, ...bootstrapKeysThisRun])]
    : dailyState.bootstrapPostKeys

  const snapshotFile: Epoch2LeaderboardSnapshotFile = {
    ...payload,
    snapshotDayKey: postWindow.snapshotDayKey,
    isBootstrap,
    postWindow: {
      startMs: postWindow.startMs,
      endMs: postWindow.endMs,
      eligibilityDayKey: postWindow.eligibilityDayKey,
    },
    cronTimezoneNote: '17:00 UTC = 00:00 GMT+7',
  }

  const dailyStatePath = await writeEpoch2DailyState({
    bootstrapCompleted: true,
    epoch1CarryoverApplied: dailyState.epoch1CarryoverApplied || payload.epoch1CarryoverApplied === true,
    guaranteedEpoch1BaselinesMerged: payload.guaranteedEpoch1BaselinesMerged ?? dailyState.guaranteedEpoch1BaselinesMerged,
    lastSnapshotAt: payload.generatedAt,
    lastSnapshotDayKey: postWindow.snapshotDayKey,
    countedPostKeys: newCountedKeys,
    bootstrapPostKeys,
  })
  const leaderboardSnapshotPath = await writeEpoch2LeaderboardSnapshot(snapshotFile)

  const logPath = defaultDailyLogPath()
  await mkdir(dirname(logPath), { recursive: true })
  await appendFile(
    logPath,
    `${JSON.stringify({
      at: payload.generatedAt,
      snapshotDayKey: postWindow.snapshotDayKey,
      isBootstrap,
      eligibilityDayKey: postWindow.eligibilityDayKey,
      postWindow: { startMs: postWindow.startMs, endMs: postWindow.endMs },
      eligibleCount: eligibleWallets.size,
      newPostsScored: postsToScore.length,
      totalCountedPosts: newCountedKeys.length,
    })}\n`,
    'utf8',
  )

  return {
    ok: true,
    skipped: false,
    srSnapshot,
    leaderboard: payload,
    snapshotDayKey: postWindow.snapshotDayKey,
    isBootstrap,
    postWindow: {
      startMs: postWindow.startMs,
      endMs: postWindow.endMs,
      eligibilityDayKey: postWindow.eligibilityDayKey,
    },
    newPostsScored: postsToScore.length,
    dailyStatePath,
    leaderboardSnapshotPath,
  }
}
