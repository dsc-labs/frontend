import { findBlockNumberAtOrBefore, blockNumberToHex } from './baseBlockAtTime'
import { sleepMs, withRpcRetry } from './rpcRetry'
import { EPOCH2_MINDSHARE_SR_SNAPSHOT_THRESHOLD_EXCLUSIVE } from './mindshareEpoch2Constants'
import { gmt7SrEligibilitySnapshotInstantMs } from './mindshareEpoch2Gmt7'
import { readMindshareSubmissionsCsv } from './mindshareCsvStore'
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

export type Epoch2SrEligibilityForDayResult = {
  eligibilityDayKey: string
  /** Canonical snapshot instant (= 17:00 UTC on eligibility calendar day). */
  targetTimestampSec: number
  targetAtIso: string
  blockNumber: number
  blockNumberHex: `0x${string}`
  blockTimestampSec: number
  thresholdExclusive: number
  totalMindshareWallets: number
  eligibleCount: number
  eligibleWalletsLower: string[]
  balancesByWallet: Record<string, number>
  rpcFailures: number
}

/**
 * SR eligibility for one GMT+7 `eligibilityDayKey`: $SR balance of every mindshare CSV wallet
 * at the archive block for {@link gmt7SrEligibilitySnapshotInstantMs} (midnight GMT+7 boundary).
 */
export async function computeEpoch2SrEligibilityForDay(options: {
  eligibilityDayKey: string
  rpcUrl: string
  csvPath?: string
}): Promise<Epoch2SrEligibilityForDayResult> {
  const eligibilityDayKey = options.eligibilityDayKey.trim()
  const targetMs = gmt7SrEligibilitySnapshotInstantMs(eligibilityDayKey)
  const targetTimestampSec = Math.floor(targetMs / 1000)
  const { blockNumber, blockTimestampSec } = await withRpcRetry(() =>
    findBlockNumberAtOrBefore(options.rpcUrl, targetTimestampSec),
  )
  const blockNumberHex = blockNumberToHex(blockNumber)

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
    Math.min(
      32,
      Number(
        process.env.MINDSHARE_EPOCH2_SR_SNAPSHOT_RPC_CONCURRENCY ||
          process.env.MINDSHARE_EPOCH2_SR_BACKFILL_RPC_CONCURRENCY ||
          '2',
      ) || 2,
    ),
  )
  const delayMs = Math.max(
    0,
    Number(process.env.MINDSHARE_EPOCH2_SR_RPC_DELAY_MS ?? '200') || 200,
  )

  await runPool(keys, conc, async (w) => {
    try {
      const raw = await withRpcRetry(() =>
        fetchErc20Balance({
          rpcUrl: options.rpcUrl,
          tokenAddress: WAITLIST_SR_TOKEN,
          walletAddress: w,
          blockTag: blockNumberHex,
        }),
      )
      unitsByWallet.set(w, rawBalanceToTokenUnits(raw, SR_TOKEN_DECIMALS))
    } catch {
      rpcFailures += 1
    }
    if (delayMs > 0) await sleepMs(delayMs)
  })

  const balancesByWallet: Record<string, number> = {}
  for (const w of keys) {
    const units = unitsByWallet.get(w)
    if (typeof units === 'number' && Number.isFinite(units)) {
      balancesByWallet[w] = Math.round(units * 10) / 10
    }
  }

  const eligibleWalletsLower = keys.filter((w) => (unitsByWallet.get(w) ?? 0) > threshold).sort()

  return {
    eligibilityDayKey,
    targetTimestampSec,
    targetAtIso: new Date(targetMs).toISOString(),
    blockNumber,
    blockNumberHex,
    blockTimestampSec,
    thresholdExclusive: threshold,
    totalMindshareWallets: keys.length,
    eligibleCount: eligibleWalletsLower.length,
    eligibleWalletsLower,
    balancesByWallet,
    rpcFailures,
  }
}
