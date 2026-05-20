import { readFile } from 'node:fs/promises'

import { EPOCH2_GUARANTEED_TOP7_HANDLES } from './mindshareEpoch2GuaranteedTop7'
import { defaultEpoch2SrSnapshotLogPath } from './mindshareEpoch2DataPaths'
import type { Epoch2ApiUser } from './mindshareEpoch2LeaderboardBuild'
import { gmt7DayKeyFromMs, gmt7PreviousDayKey, gmt7SrEligibilitySnapshotInstantMs } from './mindshareEpoch2Gmt7'
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

const EPOCH2_CHECKPOINT_DATE_LABELS: Record<Epoch2CheckpointDayKey, string> = {
  '2026-05-15': '15 May 2026',
  '2026-05-16': '16 May 2026',
  '2026-05-17': '17 May 2026',
  '2026-05-18': '18 May 2026',
  '2026-05-19': '19 May 2026',
}

export type Epoch2CheckpointColumn = { dayKey: Epoch2CheckpointDayKey; dateLabel: string }

/**
 * Checkpoint columns shown on `/epoch2`.
 * Day *D* appears only after its SR snapshot instant (00:00 GMT+7 on calendar day *D+1*).
 * E.g. 19 May is hidden until tonight's midnight GMT+7 cron — not when `epoch2-rebuild` backfills it early.
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
  const runDayGmt7 = gmt7DayKeyFromMs(atMs)
  // First checkpoint day backfill was stored without `eligibilityDayKey` (meant that calendar day).
  if (runDayGmt7 === EPOCH2_CHECKPOINT_DAY_KEYS[0]) return runDayGmt7
  // Later manual/cron runs: midnight on D records eligibility for GMT+7 day D−1.
  return gmt7PreviousDayKey(runDayGmt7)
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
  nowMs = Date.now(),
): boolean[] {
  const published = epoch2PublishedCheckpointDayKeys(nowMs)
  if (isGuaranteed) return published.map(() => true)
  const wk = walletLower.trim().toLowerCase()
  return published.map((day) => eligibilityByDay.get(day)?.has(wk) ?? false)
}

/** At least one SR checkpoint tick (15–19 May) passed. */
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
    const checkpoints = checkpointsForWallet(wk, eligibilityByDay, isGuaranteed, Date.now())
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
