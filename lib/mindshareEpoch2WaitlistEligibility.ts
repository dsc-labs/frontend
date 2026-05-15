import { readWaitlistState } from './waitlistStore'

/** `latestSrBalance` on waitlist users is human SR token units (see `applySnapshotToUser`). */
export function parseWaitlistSrBalanceUnits(latestSrBalance: string): number {
  const n = Number(String(latestSrBalance ?? '').replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

/**
 * Wallets that appear in waitlist state with SR balance **at least** `minSrTokens`
 * (same field as waitlist registration: ≥10k $SR; refreshed by `/api/waitlist/snapshot`).
 */
export async function loadEpoch2EligibleWalletKeysBySrHold(params: {
  minSrTokens: number
  waitlistStatePath?: string
}): Promise<Set<string>> {
  const { state } = await readWaitlistState(params.waitlistStatePath)
  const eligible = new Set<string>()
  const min = Math.max(0, params.minSrTokens)
  for (const u of Object.values(state.users)) {
    const sr = parseWaitlistSrBalanceUnits(u.latestSrBalance)
    if (sr >= min) {
      eligible.add(u.walletAddress.trim().toLowerCase())
    }
  }
  return eligible
}
