import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { MindshareEpoch2LeaderboardPayload } from './mindshareEpoch2LeaderboardBuild'

export {
  defaultEpoch2DailyStatePath,
  defaultEpoch2LeaderboardSnapshotPath,
} from './mindshareEpoch2DataPaths'
import {
  defaultEpoch2DailyStatePath,
  defaultEpoch2LeaderboardSnapshotPath,
} from './mindshareEpoch2DataPaths'

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
  /** Subset of `countedPostKeys` from the bootstrap snapshot — score × {@link EPOCH2_FIRST_SNAPSHOT_SCORE_MULTIPLIER}. */
  bootstrapPostKeys: string[]
}

export type Epoch2LeaderboardSnapshotFile = MindshareEpoch2LeaderboardPayload & {
  snapshotDayKey: string
  isBootstrap: boolean
  postWindow: { startMs: number; endMs: number; eligibilityDayKey: string }
  cronTimezoneNote: 'Daily snapshot at 17:00 UTC'
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
    const bootstrapPostKeys = Array.isArray(j.bootstrapPostKeys)
      ? j.bootstrapPostKeys.map((k) => String(k))
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
      bootstrapPostKeys,
    }
  } catch {
    return {
      bootstrapCompleted: false,
      epoch1CarryoverApplied: false,
      guaranteedEpoch1BaselinesMerged: [],
      lastSnapshotAt: null,
      lastSnapshotDayKey: null,
      countedPostKeys: [],
      bootstrapPostKeys: [],
    }
  }
}

export function bootstrapPostKeySet(keys: string[]): Set<string> {
  return new Set(keys.map((k) => k.trim()).filter(Boolean))
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
