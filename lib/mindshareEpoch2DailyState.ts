import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import type { MindshareEpoch2LeaderboardPayload } from './mindshareEpoch2LeaderboardBuild'

function dataRoot(): string {
  if (process.env.VERCEL) return resolve('/tmp', 'mma-robot', 'mindshare')
  return resolve(process.cwd(), 'data', 'mindshare')
}

export function defaultEpoch2DailyStatePath(): string {
  const custom = process.env.MINDSHARE_EPOCH2_DAILY_STATE_PATH?.trim()
  return custom ? resolve(custom) : resolve(dataRoot(), 'epoch2_daily_state.json')
}

export function defaultEpoch2LeaderboardSnapshotPath(): string {
  const custom = process.env.MINDSHARE_EPOCH2_LEADERBOARD_SNAPSHOT_PATH?.trim()
  return custom ? resolve(custom) : resolve(dataRoot(), 'epoch2_leaderboard_snapshot.json')
}

export type Epoch2DailyState = {
  bootstrapCompleted: boolean
  /** Epoch 1 ranks 102+ merged into cumulative scores (once). */
  epoch1CarryoverApplied: boolean
  /** Guaranteed top-7 wallets that already received Epoch 1 score baseline (once each). */
  guaranteedEpoch1BaselinesMerged: string[]
  lastSnapshotAt: string | null
  lastSnapshotDayKey: string | null
  /** `walletLower:tweetId` keys already scored into the cumulative leaderboard. */
  countedPostKeys: string[]
}

export type Epoch2LeaderboardSnapshotFile = MindshareEpoch2LeaderboardPayload & {
  snapshotDayKey: string
  isBootstrap: boolean
  postWindow: { startMs: number; endMs: number; eligibilityDayKey: string }
  cronTimezoneNote: '17:00 UTC = 00:00 GMT+7'
}

export function epoch2PostKey(walletLower: string, tweetId: string): string {
  return `${walletLower}:${tweetId}`
}

export async function readEpoch2DailyState(): Promise<Epoch2DailyState> {
  const p = defaultEpoch2DailyStatePath()
  try {
    const raw = await readFile(p, 'utf8')
    const j = JSON.parse(raw) as Partial<Epoch2DailyState>
    const countedPostKeys = Array.isArray(j.countedPostKeys)
      ? j.countedPostKeys.map((k) => String(k))
      : []
    const guaranteedEpoch1BaselinesMerged = Array.isArray(j.guaranteedEpoch1BaselinesMerged)
      ? j.guaranteedEpoch1BaselinesMerged.map((w) => String(w).toLowerCase())
      : []
    return {
      bootstrapCompleted: j.bootstrapCompleted === true,
      epoch1CarryoverApplied: j.epoch1CarryoverApplied === true,
      guaranteedEpoch1BaselinesMerged,
      lastSnapshotAt: j.lastSnapshotAt ? String(j.lastSnapshotAt) : null,
      lastSnapshotDayKey: j.lastSnapshotDayKey ? String(j.lastSnapshotDayKey) : null,
      countedPostKeys,
    }
  } catch {
    return {
      bootstrapCompleted: false,
      epoch1CarryoverApplied: false,
      guaranteedEpoch1BaselinesMerged: [],
      lastSnapshotAt: null,
      lastSnapshotDayKey: null,
      countedPostKeys: [],
    }
  }
}

export async function writeEpoch2DailyState(state: Epoch2DailyState): Promise<string> {
  const p = defaultEpoch2DailyStatePath()
  await mkdir(dirname(p), { recursive: true })
  await writeFile(p, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
  return p
}

export async function readEpoch2LeaderboardSnapshot(): Promise<Epoch2LeaderboardSnapshotFile | null> {
  const p = defaultEpoch2LeaderboardSnapshotPath()
  try {
    const raw = await readFile(p, 'utf8')
    const j = JSON.parse(raw) as Epoch2LeaderboardSnapshotFile
    if (j.ok !== true || !j.generatedAt || !Array.isArray(j.users)) return null
    return j
  } catch {
    return null
  }
}

export async function writeEpoch2LeaderboardSnapshot(
  snapshot: Epoch2LeaderboardSnapshotFile,
): Promise<string> {
  const p = defaultEpoch2LeaderboardSnapshotPath()
  await mkdir(dirname(p), { recursive: true })
  await writeFile(p, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
  return p
}
