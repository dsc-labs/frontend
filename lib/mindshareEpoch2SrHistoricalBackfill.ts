import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { findBlockNumberAtOrBefore, blockNumberToHex } from './baseBlockAtTime'
import { EPOCH2_CHECKPOINT_DAY_KEYS } from './mindshareEpoch2Checkpoints'
import { EPOCH2_MINDSHARE_SR_SNAPSHOT_THRESHOLD_EXCLUSIVE } from './mindshareEpoch2Constants'
import { gmt7SrEligibilitySnapshotInstantMs } from './mindshareEpoch2Gmt7'
import { readMindshareSubmissionsCsv } from './mindshareCsvStore'
import { getServerArchiveRpcUrl } from './serverBaseRpc'
import { defaultSnapshotLogPath } from './mindshareEpoch2SrSnapshot'
import { fetchErc20Balance, rawBalanceToTokenUnits, SR_TOKEN_DECIMALS } from './waitlistCalculator'
import { WAITLIST_SR_TOKEN } from './waitlistPricing'

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

function isCheckpointDayKey(day: string): boolean {
  return (EPOCH2_CHECKPOINT_DAY_KEYS as readonly string[]).includes(day)
}

async function readSnapshotLogLines(logPath: string): Promise<string[]> {
  try {
    const raw = await readFile(logPath, 'utf8')
    return raw.split(/\r?\n/).filter((l) => l.trim())
  } catch {
    return []
  }
}

async function appendOrReplaceSnapshotLine(
  logPath: string,
  line: string,
  eligibilityDayKey: string,
  replace: boolean,
): Promise<'appended' | 'replaced' | 'skipped'> {
  const existing = await readSnapshotLogLines(logPath)
  const hasDay = existing.some((l) => {
    try {
      return (JSON.parse(l) as { eligibilityDayKey?: string }).eligibilityDayKey === eligibilityDayKey
    } catch {
      return false
    }
  })

  if (hasDay && !replace) return 'skipped'

  await mkdir(dirname(logPath), { recursive: true })
  if (hasDay && replace) {
    const kept = existing.filter((l) => {
      try {
        return (JSON.parse(l) as { eligibilityDayKey?: string }).eligibilityDayKey !== eligibilityDayKey
      } catch {
        return true
      }
    })
    kept.push(line.trim())
    await writeFile(logPath, `${kept.join('\n')}\n`, 'utf8')
    return 'replaced'
  }

  await appendFile(logPath, `${line}\n`, 'utf8')
  return 'appended'
}

export type MindshareEpoch2SrHistoricalBackfillResult =
  | { ok: true; skipped: true; reason: 'already-exists'; eligibilityDayKey: string; logPath: string }
  | {
      ok: true
      skipped: false
      eligibilityDayKey: string
      atIso: string
      blockNumber: number
      blockTimestampSec: number
      targetTimestampSec: number
      thresholdExclusive: number
      totalMindshareWallets: number
      eligibleCount: number
      eligibleWalletsLower: string[]
      rpcFailures: number
      logPath: string
      writeAction: 'appended' | 'replaced'
      cronTimezoneNote: '17:00 UTC = 00:00 GMT+7'
    }
  | { ok: false; error: string }

/**
 * On-chain SR balances at the block at/just before midnight GMT+7 after `eligibilityDayKey`,
 * then append (or replace) one line in `epoch2_sr_snapshots.jsonl` for UI checkpoints.
 */
export async function runMindshareEpoch2SrHistoricalBackfill(options: {
  eligibilityDayKey: string
  csvPath?: string
  rpcUrl?: string
  /** Replace existing jsonl line for this day if present. */
  replace?: boolean
}): Promise<MindshareEpoch2SrHistoricalBackfillResult> {
  const eligibilityDayKey = options.eligibilityDayKey.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eligibilityDayKey)) {
    return { ok: false, error: 'Invalid eligibilityDayKey (expected YYYY-MM-DD)' }
  }
  if (!isCheckpointDayKey(eligibilityDayKey)) {
    return {
      ok: false,
      error: `eligibilityDayKey must be one of: ${EPOCH2_CHECKPOINT_DAY_KEYS.join(', ')}`,
    }
  }

  const rpcUrl = options.rpcUrl?.trim() || getServerArchiveRpcUrl()
  if (!rpcUrl) {
    return {
      ok: false,
      error: 'Missing BASE_ARCHIVE_RPC_URL or BASE_RPC_URL (archive RPC required for historical balances)',
    }
  }

  const logPath = defaultSnapshotLogPath()
  const replace = options.replace === true

  const existing = await readSnapshotLogLines(logPath)
  const hasDay = existing.some((l) => {
    try {
      return (JSON.parse(l) as { eligibilityDayKey?: string }).eligibilityDayKey === eligibilityDayKey
    } catch {
      return false
    }
  })
  if (hasDay && !replace) {
    return { ok: true, skipped: true, reason: 'already-exists', eligibilityDayKey, logPath }
  }

  const targetMs = gmt7SrEligibilitySnapshotInstantMs(eligibilityDayKey)
  const targetTimestampSec = Math.floor(targetMs / 1000)
  const { blockNumber, blockTimestampSec } = await findBlockNumberAtOrBefore(rpcUrl, targetTimestampSec)
  const blockTag = blockNumberToHex(blockNumber)

  const rows = await readMindshareSubmissionsCsv(options.csvPath)
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
    Math.min(32, Number(process.env.MINDSHARE_EPOCH2_SR_BACKFILL_RPC_CONCURRENCY || '8') || 8),
  )

  await runPool(keys, conc, async (w) => {
    const addr = w.startsWith('0x') ? w : `0x${w}`
    try {
      const raw = await fetchErc20Balance({
        rpcUrl,
        tokenAddress: WAITLIST_SR_TOKEN,
        walletAddress: addr,
        blockTag,
      })
      unitsByWallet.set(w, rawBalanceToTokenUnits(raw, SR_TOKEN_DECIMALS))
    } catch {
      rpcFailures += 1
    }
  })

  const eligibleWalletsLower = keys.filter((w) => (unitsByWallet.get(w) ?? 0) > threshold).sort()
  const atIso = new Date(targetMs).toISOString()

  const line = JSON.stringify({
    at: atIso,
    eligibilityDayKey,
    cronTimezoneNote: '17:00 UTC = 00:00 GMT+7',
    thresholdExclusive: threshold,
    totalMindshareWallets: keys.length,
    eligibleCount: eligibleWalletsLower.length,
    eligibleWalletsLower,
    rpcFailures,
    historicalBackfill: true,
    blockNumber,
    blockNumberHex: blockTag,
    blockTimestampSec,
    targetTimestampSec,
  })

  const writeAction = await appendOrReplaceSnapshotLine(logPath, line, eligibilityDayKey, replace)

  return {
    ok: true,
    skipped: false,
    eligibilityDayKey,
    atIso,
    blockNumber,
    blockTimestampSec,
    targetTimestampSec,
    thresholdExclusive: threshold,
    totalMindshareWallets: keys.length,
    eligibleCount: eligibleWalletsLower.length,
    eligibleWalletsLower,
    rpcFailures,
    logPath,
    writeAction,
    cronTimezoneNote: '17:00 UTC = 00:00 GMT+7',
  }
}
