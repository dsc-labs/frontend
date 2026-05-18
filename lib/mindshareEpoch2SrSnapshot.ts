import { mkdir, appendFile, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { readMindshareSubmissionsCsv } from './mindshareCsvStore'
import {
  EPOCH2_MINDSHARE_SR_SNAPSHOT_THRESHOLD_EXCLUSIVE,
  EPOCH_2_END_MS,
} from './mindshareEpoch2Constants'
import { readEpoch2DailyState } from './mindshareEpoch2DailyState'
import { gmt7PostCountWindowForSnapshot } from './mindshareEpoch2Gmt7'
import { fetchErc20Balance, rawBalanceToTokenUnits, SR_TOKEN_DECIMALS } from './waitlistCalculator'
import { WAITLIST_SR_TOKEN } from './waitlistPricing'
import { getServerBaseRpcUrl } from './serverBaseRpc'

async function runPool<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0
  async function worker() {
    for (;;) {
      if (i >= items.length) return
      const idx = i
      i += 1
      await fn(items[idx]!)
    }
  }
  const n = Math.min(Math.max(1, concurrency), Math.max(1, items.length))
  await Promise.all(Array.from({ length: items.length ? n : 0 }, () => worker()))
}

function defaultSnapshotLogPath(): string {
  const custom = process.env.MINDSHARE_EPOCH2_SR_SNAPSHOT_LOG_PATH?.trim()
  if (custom) return resolve(custom)
  if (process.env.VERCEL) {
    return resolve('/tmp', 'mma-robot', 'mindshare', 'epoch2_sr_snapshots.jsonl')
  }
  return resolve(process.cwd(), 'data', 'mindshare', 'epoch2_sr_snapshots.jsonl')
}

/** Current SR-eligible wallet list for the live leaderboard (updated by midnight snapshot only). */
export function defaultEpoch2SrEligibleWalletsPath(): string {
  const custom = process.env.MINDSHARE_EPOCH2_SR_ELIGIBLE_WALLETS_PATH?.trim()
  if (custom) return resolve(custom)
  if (process.env.VERCEL) {
    return resolve('/tmp', 'mma-robot', 'mindshare', 'epoch2_sr_eligible_wallets.json')
  }
  return resolve(process.cwd(), 'data', 'mindshare', 'epoch2_sr_eligible_wallets.json')
}

export type Epoch2SrEligibleWalletsFile = {
  updatedAt: string
  thresholdExclusive: number
  walletsLower: string[]
  /** Latest on-chain $SR (human units) per wallet from the last snapshot. */
  balancesByWallet?: Record<string, number>
  /** GMT+7 eligibility day this snapshot applies to. */
  eligibilityDayKey?: string
}

/**
 * Latest daily SR eligibility snapshot for gating the **live** Epoch 2 leaderboard.
 * Returns null if missing or invalid.
 */
export async function readEpoch2SrEligibleWalletsFromSnapshot(): Promise<Epoch2SrEligibleWalletsFile | null> {
  const p = defaultEpoch2SrEligibleWalletsPath()
  try {
    const raw = await readFile(p, 'utf8')
    const j = JSON.parse(raw) as Partial<Epoch2SrEligibleWalletsFile>
    if (!j.updatedAt || !Array.isArray(j.walletsLower)) return null
    const walletsLower = j.walletsLower
      .map((w) => String(w).trim().toLowerCase())
      .filter((w) => w.startsWith('0x') && w.length === 42)
    return {
      updatedAt: String(j.updatedAt),
      thresholdExclusive:
        typeof j.thresholdExclusive === 'number' && Number.isFinite(j.thresholdExclusive)
          ? j.thresholdExclusive
          : EPOCH2_MINDSHARE_SR_SNAPSHOT_THRESHOLD_EXCLUSIVE,
      walletsLower,
    }
  } catch {
    return null
  }
}

export type MindshareEpoch2SrSnapshotResult =
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
      atIso: string
      /** Cron is scheduled at 17:00 UTC (= 00:00 GMT+7, no DST). */
      cronTimezoneNote: '17:00 UTC = 00:00 GMT+7'
      thresholdExclusive: number
      totalMindshareWallets: number
      eligibleCount: number
      eligibleWalletsLower: string[]
      rpcFailures: number
      logPath: string
      eligibleWalletsPath: string
    }
  | { ok: false; error: string }

/**
 * Midnight snapshot: recompute on-chain SR for every mindshare CSV wallet; eligible if SR **>**
 * {@link EPOCH2_MINDSHARE_SR_SNAPSHOT_THRESHOLD_EXCLUSIVE}. Writes:
 * - `epoch2_sr_eligible_wallets.json` — consumed by the live leaderboard for SR gating only
 * - jsonl audit log (append one line)
 *
 * No-op after {@link EPOCH_2_END_MS}.
 */
export async function runMindshareEpoch2SrEligibilitySnapshot(nowMs = Date.now()): Promise<MindshareEpoch2SrSnapshotResult> {
  if (nowMs >= EPOCH_2_END_MS) {
    return {
      ok: true,
      skipped: true,
      reason: 'epoch2-ended',
      epoch2EndMs: EPOCH_2_END_MS,
      nowMs,
    }
  }

  const rpcUrl = getServerBaseRpcUrl()
  if (!rpcUrl) {
    return { ok: false, error: 'Missing BASE_RPC_URL or VITE_BASE_RPC_URL (required for on-chain SR snapshot)' }
  }

  const dailyState = await readEpoch2DailyState()
  const isBootstrap = !dailyState.bootstrapCompleted
  const { eligibilityDayKey } = gmt7PostCountWindowForSnapshot(nowMs, isBootstrap)

  const rows = await readMindshareSubmissionsCsv(process.env.MINDSHARE_SUBMISSIONS_CSV_PATH)
  const keys = [
    ...new Set(
      rows
        .map((r) => r.walletAddress.trim().toLowerCase())
        .filter((w) => w.startsWith('0x') && w.length === 42),
    ),
  ]

  const threshold = EPOCH2_MINDSHARE_SR_SNAPSHOT_THRESHOLD_EXCLUSIVE
  const unitsByWallet = new Map<string, number>()
  let rpcFailures = 0
  const conc = Math.max(
    1,
    Math.min(32, Number(process.env.MINDSHARE_EPOCH2_SR_SNAPSHOT_RPC_CONCURRENCY || '8') || 8),
  )

  await runPool(keys, conc, async (w) => {
    const addr = w.startsWith('0x') ? w : `0x${w}`
    try {
      const raw = await fetchErc20Balance({
        rpcUrl,
        tokenAddress: WAITLIST_SR_TOKEN,
        walletAddress: addr,
      })
      const units = rawBalanceToTokenUnits(raw, SR_TOKEN_DECIMALS)
      unitsByWallet.set(w, units)
    } catch {
      rpcFailures += 1
    }
  })

  const eligibleWalletsLower = keys.filter((w) => (unitsByWallet.get(w) ?? 0) > threshold).sort()

  const atIso = new Date().toISOString()
  const logPath = defaultSnapshotLogPath()
  await mkdir(dirname(logPath), { recursive: true })
  const balancesByWallet: Record<string, number> = {}
  for (const w of keys) {
    const units = unitsByWallet.get(w)
    if (typeof units === 'number' && Number.isFinite(units)) balancesByWallet[w] = units
  }

  const line = JSON.stringify({
    at: atIso,
    eligibilityDayKey,
    cronTimezoneNote: '17:00 UTC = 00:00 GMT+7',
    thresholdExclusive: threshold,
    totalMindshareWallets: keys.length,
    eligibleCount: eligibleWalletsLower.length,
    eligibleWalletsLower,
    rpcFailures,
  })
  await appendFile(logPath, `${line}\n`, 'utf8')

  const eligibleWalletsPath = defaultEpoch2SrEligibleWalletsPath()
  await mkdir(dirname(eligibleWalletsPath), { recursive: true })
  const body: Epoch2SrEligibleWalletsFile = {
    updatedAt: atIso,
    thresholdExclusive: threshold,
    walletsLower: eligibleWalletsLower,
    balancesByWallet,
    eligibilityDayKey,
  }
  await writeFile(eligibleWalletsPath, `${JSON.stringify(body, null, 2)}\n`, 'utf8')

  return {
    ok: true,
    skipped: false,
    atIso,
    cronTimezoneNote: '17:00 UTC = 00:00 GMT+7',
    thresholdExclusive: threshold,
    totalMindshareWallets: keys.length,
    eligibleCount: eligibleWalletsLower.length,
    eligibleWalletsLower,
    rpcFailures,
    logPath,
    eligibleWalletsPath,
  }
}
