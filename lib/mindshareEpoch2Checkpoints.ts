import { readFile } from 'node:fs/promises'

import {
  EPOCH2_CHECKPOINT_DAY_KEYS,
  EPOCH2_SNAPSHOT_UTC_HOUR,
  type Epoch2CheckpointDayKey,
} from './mindshareEpoch2Constants'
import { EPOCH2_GUARANTEED_TOP7_HANDLES } from './mindshareEpoch2GuaranteedTop7'
import { defaultEpoch2SrSnapshotLogPath } from './mindshareEpoch2DataPaths'
import type { Epoch2ApiUser } from './mindshareEpoch2LeaderboardBuild'
import { gmt7DayKeyFromMs, gmt7SrEligibilitySnapshotInstantMs } from './mindshareEpoch2Gmt7'
import type { Epoch2SrEligibleWalletsFile } from './mindshareEpoch2SrSnapshot'
import { normalizeXUsername } from './xTweetMetrics'

export { EPOCH2_CHECKPOINT_DAY_KEYS, type Epoch2CheckpointDayKey } from './mindshareEpoch2Constants'

const EPOCH2_CHECKPOINT_DATE_LABELS: Record<Epoch2CheckpointDayKey, string> = {
  '2026-05-15': '15 May 2026',
  '2026-05-16': '16 May 2026',
  '2026-05-17': '17 May 2026',
  '2026-05-18': '18 May 2026',
  '2026-05-20': '20 May 2026',
}

export type Epoch2CheckpointColumn = { dayKey: Epoch2CheckpointDayKey; dateLabel: string }

/**
 * Checkpoint columns that have “published” (SR jsonl recorded) by wall-clock.
 * Prefer `epoch2CheckpointColumnsAll()` for the leaderboard payload so all five ticks (15–18 + 20 May) align with `checkpoints[]`.
 */
export function epoch2PublishedCheckpointDayKeys(nowMs = Date.now()): Epoch2CheckpointDayKey[] {
  return EPOCH2_CHECKPOINT_DAY_KEYS.filter((day) => nowMs >= gmt7SrEligibilitySnapshotInstantMs(day))
}

export function epoch2CheckpointColumns(nowMs = Date.now()): Epoch2CheckpointColumn[] {
  return epoch2PublishedCheckpointDayKeys(nowMs).map((dayKey) => ({
    dayKey,
    dateLabel: EPOCH2_CHECKPOINT_DATE_LABELS[dayKey],
  }))
}

/** All five checkpoint columns for `/epoch2` (no clock-based hiding). */
export function epoch2CheckpointColumnsAll(): Epoch2CheckpointColumn[] {
  return EPOCH2_CHECKPOINT_DAY_KEYS.map((dayKey) => ({
    dayKey,
    dateLabel: EPOCH2_CHECKPOINT_DATE_LABELS[dayKey],
  }))
}

type SrSnapshotLogLine = {
  at?: string
  eligibilityDayKey?: string
  eligibleWalletsLower?: string[]
}

function resolveEligibilityDayKey(line: SrSnapshotLogLine): string | null {
  if (line.eligibilityDayKey?.trim()) return line.eligibilityDayKey.trim()
  const at = line.at?.trim()
  if (!at) return null
  const atMs = Date.parse(at)
  if (!Number.isFinite(atMs)) return null
  const runDayUtc = gmt7DayKeyFromMs(atMs)
  const hour = new Date(atMs).getUTCHours()
  // 05:00 UTC checkpoint cron on day D → eligibility for day D.
  if (
    hour >= EPOCH2_SNAPSHOT_UTC_HOUR - 1 &&
    hour <= EPOCH2_SNAPSHOT_UTC_HOUR + 1 &&
    (EPOCH2_CHECKPOINT_DAY_KEYS as readonly string[]).includes(runDayUtc)
  ) {
    return runDayUtc
  }
  // Legacy 17:00 UTC (+7 midnight) lines: run on calendar day D stored eligibility for D−1.
  if (hour >= 16 && hour <= 18) {
    const prevMs = Date.parse(`${runDayUtc}T12:00:00.000Z`) - 24 * 60 * 60 * 1000
    return gmt7DayKeyFromMs(prevMs)
  }
  if (runDayUtc === EPOCH2_CHECKPOINT_DAY_KEYS[0]) return runDayUtc
  return runDayUtc
}

/** Last SR snapshot per eligibility day (from `epoch2_sr_snapshots.jsonl`). */
export async function loadEpoch2SrEligibilityByDay(): Promise<Map<string, Set<string>>> {
  let raw: string
  try {
    raw = await readFile(defaultEpoch2SrSnapshotLogPath(), 'utf8')
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

/** At least one SR checkpoint tick (15–18 + 20 May) passed. */
export function userHasAnyCheckpointEligible(checkpoints?: boolean[]): boolean {
  return Boolean(checkpoints?.some(Boolean))
}

/** Public stat card: eligible = ≥1 checkpoint tick, not latest-night `srEligible` only. */
export function countEpoch2ParticipantStats(users: Epoch2ApiUser[]): {
  totalParticipants: number
  eligibleParticipants: number
  notEligibleParticipants: number
} {
  const totalParticipants = users.length
  const eligibleParticipants = users.filter((u) => userHasAnyCheckpointEligible(u.checkpoints)).length
  return {
    totalParticipants,
    eligibleParticipants,
    notEligibleParticipants: totalParticipants - eligibleParticipants,
  }
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
    const isGuaranteed = guaranteed.has(wk)
    const checkpoints = checkpointsForWallet(wk, eligibilityByDay, isGuaranteed)
    const checkpointEligible = userHasAnyCheckpointEligible(checkpoints)
    return {
      ...u,
      ...(typeof bal === 'number' && Number.isFinite(bal) ? { srBalance: Math.round(bal * 10) / 10 } : {}),
      checkpoints,
      /** Rank with eligible competitors when any checkpoint tick is green (not latest night only). */
      srEligible: isGuaranteed || checkpointEligible || u.srEligible,
    }
  })
}
