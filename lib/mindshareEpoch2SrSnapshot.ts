import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { defaultEpoch2SrEligibleWalletsPath } from './mindshareEpoch2DataPaths'
import { readEpoch2DailyState } from './mindshareEpoch2DailyState'
import {
  EPOCH2_MINDSHARE_SR_SNAPSHOT_THRESHOLD_EXCLUSIVE,
  EPOCH_2_END_MS,
} from './mindshareEpoch2Constants'
import { gmt7PostCountWindowForSnapshot } from './mindshareEpoch2Gmt7'
import { computeEpoch2SrEligibilityForDay } from './mindshareEpoch2SrEligibilityAtDay'
import { defaultSnapshotLogPath, writeEpoch2SrSnapshotLogLine } from './mindshareEpoch2SrSnapshotLog'
import { getServerArchiveRpcUrl } from './serverBaseRpc'

export { defaultSnapshotLogPath } from './mindshareEpoch2SrSnapshotLog'
export { defaultEpoch2SrEligibleWalletsPath } from './mindshareEpoch2DataPaths'

export type Epoch2SrEligibleWalletsFile = {
  updatedAt: string
  thresholdExclusive: number
  walletsLower: string[]
  /** $SR (human units) per wallet at the snapshot block for `eligibilityDayKey`. */
  balancesByWallet?: Record<string, number>
  eligibilityDayKey?: string
  balanceSource?: 'archive-block'
  blockNumber?: number
  targetTimestampSec?: number
}

/**
 * Latest SR eligibility snapshot used to gate **post scoring** on the next step of the daily job.
 * Balances are at the archive block for `eligibilityDayKey`, not chain `latest`.
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
      balancesByWallet: j.balancesByWallet,
      eligibilityDayKey: j.eligibilityDayKey ? String(j.eligibilityDayKey) : undefined,
      balanceSource: j.balanceSource === 'archive-block' ? 'archive-block' : undefined,
      blockNumber: typeof j.blockNumber === 'number' ? j.blockNumber : undefined,
      targetTimestampSec: typeof j.targetTimestampSec === 'number' ? j.targetTimestampSec : undefined,
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
      cronTimezoneNote: 'Daily snapshot at 17:00 UTC'
      eligibilityDayKey: string
      thresholdExclusive: number
      totalMindshareWallets: number
      eligibleCount: number
      eligibleWalletsLower: string[]
      rpcFailures: number
      blockNumber: number
      blockTimestampSec: number
      targetTimestampSec: number
      balanceSource: 'archive-block'
      logPath: string
      eligibleWalletsPath: string
      logWriteAction: 'appended' | 'replaced'
    }
  | { ok: false; error: string }

/**
 * SR eligibility for `eligibilityDayKey` at the archive block for the 17:00 UTC snapshot.
 * Writes checkpoint jsonl + `epoch2_sr_eligible_wallets.json` (used only for post window gating).
 *
 * Post counting/scoring is handled separately in {@link runMindshareEpoch2DailySnapshot}.
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

  const rpcUrl = getServerArchiveRpcUrl()
  if (!rpcUrl) {
    return {
      ok: false,
      error:
        'Missing BASE_ARCHIVE_RPC_URL or BASE_RPC_URL (archive RPC required for SR eligibility at 17:00 UTC snapshot)',
    }
  }

  const dailyState = await readEpoch2DailyState()
  const isBootstrap = !dailyState.bootstrapCompleted
  const { eligibilityDayKey } = gmt7PostCountWindowForSnapshot(nowMs, isBootstrap)

  const computed = await computeEpoch2SrEligibilityForDay({
    eligibilityDayKey,
    rpcUrl,
    csvPath: process.env.MINDSHARE_SUBMISSIONS_CSV_PATH,
  })

  const runAtIso = new Date().toISOString()
  const logPath = defaultSnapshotLogPath()

  const line = JSON.stringify({
    at: computed.targetAtIso,
    recordedAt: runAtIso,
    eligibilityDayKey: computed.eligibilityDayKey,
    cronTimezoneNote: 'Daily snapshot at 17:00 UTC',
    thresholdExclusive: computed.thresholdExclusive,
    totalMindshareWallets: computed.totalMindshareWallets,
    eligibleCount: computed.eligibleCount,
    eligibleWalletsLower: computed.eligibleWalletsLower,
    rpcFailures: computed.rpcFailures,
    balanceSource: 'archive-block',
    blockNumber: computed.blockNumber,
    blockNumberHex: computed.blockNumberHex,
    blockTimestampSec: computed.blockTimestampSec,
    targetTimestampSec: computed.targetTimestampSec,
  })

  const logWriteAction = await writeEpoch2SrSnapshotLogLine({
    logPath,
    eligibilityDayKey: computed.eligibilityDayKey,
    line,
  })

  const eligibleWalletsPath = defaultEpoch2SrEligibleWalletsPath()
  await mkdir(dirname(eligibleWalletsPath), { recursive: true })
  const body: Epoch2SrEligibleWalletsFile = {
    updatedAt: runAtIso,
    thresholdExclusive: computed.thresholdExclusive,
    walletsLower: computed.eligibleWalletsLower,
    balancesByWallet: computed.balancesByWallet,
    eligibilityDayKey: computed.eligibilityDayKey,
    balanceSource: 'archive-block',
    blockNumber: computed.blockNumber,
    targetTimestampSec: computed.targetTimestampSec,
  }
  await writeFile(eligibleWalletsPath, `${JSON.stringify(body, null, 2)}\n`, 'utf8')

  return {
    ok: true,
    skipped: false,
    atIso: runAtIso,
    cronTimezoneNote: 'Daily snapshot at 17:00 UTC',
    eligibilityDayKey: computed.eligibilityDayKey,
    thresholdExclusive: computed.thresholdExclusive,
    totalMindshareWallets: computed.totalMindshareWallets,
    eligibleCount: computed.eligibleCount,
    eligibleWalletsLower: computed.eligibleWalletsLower,
    rpcFailures: computed.rpcFailures,
    blockNumber: computed.blockNumber,
    blockTimestampSec: computed.blockTimestampSec,
    targetTimestampSec: computed.targetTimestampSec,
    balanceSource: 'archive-block',
    logPath,
    eligibleWalletsPath,
    logWriteAction,
  }
}
