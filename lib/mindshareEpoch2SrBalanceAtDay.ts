import { findBlockNumberAtOrBefore, blockNumberToHex } from './baseBlockAtTime'
import { EPOCH2_MINDSHARE_SR_SNAPSHOT_THRESHOLD_EXCLUSIVE } from './mindshareEpoch2Constants'
import { gmt7SrEligibilitySnapshotInstantMs } from './mindshareEpoch2Gmt7'
import { fetchErc20Balance, rawBalanceToTokenUnits, SR_TOKEN_DECIMALS } from './waitlistCalculator'
import { WAITLIST_SR_TOKEN } from './waitlistPricing'

export type SrBalanceAtEligibilityDayResult = {
  eligibilityDayKey: string
  targetTimestampSec: number
  blockNumber: number
  blockTimestampSec: number
  srBalance: number
  eligibleExclusive: boolean
  thresholdExclusive: number
}

/** On-chain $SR balance at the Epoch 2 SR snapshot instant for one eligibility day. */
export async function fetchSrBalanceAtEligibilityDay(options: {
  walletLower: string
  eligibilityDayKey: string
  rpcUrl: string
}): Promise<SrBalanceAtEligibilityDayResult> {
  const walletLower = options.walletLower.trim().toLowerCase()
  const targetMs = gmt7SrEligibilitySnapshotInstantMs(options.eligibilityDayKey)
  const targetTimestampSec = Math.floor(targetMs / 1000)
  const { blockNumber, blockTimestampSec } = await findBlockNumberAtOrBefore(
    options.rpcUrl,
    targetTimestampSec,
  )
  const raw = await fetchErc20Balance({
    rpcUrl: options.rpcUrl,
    tokenAddress: WAITLIST_SR_TOKEN,
    walletAddress: walletLower,
    blockTag: blockNumberToHex(blockNumber),
  })
  const srBalance = rawBalanceToTokenUnits(raw, SR_TOKEN_DECIMALS)
  const thresholdExclusive = EPOCH2_MINDSHARE_SR_SNAPSHOT_THRESHOLD_EXCLUSIVE
  return {
    eligibilityDayKey: options.eligibilityDayKey,
    targetTimestampSec,
    blockNumber,
    blockTimestampSec,
    srBalance: Math.round(srBalance * 10) / 10,
    eligibleExclusive: srBalance > thresholdExclusive,
    thresholdExclusive,
  }
}
