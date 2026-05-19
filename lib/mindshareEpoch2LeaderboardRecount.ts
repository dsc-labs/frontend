import { EPOCH_2_END_MS } from './mindshareEpoch2Constants'
import {
  bootstrapPostKeySet,
  readEpoch2DailyState,
  readEpoch2LeaderboardSnapshot,
  writeEpoch2DailyState,
  writeEpoch2LeaderboardSnapshot,
  type Epoch2LeaderboardSnapshotFile,
} from './mindshareEpoch2DailyState'
import {
  buildMindshareEpoch2LeaderboardPayload,
  type MindshareEpoch2LeaderboardPayload,
} from './mindshareEpoch2LeaderboardBuild'
import { flattenMindshareSubmissionPosts, postsForCountedKeys } from './mindshareEpoch2Posts'
import { readMindshareSubmissionsCsv } from './mindshareCsvStore'

export type MindshareEpoch2LeaderboardRecountResult =
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
      leaderboard: MindshareEpoch2LeaderboardPayload
      /** Unique `walletLower:tweetId` keys rescored (unchanged unless dedupe ran). */
      countedPostKeys: number
      /** Posts resolved from CSV + daily state for recount. */
      postsRecounted: number
      /** Wallets whose `postCount` changed vs previous snapshot. */
      postCountCorrections: number
      dailyStatePath: string
      leaderboardSnapshotPath: string
    }
  | { ok: false; error: string }

function dedupeCountedKeys(keys: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const k of keys) {
    const key = String(k).trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}

/**
 * Re-aggregate cumulative scores and post counts from `epoch2_daily_state.json`
 * `countedPostKeys` only — does **not** run SR snapshot or add posts from tonight's window.
 *
 * Use after code fixes or when X metrics cache was incomplete. Refetches X metrics when
 * `bearerToken` is set (`forceRefresh: true`). Posts without cache entries still count
 * (zero engagement) during recount.
 */
export async function runMindshareEpoch2LeaderboardRecount(options: {
  bearerToken: string | undefined
  csvPath?: string
  nowMs?: number
}): Promise<MindshareEpoch2LeaderboardRecountResult> {
  const nowMs = options.nowMs ?? Date.now()
  if (nowMs >= EPOCH_2_END_MS) {
    return { ok: true, skipped: true, reason: 'epoch2-ended', epoch2EndMs: EPOCH_2_END_MS, nowMs }
  }

  const dailyState = await readEpoch2DailyState()
  const prevSnapshot = await readEpoch2LeaderboardSnapshot()
  const countedPostKeys = dedupeCountedKeys(dailyState.countedPostKeys)

  const rows = await readMindshareSubmissionsCsv(options.csvPath)
  const allPosts = flattenMindshareSubmissionPosts(rows)
  const countedPostsForRecount = postsForCountedKeys(allPosts, countedPostKeys, rows)

  const payload = await buildMindshareEpoch2LeaderboardPayload({
    bearerToken: options.bearerToken,
    csvPath: options.csvPath,
    forceRefresh: true,
    dailyScoring: {
      postsToScore: [],
      previousCountedKeys: countedPostKeys,
      countedPostsForRecount,
      bootstrapPostKeys: bootstrapPostKeySet(dailyState.bootstrapPostKeys),
    },
  })

  const prevPostCountByWallet = new Map<string, number>()
  if (prevSnapshot) {
    for (const u of prevSnapshot.users) {
      const wk = u.wallet.trim().toLowerCase()
      if (wk) prevPostCountByWallet.set(wk, u.postCount)
    }
  }
  let postCountCorrections = 0
  for (const u of payload.users) {
    const wk = u.wallet.trim().toLowerCase()
    if (!wk) continue
    const prev = prevPostCountByWallet.get(wk)
    if (prev !== undefined && prev !== u.postCount) postCountCorrections += 1
  }

  const snapshotDayKey =
    prevSnapshot?.snapshotDayKey ?? dailyState.lastSnapshotDayKey ?? payload.generatedAt.slice(0, 10)
  const isBootstrap = prevSnapshot?.isBootstrap ?? !dailyState.bootstrapCompleted
  const postWindow =
    prevSnapshot?.postWindow ?? {
      startMs: 0,
      endMs: nowMs,
      eligibilityDayKey: snapshotDayKey,
    }

  const snapshotFile: Epoch2LeaderboardSnapshotFile = {
    ...payload,
    snapshotDayKey,
    isBootstrap,
    postWindow,
    cronTimezoneNote: '17:00 UTC = 00:00 GMT+7',
  }

  const dailyStatePath = await writeEpoch2DailyState({
    bootstrapCompleted: dailyState.bootstrapCompleted,
    epoch1CarryoverApplied: dailyState.epoch1CarryoverApplied || payload.epoch1CarryoverApplied === true,
    guaranteedEpoch1BaselinesMerged:
      payload.guaranteedEpoch1BaselinesMerged ?? dailyState.guaranteedEpoch1BaselinesMerged,
    lastSnapshotAt: payload.generatedAt,
    lastSnapshotDayKey: dailyState.lastSnapshotDayKey ?? snapshotDayKey,
    countedPostKeys,
    bootstrapPostKeys: dailyState.bootstrapPostKeys,
  })
  const leaderboardSnapshotPath = await writeEpoch2LeaderboardSnapshot(snapshotFile)

  return {
    ok: true,
    skipped: false,
    leaderboard: payload,
    countedPostKeys: countedPostKeys.length,
    postsRecounted: countedPostsForRecount.length,
    postCountCorrections,
    dailyStatePath,
    leaderboardSnapshotPath,
  }
}
