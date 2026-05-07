import type { PriceSource } from './dexscreenerPrices'
import type { WaitlistSnapshot, WaitlistState, WaitlistUser } from './waitlistStore'

export const SR_TOKEN_DECIMALS = 18
export const VVV_TOKEN_DECIMALS = 18
const MINUTES_PER_MILLISECOND = 1 / 60000

export function rawBalanceToTokenUnits(raw: bigint, decimals: number): number {
  const base = 10n ** BigInt(decimals)
  const whole = raw / base
  const fraction = raw % base
  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 6)
  const value = Number(`${whole.toString()}.${fractionStr}`)
  return Number.isFinite(value) ? value : 0
}

export function balanceOfCall(walletAddress: string): string {
  const normalized = walletAddress.toLowerCase().replace(/^0x/, '')
  return `0x70a08231000000000000000000000000${normalized}`
}

export async function fetchErc20Balance(params: {
  rpcUrl: string
  tokenAddress: string
  walletAddress: string
}): Promise<bigint> {
  const res = await fetch(params.rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{ to: params.tokenAddress, data: balanceOfCall(params.walletAddress) }, 'latest'],
    }),
  })
  const json = (await res.json()) as { result?: string; error?: { message?: string } }
  if (!res.ok || !json.result || json.error) throw new Error(json.error?.message || `rpc failed (${res.status})`)
  return BigInt(json.result)
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000
}

export function applySnapshotToUser(params: {
  user: WaitlistUser
  atIso: string
  srRaw: bigint
  vvvRaw: bigint
  srUsdPrice: number
  vvvUsdPrice: number
  srPriceSource: PriceSource
  vvvPriceSource: PriceSource
}): { user: WaitlistUser; snapshot: WaitlistSnapshot } {
  const nowMs = Date.parse(params.atIso)
  const previousMs = params.user.lastSnapshotAt ? Date.parse(params.user.lastSnapshotAt) : nowMs
  const minutesElapsed = Math.max(0, (nowMs - previousMs) * MINUTES_PER_MILLISECOND)

  const srUnits = rawBalanceToTokenUnits(params.srRaw, SR_TOKEN_DECIMALS)
  const vvvUnits = rawBalanceToTokenUnits(params.vvvRaw, VVV_TOKEN_DECIMALS)
  const srUsdPerHour = srUnits * params.srUsdPrice
  const vvvUsdPerHour = vvvUnits * params.vvvUsdPrice
  const srUsdPerMinute = srUsdPerHour / 60
  const vvvUsdPerMinute = vvvUsdPerHour / 60
  const hasBoth = srUnits > 0 && vvvUnits > 0
  const multiplier = hasBoth ? 1.2 : 1
  const accrue = params.user.accruesPoints !== false
  const pointsAdded = accrue
    ? round4((srUsdPerMinute + vvvUsdPerMinute) * minutesElapsed * multiplier)
    : 0
  const cumulativePoints = accrue
    ? round4(params.user.cumulativePoints + pointsAdded)
    : round4(params.user.cumulativePoints)

  const updatedUser: WaitlistUser = {
    ...params.user,
    updatedAt: params.atIso,
    lastSnapshotAt: params.atIso,
    cumulativePoints,
    latestSrBalance: srUnits.toFixed(4),
    latestVvvBalance: vvvUnits.toFixed(4),
    latestMultiplier: multiplier,
    latestUsdPerMinute: round4(srUsdPerMinute + vvvUsdPerMinute),
  }

  const snapshot: WaitlistSnapshot = {
    id: `${params.atIso}:${params.user.walletAddress.toLowerCase()}`,
    at: params.atIso,
    walletAddress: params.user.walletAddress,
    minutesElapsed: round4(minutesElapsed),
    srBalance: updatedUser.latestSrBalance,
    vvvBalance: updatedUser.latestVvvBalance,
    srUsdPriceUsed: round4(params.srUsdPrice),
    vvvUsdPriceUsed: round4(params.vvvUsdPrice),
    srPriceSource: params.srPriceSource,
    vvvPriceSource: params.vvvPriceSource,
    srUsdPerMinute: round4(srUsdPerMinute),
    vvvUsdPerMinute: round4(vvvUsdPerMinute),
    multiplier,
    pointsAdded,
    cumulativePoints,
  }

  return { user: updatedUser, snapshot }
}

/** Leaderboard / rank: only users whose points count toward the public waitlist (`/sr-platform` signups). */
export function topUsersByPoints(state: WaitlistState, limit = 100): WaitlistUser[] {
  return Object.values(state.users)
    .filter((u) => u.accruesPoints !== false)
    .sort((a, b) => b.cumulativePoints - a.cumulativePoints)
    .slice(0, limit)
}
