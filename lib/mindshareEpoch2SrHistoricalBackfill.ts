import { EPOCH2_CHECKPOINT_DAY_KEYS } from './mindshareEpoch2Checkpoints'
import { computeEpoch2SrEligibilityForDay } from './mindshareEpoch2SrEligibilityAtDay'
import { getServerArchiveRpcUrl } from './serverBaseRpc'
import {
  defaultSnapshotLogPath,
  readSnapshotLogLines,
  writeEpoch2SrSnapshotLogLine,
} from './mindshareEpoch2SrSnapshotLog'

function isCheckpointDayKey(day: string): boolean {
  return (EPOCH2_CHECKPOINT_DAY_KEYS as readonly string[]).includes(day)
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
      balanceSource: 'archive-block'
    }
  | { ok: false; error: string }

/**
 * Operator backfill: same archive-block SR logic as the daily cron, for one `eligibilityDayKey`.
 * Does not update `epoch2_sr_eligible_wallets.json` or score posts.
 */
export async function runMindshareEpoch2SrHistoricalBackfill(options: {
  eligibilityDayKey: string
  csvPath?: string
  rpcUrl?: string
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

  if (!options.replace) {
    const existing = await readSnapshotLogLines(logPath)
    const hasDay = existing.some((l) => {
      try {
        return (JSON.parse(l) as { eligibilityDayKey?: string }).eligibilityDayKey === eligibilityDayKey
      } catch {
        return false
      }
    })
    if (hasDay) {
      return { ok: true, skipped: true, reason: 'already-exists', eligibilityDayKey, logPath }
    }
  }

  const computed = await computeEpoch2SrEligibilityForDay({
    eligibilityDayKey,
    rpcUrl,
    csvPath: options.csvPath,
  })

  const line = JSON.stringify({
    at: computed.targetAtIso,
    recordedAt: new Date().toISOString(),
    eligibilityDayKey: computed.eligibilityDayKey,
    cronTimezoneNote: '17:00 UTC = 00:00 GMT+7',
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
    historicalBackfill: true,
  })

  const writeAction = await writeEpoch2SrSnapshotLogLine({
    logPath,
    eligibilityDayKey,
    line,
  })

  return {
    ok: true,
    skipped: false,
    eligibilityDayKey: computed.eligibilityDayKey,
    atIso: computed.targetAtIso,
    blockNumber: computed.blockNumber,
    blockTimestampSec: computed.blockTimestampSec,
    targetTimestampSec: computed.targetTimestampSec,
    thresholdExclusive: computed.thresholdExclusive,
    totalMindshareWallets: computed.totalMindshareWallets,
    eligibleCount: computed.eligibleCount,
    eligibleWalletsLower: computed.eligibleWalletsLower,
    rpcFailures: computed.rpcFailures,
    logPath,
    writeAction,
    cronTimezoneNote: '17:00 UTC = 00:00 GMT+7',
    balanceSource: 'archive-block',
  }
}
