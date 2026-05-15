import { loadEpoch2EligibleWalletKeysBySrHold } from './mindshareEpoch2WaitlistEligibility'
import {
  fetchErc20Balance,
  rawBalanceToTokenUnits,
  SR_TOKEN_DECIMALS,
} from './waitlistCalculator'
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

/**
 * Wallets from the mindshare CSV that meet the SR minimum.
 *
 * When `rpcUrl` is set: reads **on-chain** $SR on Base for each mindshare wallet (same token as waitlist).
 * Otherwise: only wallets that appear in waitlist `state.json` with `latestSrBalance` ≥ min (legacy behavior).
 */
export async function loadEpoch2MindshareEligibleBySrHold(params: {
  minSrTokens: number
  waitlistStatePath?: string
  rpcUrl: string | undefined
  mindshareWalletKeysLower: string[]
  rpcConcurrency?: number
}): Promise<{ eligible: Set<string>; chainChecks: number; chainFailures: number }> {
  const min = Math.max(0, params.minSrTokens)
  const keys = [...new Set(params.mindshareWalletKeysLower.map((k) => k.trim().toLowerCase()).filter(Boolean))]

  const rpc = params.rpcUrl?.trim()
  if (rpc) {
    const eligible = new Set<string>()
    let chainFailures = 0
    const conc = Math.max(
      1,
      Math.min(32, Number(params.rpcConcurrency ?? process.env.MINDSHARE_EPOCH2_SR_GATE_RPC_CONCURRENCY || '8') || 8),
    )
    await runPool(keys, conc, async (w) => {
      const addr = w.startsWith('0x') ? w : `0x${w}`
      try {
        const raw = await fetchErc20Balance({
          rpcUrl: rpc,
          tokenAddress: WAITLIST_SR_TOKEN,
          walletAddress: addr,
        })
        const units = rawBalanceToTokenUnits(raw, SR_TOKEN_DECIMALS)
        if (units >= min) eligible.add(w)
      } catch {
        chainFailures += 1
      }
    })
    return { eligible, chainChecks: keys.length, chainFailures }
  }

  const waitlistEligible = await loadEpoch2EligibleWalletKeysBySrHold({
    minSrTokens: min,
    waitlistStatePath: params.waitlistStatePath,
  })
  const eligible = new Set<string>()
  for (const w of keys) {
    if (waitlistEligible.has(w)) eligible.add(w)
  }
  return { eligible, chainChecks: 0, chainFailures: 0 }
}
