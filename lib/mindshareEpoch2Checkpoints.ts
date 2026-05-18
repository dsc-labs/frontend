import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { EPOCH2_GUARANTEED_TOP7_HANDLES } from './mindshareEpoch2GuaranteedTop7'
import type { Epoch2ApiUser } from './mindshareEpoch2LeaderboardBuild'
import { gmt7DayKeyFromMs } from './mindshareEpoch2Gmt7'
import type { Epoch2SrEligibleWalletsFile } from './mindshareEpoch2SrSnapshot'
import { normalizeXUsername } from './xTweetMetrics'

/** GMT+7 eligibility days shown as status checkpoints (15 → 19 May). */
export const EPOCH2_CHECKPOINT_DAY_KEYS = [
  '2026-05-15',
  '2026-05-16',
  '2026-05-17',
  '2026-05-18',
  '2026-05-19',
] as const

export type Epoch2CheckpointDayKey = (typeof EPOCH2_CHECKPOINT_DAY_KEYS)[number]

type SrSnapshotLogLine = {
  at?: string
  eligibilityDayKey?: string
  eligibleWalletsLower?: string[]
}

function defaultSrSnapshotLogPath(): string {
  const custom = process.env.MINDSHARE_EPOCH2_SR_SNAPSHOT_LOG_PATH?.trim()
  if (custom) return resolve(custom)
  if (process.env.VERCEL) {
    return resolve('/tmp', 'mma-robot', 'mindshare', 'epoch2_sr_snapshots.jsonl')
  }
  return resolve(process.cwd(), 'data', 'mindshare', 'epoch2_sr_snapshots.jsonl')
}

function resolveEligibilityDayKey(line: SrSnapshotLogLine): string | null {
  if (line.eligibilityDayKey?.trim()) return line.eligibilityDayKey.trim()
  const at = line.at?.trim()
  if (!at) return null
  const atMs = Date.parse(at)
  if (!Number.isFinite(atMs)) return null
  // Legacy rows without eligibilityDayKey: use GMT+7 calendar day of the run.
  return gmt7DayKeyFromMs(atMs)
}

/** Last SR snapshot per eligibility day (from `epoch2_sr_snapshots.jsonl`). */
export async function loadEpoch2SrEligibilityByDay(): Promise<Map<string, Set<string>>> {
  let raw: string
  try {
    raw = await readFile(defaultSrSnapshotLogPath(), 'utf8')
  } catch {
    return new Map()
  }

  const lines = raw.split(/\r?\n/).filter((l) => l.trim())
  const parsed: SrSnapshotLogLine[] = []
  for (const line of lines) {
    try {
      parsed.push(JSON.parse(line) as SrSnapshotLogLine)
    } catch {
      /* skip malformed */
    }
  }

  parsed.sort((a, b) => Date.parse(a.at ?? '') - Date.parse(b.at ?? ''))

  const byDay = new Map<string, Set<string>>()
  for (const line of parsed) {
    const dayKey = resolveEligibilityDayKey(line)
    if (!dayKey) continue
    const wallets = (line.eligibleWalletsLower ?? [])
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.startsWith('0x') && w.length === 42)
    byDay.set(dayKey, new Set(wallets))
  }
  return byDay
}

function guaranteedWalletSet(users: Epoch2ApiUser[]): Set<string> {
  const handles = new Set(EPOCH2_GUARANTEED_TOP7_HANDLES.map((h) => normalizeXUsername(h)))
  const out = new Set<string>()
  for (const u of users) {
    const h = normalizeXUsername(u.xHandle ?? u.username)
    if (h && handles.has(h)) out.add(u.wallet.trim().toLowerCase())
  }
  return out
}

export function checkpointsForWallet(
  walletLower: string,
  eligibilityByDay: Map<string, Set<string>>,
  isGuaranteed: boolean,
): boolean[] {
  if (isGuaranteed) return EPOCH2_CHECKPOINT_DAY_KEYS.map(() => true)
  const wk = walletLower.trim().toLowerCase()
  return EPOCH2_CHECKPOINT_DAY_KEYS.map((day) => eligibilityByDay.get(day)?.has(wk) ?? false)
}

export async function enrichEpoch2UsersWithCheckpointsAndSrBalance(
  users: Epoch2ApiUser[],
  eligibleSnap: Epoch2SrEligibleWalletsFile | null,
): Promise<Epoch2ApiUser[]> {
  const eligibilityByDay = await loadEpoch2SrEligibilityByDay()
  const guaranteed = guaranteedWalletSet(users)
  const balances = eligibleSnap?.balancesByWallet ?? {}

  return users.map((u) => {
    const wk = u.wallet.trim().toLowerCase()
    const bal = balances[wk]
    return {
      ...u,
      ...(typeof bal === 'number' && Number.isFinite(bal) ? { srBalance: Math.round(bal * 10) / 10 } : {}),
      checkpoints: checkpointsForWallet(wk, eligibilityByDay, guaranteed.has(wk)),
    }
  })
}
