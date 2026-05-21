import { EPOCH_2_END_MS, EPOCH2_SNAPSHOT_CRON_NOTE } from './mindshareEpoch2Constants'
import {
  EPOCH2_CHECKPOINT_DAY_KEYS,
  loadEpoch2SrEligibilityByDay,
} from './mindshareEpoch2Checkpoints'
import {
  bootstrapPostKeySet,
  epoch2PostKey,
  readEpoch2DailyState,
  readEpoch2LeaderboardSnapshot,
  writeEpoch2DailyState,
  writeEpoch2LeaderboardSnapshot,
  type Epoch2LeaderboardSnapshotFile,
} from './mindshareEpoch2DailyState'
import { gmt7PostCountWindowForSnapshot, gmt7SrEligibilitySnapshotInstantMs } from './mindshareEpoch2Gmt7'
import {
  buildMindshareEpoch2LeaderboardPayload,
  type MindshareEpoch2LeaderboardPayload,
} from './mindshareEpoch2LeaderboardBuild'
import {
  flattenMindshareSubmissionPosts,
  postsForCountedKeys,
  shouldScorePostForEpoch2DailySnapshot,
  type Epoch2FlattenedPost,
} from './mindshareEpoch2Posts'
import { readMindshareSubmissionsCsv } from './mindshareCsvStore'
import { runMindshareEpoch2SrEligibilitySnapshot } from './mindshareEpoch2SrSnapshot'

export type Epoch2PostsBackfillDayResult = {
  eligibilityDayKey: string
  eligibleCount: number
  newPostsCounted: number
  skipped: boolean
  skipReason?: 'no-sr-snapshot-for-day'
}

/**
 * Replay post counting from first → last checkpoint day using SR lists in `epoch2_sr_snapshots.jsonl`
 * and the same eligibility-day window rules as the daily cron (`snapshot.md`).
 */
export function replayEpoch2CountedPostKeys(options: {
  allPosts: Epoch2FlattenedPost[]
  eligibilityByDay: Map<string, Set<string>>
  dayKeys?: readonly string[]
  /** When true, start with an empty `countedPostKeys` set. */
  replace?: boolean
  initialCountedKeys?: string[]
  /** When false and not `replace`, skip bootstrap window (only add per-day windows). */
  bootstrapAlreadyCompleted?: boolean
}): { countedPostKeys: string[]; bootstrapPostKeys: string[]; byDay: Epoch2PostsBackfillDayResult[] } {
  const dayKeys = options.dayKeys ?? EPOCH2_CHECKPOINT_DAY_KEYS
  const counted = new Set(options.replace ? [] : (options.initialCountedKeys ?? []))
  const bootstrapPostKeys = new Set<string>()
  const byDay: Epoch2PostsBackfillDayResult[] = []
  let isBootstrap =
    options.replace === true || (options.bootstrapAlreadyCompleted !== true && counted.size === 0)

  for (const eligibilityDayKey of dayKeys) {
    const eligibleWallets = options.eligibilityByDay.get(eligibilityDayKey)
    if (!eligibleWallets || eligibleWallets.size === 0) {
      byDay.push({
        eligibilityDayKey,
        eligibleCount: 0,
        newPostsCounted: 0,
        skipped: true,
        skipReason: 'no-sr-snapshot-for-day',
      })
      continue
    }

    const snapshotMs = gmt7SrEligibilitySnapshotInstantMs(eligibilityDayKey)
    const postWindow = gmt7PostCountWindowForSnapshot(snapshotMs, isBootstrap)
    const before = counted.size

    for (const p of options.allPosts) {
      if (
        shouldScorePostForEpoch2DailySnapshot(p, {
          eligibleWallets,
          countedKeys: counted,
          countedPostKeys: [...counted],
          postWindow,
          isBootstrap,
        })
      ) {
        const key = epoch2PostKey(p.walletLower, p.tweetId)
        counted.add(key)
        if (isBootstrap) bootstrapPostKeys.add(key)
      }
    }

    byDay.push({
      eligibilityDayKey,
      eligibleCount: eligibleWallets.size,
      newPostsCounted: counted.size - before,
      skipped: false,
    })
    isBootstrap = false
  }

  return { countedPostKeys: [...counted], bootstrapPostKeys: [...bootstrapPostKeys], byDay }
}

export type MindshareEpoch2PostsBackfillResult =
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
      replace: boolean
      srSnapshotRan: boolean
      dayResults: Epoch2PostsBackfillDayResult[]
      totalCountedPosts: number
      leaderboard: MindshareEpoch2LeaderboardPayload
      dailyStatePath: string
      leaderboardSnapshotPath: string
    }
  | { ok: false; error: string }

/**
 * Operator backfill: determine `countedPostKeys` by replaying checkpoint days 15→18 & 20 (or subset),
 * then fetch X metrics and write the leaderboard snapshot.
 *
 * Prerequisite: SR lines in `epoch2_sr_snapshots.jsonl` for each day (use `epoch2-sr-backfill-day`).
 * Does not invent SR eligibility from the CSV `sr balance` column.
 */
export async function runMindshareEpoch2PostsBackfill(options: {
  bearerToken: string | undefined
  csvPath?: string
  nowMs?: number
  replace?: boolean
  dayKeys?: string[]
  /** When true, run live SR snapshot for tonight before replay (updates `epoch2_sr_eligible_wallets.json` only). */
  runSrSnapshot?: boolean
}): Promise<MindshareEpoch2PostsBackfillResult> {
  const nowMs = options.nowMs ?? Date.now()
  if (nowMs >= EPOCH_2_END_MS) {
    return { ok: true, skipped: true, reason: 'epoch2-ended', epoch2EndMs: EPOCH_2_END_MS, nowMs }
  }

  let srSnapshotRan = false
  if (options.runSrSnapshot) {
    const sr = await runMindshareEpoch2SrEligibilitySnapshot(nowMs)
    if (!sr.ok) return { ok: false, error: sr.error }
    srSnapshotRan = !sr.skipped
  }

  const dailyState = await readEpoch2DailyState()
  const prevSnapshot = await readEpoch2LeaderboardSnapshot()
  const replace = options.replace === true

  const dayKeys =
    options.dayKeys?.length ?
      options.dayKeys.filter((d) => EPOCH2_CHECKPOINT_DAY_KEYS.includes(d as (typeof EPOCH2_CHECKPOINT_DAY_KEYS)[number]))
    : [...EPOCH2_CHECKPOINT_DAY_KEYS]

  const eligibilityByDay = await loadEpoch2SrEligibilityByDay()
  const rows = await readMindshareSubmissionsCsv(options.csvPath)
  const allPosts = flattenMindshareSubmissionPosts(rows)

  const { countedPostKeys, bootstrapPostKeys, byDay } = replayEpoch2CountedPostKeys({
    allPosts,
    eligibilityByDay,
    dayKeys,
    replace,
    initialCountedKeys: replace ? [] : dailyState.countedPostKeys,
    bootstrapAlreadyCompleted: replace ? false : dailyState.bootstrapCompleted,
  })

  const countedPostsForRecount = postsForCountedKeys(allPosts, countedPostKeys, rows)

  const payload = await buildMindshareEpoch2LeaderboardPayload({
    bearerToken: options.bearerToken,
    csvPath: options.csvPath,
    forceRefresh: true,
    dailyScoring: {
      postsToScore: [],
      previousCountedKeys: countedPostKeys,
      countedPostsForRecount,
      bootstrapPostKeys: bootstrapPostKeySet(bootstrapPostKeys),
    },
  })

  const snapshotDayKey =
    prevSnapshot?.snapshotDayKey ?? dailyState.lastSnapshotDayKey ?? payload.generatedAt.slice(0, 10)
  const snapshotFile: Epoch2LeaderboardSnapshotFile = {
    ...payload,
    snapshotDayKey,
    isBootstrap: false,
    postWindow: prevSnapshot?.postWindow ?? {
      startMs: 0,
      endMs: nowMs,
      eligibilityDayKey: snapshotDayKey,
    },
    cronTimezoneNote: EPOCH2_SNAPSHOT_CRON_NOTE,
  }

  const dailyStatePath = await writeEpoch2DailyState({
    bootstrapCompleted: true,
    epoch1CarryoverApplied: dailyState.epoch1CarryoverApplied || payload.epoch1CarryoverApplied === true,
    guaranteedEpoch1BaselinesMerged:
      payload.guaranteedEpoch1BaselinesMerged ?? dailyState.guaranteedEpoch1BaselinesMerged,
    lastSnapshotAt: payload.generatedAt,
    lastSnapshotDayKey: dailyState.lastSnapshotDayKey ?? snapshotDayKey,
    countedPostKeys,
    bootstrapPostKeys,
  })
  const leaderboardSnapshotPath = await writeEpoch2LeaderboardSnapshot(snapshotFile)

  return {
    ok: true,
    skipped: false,
    replace,
    srSnapshotRan,
    dayResults: byDay,
    totalCountedPosts: countedPostKeys.length,
    leaderboard: payload,
    dailyStatePath,
    leaderboardSnapshotPath,
  }
}
