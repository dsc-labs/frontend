import { EPOCH2_CHECKPOINT_DAY_KEYS } from './mindshareEpoch2Checkpoints'
import { applyEpoch2SnapshotDirToProcessEnv, epoch2DataRoot } from './mindshareEpoch2DataPaths'
import { runMindshareEpoch2PostsBackfill } from './mindshareEpoch2PostsBackfill'
import { runMindshareEpoch2SrHistoricalBackfill } from './mindshareEpoch2SrHistoricalBackfill'
import { runMindshareEpoch2SrEligibilitySnapshot } from './mindshareEpoch2SrSnapshot'

export type Epoch2FullRebuildResult =
  | { ok: false; error: string }
  | {
      ok: true
      dataDir: string
      srDays: Awaited<ReturnType<typeof runMindshareEpoch2SrHistoricalBackfill>>[]
      posts: Awaited<ReturnType<typeof runMindshareEpoch2PostsBackfill>>
      latestSr?: Awaited<ReturnType<typeof runMindshareEpoch2SrEligibilitySnapshot>>
    }

/**
 * Operator: SR eligibility backfill for each checkpoint day, then replay all post windows + score.
 * All paths under `dataDir` (default `data/newmindshare`). Expects `mindshare_submissions.csv` there.
 */
export async function runEpoch2FullRebuild(options: {
  bearerToken: string | undefined
  dataDir?: string
  /** Rebuild countedPostKeys from scratch (default true). */
  replacePosts?: boolean
  /** Checkpoint days to backfill SR for (default 15–19). */
  dayKeys?: string[]
  /** After posts backfill, run live SR snapshot for “tonight” → `epoch2_sr_eligible_wallets.json`. */
  runLatestSrSnapshot?: boolean
  nowMs?: number
}): Promise<Epoch2FullRebuildResult> {
  const dataDir = options.dataDir?.trim()
    ? applyEpoch2SnapshotDirToProcessEnv(options.dataDir)
    : applyEpoch2SnapshotDirToProcessEnv()
  const dayKeys = options.dayKeys?.length ? options.dayKeys : [...EPOCH2_CHECKPOINT_DAY_KEYS]
  const csvPath = process.env.MINDSHARE_SUBMISSIONS_CSV_PATH

  const srDays: Awaited<ReturnType<typeof runMindshareEpoch2SrHistoricalBackfill>>[] = []
  for (const day of dayKeys) {
    const r = await runMindshareEpoch2SrHistoricalBackfill({
      eligibilityDayKey: day,
      csvPath,
      replace: true,
    })
    if (!r.ok) return { ok: false, error: r.error }
    srDays.push(r)
  }

  const posts = await runMindshareEpoch2PostsBackfill({
    bearerToken: options.bearerToken,
    csvPath,
    replace: options.replacePosts !== false,
    dayKeys,
  })
  if (!posts.ok) {
    if ('error' in posts) return { ok: false, error: posts.error }
    return { ok: false, error: 'Posts backfill skipped or failed' }
  }
  if (posts.skipped) {
    return { ok: false, error: `Posts backfill skipped: ${posts.reason}` }
  }

  let latestSr: Awaited<ReturnType<typeof runMindshareEpoch2SrEligibilitySnapshot>> | undefined
  if (options.runLatestSrSnapshot) {
    latestSr = await runMindshareEpoch2SrEligibilitySnapshot(options.nowMs)
    if (!latestSr.ok) return { ok: false, error: latestSr.error }
  }

  return { ok: true, dataDir, srDays, posts, latestSr }
}
