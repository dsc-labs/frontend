import { appendFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { EPOCH_2_END_MS } from './mindshareEpoch2Constants'
import {
  epoch2PostKey,
  readEpoch2DailyState,
  writeEpoch2DailyState,
  writeEpoch2LeaderboardSnapshot,
  type Epoch2LeaderboardSnapshotFile,
} from './mindshareEpoch2DailyState'
import { gmt7PostCountWindowForSnapshot, postSubmittedInWindow } from './mindshareEpoch2Gmt7'
import {
  buildMindshareEpoch2LeaderboardPayload,
  type MindshareEpoch2LeaderboardPayload,
} from './mindshareEpoch2LeaderboardBuild'
import { flattenMindshareSubmissionPosts } from './mindshareEpoch2Posts'
import { readMindshareSubmissionsCsv } from './mindshareCsvStore'
import { readEpoch2SrEligibleWalletsFromSnapshot, runMindshareEpoch2SrEligibilitySnapshot } from './mindshareEpoch2SrSnapshot'

function defaultDailyLogPath(): string {
  const custom = process.env.MINDSHARE_EPOCH2_DAILY_SNAPSHOT_LOG_PATH?.trim()
  if (custom) return resolve(custom)
  const root = process.env.VERCEL
    ? resolve('/tmp', 'mma-robot', 'mindshare')
    : resolve(process.cwd(), 'data', 'mindshare')
  return resolve(root, 'epoch2_daily_snapshots.jsonl')
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
 * Midnight GMT+7 job: SR eligibility snapshot + X metrics refresh + cumulative score update.
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

  const postsToScore = allPosts.filter((p) => {
    if (!eligibleWallets.has(p.walletLower)) return false
    if (counted.has(epoch2PostKey(p.walletLower, p.tweetId))) return false
    const submittedMs = p.submittedAtMs ?? 0
    return postSubmittedInWindow(submittedMs, postWindow.startMs, postWindow.endMs)
  })

  const payload = await buildMindshareEpoch2LeaderboardPayload({
    bearerToken: options.bearerToken,
    csvPath: options.csvPath,
    forceRefresh: true,
    dailyScoring: {
      postsToScore,
      previousCountedKeys: dailyState.countedPostKeys,
    },
  })

  const newCountedKeys = [...counted]
  for (const p of postsToScore) {
    const key = epoch2PostKey(p.walletLower, p.tweetId)
    if (!newCountedKeys.includes(key)) newCountedKeys.push(key)
  }

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
