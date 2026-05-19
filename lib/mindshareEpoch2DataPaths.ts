import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Epoch 2 snapshot JSON/jsonl (SR, leaderboard, daily state, metrics cache).
 * Hardcoded — live submissions stay at repo-root `mindshare_submissions.csv`.
 */
export const EPOCH2_SNAPSHOT_DATA_DIR = resolve(process.cwd(), 'data', 'newmindshare')

/** @deprecated Use `EPOCH2_SNAPSHOT_DATA_DIR`. */
export const PRODUCTION_EPOCH2_SNAPSHOT_DIR = EPOCH2_SNAPSHOT_DATA_DIR

const EPOCH2_FILE_NAMES = {
  submissionsCsv: 'mindshare_submissions.csv',
  dailyState: 'epoch2_daily_state.json',
  leaderboardSnapshot: 'epoch2_leaderboard_snapshot.json',
  metricsCache: 'epoch2_metrics_cache.json',
  srEligibleWallets: 'epoch2_sr_eligible_wallets.json',
  srSnapshotsLog: 'epoch2_sr_snapshots.jsonl',
  dailySnapshotsLog: 'epoch2_daily_snapshots.jsonl',
} as const

/** Root for Epoch 2 snapshot files (`data/newmindshare`). */
export function epoch2DataRoot(): string {
  if (process.env.VERCEL) return resolve('/tmp', 'mma-robot', 'mindshare')
  return EPOCH2_SNAPSHOT_DATA_DIR
}

/** Live form CSV at repo root (not under `data/newmindshare`). */
export function defaultMindshareSubmissionsCsvPath(): string {
  const custom = process.env.MINDSHARE_SUBMISSIONS_CSV_PATH?.trim()
  if (custom) return resolve(custom)
  const inSnapshotDir = resolve(EPOCH2_SNAPSHOT_DATA_DIR, EPOCH2_FILE_NAMES.submissionsCsv)
  if (existsSync(inSnapshotDir)) return inSnapshotDir
  return resolve(process.cwd(), EPOCH2_FILE_NAMES.submissionsCsv)
}

export function defaultEpoch2DailyStatePath(): string {
  const custom = process.env.MINDSHARE_EPOCH2_DAILY_STATE_PATH?.trim()
  if (custom) return resolve(custom)
  return resolve(epoch2DataRoot(), EPOCH2_FILE_NAMES.dailyState)
}

export function defaultEpoch2LeaderboardSnapshotPath(): string {
  const custom = process.env.MINDSHARE_EPOCH2_LEADERBOARD_SNAPSHOT_PATH?.trim()
  if (custom) return resolve(custom)
  return resolve(epoch2DataRoot(), EPOCH2_FILE_NAMES.leaderboardSnapshot)
}

export function defaultEpoch2MetricsCachePath(): string {
  const custom = process.env.MINDSHARE_EPOCH2_METRICS_CACHE_PATH?.trim()
  if (custom) return resolve(custom)
  return resolve(epoch2DataRoot(), EPOCH2_FILE_NAMES.metricsCache)
}

export function defaultEpoch2SrEligibleWalletsPath(): string {
  const custom = process.env.MINDSHARE_EPOCH2_SR_ELIGIBLE_WALLETS_PATH?.trim()
  if (custom) return resolve(custom)
  return resolve(epoch2DataRoot(), EPOCH2_FILE_NAMES.srEligibleWallets)
}

export function defaultEpoch2SrSnapshotLogPath(): string {
  const custom = process.env.MINDSHARE_EPOCH2_SR_SNAPSHOT_LOG_PATH?.trim()
  if (custom) return resolve(custom)
  return resolve(epoch2DataRoot(), EPOCH2_FILE_NAMES.srSnapshotsLog)
}

export function defaultEpoch2DailySnapshotLogPath(): string {
  const custom = process.env.MINDSHARE_EPOCH2_DAILY_SNAPSHOT_LOG_PATH?.trim()
  if (custom) return resolve(custom)
  return resolve(epoch2DataRoot(), EPOCH2_FILE_NAMES.dailySnapshotsLog)
}

/** Sync per-file env paths to the hardcoded snapshot dir (optional for scripts). */
export function applyEpoch2SnapshotDirToProcessEnv(dataDir?: string): string {
  const root = resolve(dataDir?.trim() || EPOCH2_SNAPSHOT_DATA_DIR)
  process.env.MINDSHARE_EPOCH2_DATA_DIR = root
  process.env.MINDSHARE_EPOCH2_DAILY_STATE_PATH = resolve(root, EPOCH2_FILE_NAMES.dailyState)
  process.env.MINDSHARE_EPOCH2_LEADERBOARD_SNAPSHOT_PATH = resolve(root, EPOCH2_FILE_NAMES.leaderboardSnapshot)
  process.env.MINDSHARE_EPOCH2_METRICS_CACHE_PATH = resolve(root, EPOCH2_FILE_NAMES.metricsCache)
  process.env.MINDSHARE_EPOCH2_SR_ELIGIBLE_WALLETS_PATH = resolve(root, EPOCH2_FILE_NAMES.srEligibleWallets)
  process.env.MINDSHARE_EPOCH2_SR_SNAPSHOT_LOG_PATH = resolve(root, EPOCH2_FILE_NAMES.srSnapshotsLog)
  process.env.MINDSHARE_EPOCH2_DAILY_SNAPSHOT_LOG_PATH = resolve(root, EPOCH2_FILE_NAMES.dailySnapshotsLog)
  return root
}

/** Full sandbox: snapshots + CSV both under `dataDir` (local experiments only). */
export function applyEpoch2DataDirToProcessEnv(dataDir?: string): string {
  const root = applyEpoch2SnapshotDirToProcessEnv(dataDir)
  process.env.MINDSHARE_SUBMISSIONS_CSV_PATH = resolve(root, EPOCH2_FILE_NAMES.submissionsCsv)
  return root
}
