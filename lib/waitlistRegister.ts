import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  applySnapshotToUser,
  fetchErc20Balance,
  rawBalanceToTokenUnits,
  SR_TOKEN_DECIMALS,
  VVV_TOKEN_DECIMALS,
  topUsersByPoints,
} from './waitlistCalculator'
import { fetchResolvedSrVvvUsd, WAITLIST_SR_TOKEN, WAITLIST_VVV_TOKEN } from './waitlistPricing'
import { getServerBaseRpcUrl } from './serverBaseRpc'
import { isLikelyEthAddress, readWaitlistState, writeWaitlistState, type WaitlistUser } from './waitlistStore'

const MIN_SR_UNITS = 10000
const MIN_VVV_UNITS = 5

export type WaitlistRegisterOptions = {
  /** Balance gate: 10k $SR, or also 5+ $VVV when true. */
  allowVvvMinimumEligible: boolean
  /** `/test` (register-test) uses false; `/sr-platform` uses true so snapshots add points. */
  accrueWaitlistPoints: boolean
}

type RegisterBody = {
  walletAddress?: string
  email?: string
}

function walletKey(walletAddress: string): string {
  return walletAddress.trim().toLowerCase()
}

function rankForWallet(state: Parameters<typeof topUsersByPoints>[0], walletAddress: string): number | null {
  const n = Object.keys(state.users).length || 1
  const sorted = topUsersByPoints(state, n)
  const rank = sorted.findIndex((u) => u.walletAddress.toLowerCase() === walletAddress.toLowerCase()) + 1
  return rank > 0 ? rank : null
}

function sendJson(res: VercelResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

export async function handleWaitlistRegister(
  req: VercelRequest,
  res: VercelResponse,
  options: WaitlistRegisterOptions,
): Promise<void> {
  try {
    if (req.method !== 'POST') {
      res.status(405).setHeader('Allow', 'POST').end('Method Not Allowed')
      return
    }

    let body: RegisterBody = {}
    try {
      body = typeof req.body === 'string' ? (JSON.parse(req.body || '{}') as RegisterBody) : ((req.body ?? {}) as RegisterBody)
    } catch {
      sendJson(res, 400, { error: 'Invalid JSON body' })
      return
    }

    const walletAddress = (body.walletAddress ?? '').trim()
    const email = (body.email ?? '').trim().toLowerCase()
    if (!walletAddress || !email) {
      sendJson(res, 400, { error: 'Missing walletAddress or email' })
      return
    }
    if (!isLikelyEthAddress(walletAddress)) {
      sendJson(res, 400, { error: 'Invalid walletAddress' })
      return
    }
    if (!email.includes('@')) {
      sendJson(res, 400, { error: 'Invalid email' })
      return
    }

    const rpcUrl = getServerBaseRpcUrl()
    if (!rpcUrl) {
      sendJson(res, 503, {
        error: 'Missing BASE_RPC_URL or VITE_BASE_RPC_URL (Base JSON-RPC for balance reads)',
      })
      return
    }

    let filePath: string
    let state: Awaited<ReturnType<typeof readWaitlistState>>['state']
    try {
      const loaded = await readWaitlistState(process.env.WAITLIST_STATE_PATH)
      filePath = loaded.filePath
      state = loaded.state
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to read waitlist state'
      sendJson(res, 500, { error: message, stage: 'read_waitlist_state' })
      return
    }

    const key = walletKey(walletAddress)
    const existing = state.users[key]
    const nowIso = new Date().toISOString()

    if (existing?.lastSnapshotAt) {
      const user: WaitlistUser = { ...existing, email, updatedAt: nowIso }
      state.users[key] = user
      try {
        await writeWaitlistState(state, process.env.WAITLIST_STATE_PATH)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to write waitlist state'
        sendJson(res, 500, { error: message, stage: 'write_waitlist_state_existing' })
        return
      }
      sendJson(res, 200, {
        ok: true,
        user,
        rank: rankForWallet(state, walletAddress),
        initialSnapshot: false,
        filePath,
      })
      return
    }

    let resolvedSr: Awaited<ReturnType<typeof fetchResolvedSrVvvUsd>>['resolvedSr']
    let resolvedVvv: Awaited<ReturnType<typeof fetchResolvedSrVvvUsd>>['resolvedVvv']
    try {
      const prices = await fetchResolvedSrVvvUsd(state)
      resolvedSr = prices.resolvedSr
      resolvedVvv = prices.resolvedVvv
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resolve token prices'
      sendJson(res, 502, { error: message, stage: 'fetch_prices' })
      return
    }

    let srRaw: bigint
    let vvvRaw: bigint
    try {
      ;[srRaw, vvvRaw] = await Promise.all([
        fetchErc20Balance({ rpcUrl, tokenAddress: WAITLIST_SR_TOKEN, walletAddress }),
        fetchErc20Balance({ rpcUrl, tokenAddress: WAITLIST_VVV_TOKEN, walletAddress }),
      ])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to read token balances'
      sendJson(res, 502, { error: message, stage: 'fetch_balances' })
      return
    }

    const srUnits = rawBalanceToTokenUnits(srRaw, SR_TOKEN_DECIMALS)
    const vvvUnits = rawBalanceToTokenUnits(vvvRaw, VVV_TOKEN_DECIMALS)
    if (options.allowVvvMinimumEligible) {
      if (srUnits < MIN_SR_UNITS && vvvUnits < MIN_VVV_UNITS) {
        sendJson(res, 400, { error: 'Need at least 10,000 $SR or 5 $VVV on Base to register' })
        return
      }
    } else if (srUnits < MIN_SR_UNITS) {
      sendJson(res, 400, { error: 'Need at least 10,000 $SR on Base to register' })
      return
    }

    const accruesPoints = options.accrueWaitlistPoints
    const baseUser: WaitlistUser = existing
      ? { ...existing, email, updatedAt: nowIso, accruesPoints }
      : {
          walletAddress,
          email,
          createdAt: nowIso,
          updatedAt: nowIso,
          cumulativePoints: 0,
          lastSnapshotAt: null,
          latestSrBalance: '0',
          latestVvvBalance: '0',
          latestMultiplier: 1,
          latestUsdPerMinute: 0,
          accruesPoints,
        }

    const applied = applySnapshotToUser({
      user: baseUser,
      atIso: nowIso,
      srRaw,
      vvvRaw,
      srUsdPrice: resolvedSr.usd,
      vvvUsdPrice: resolvedVvv.usd,
      srPriceSource: resolvedSr.source,
      vvvPriceSource: resolvedVvv.source,
    })

    state.users[key] = applied.user
    state.snapshots.push(applied.snapshot)
    if (state.snapshots.length > 5000) {
      state.snapshots = state.snapshots.slice(-5000)
    }
    state.lastUsdPrices = {
      srUsd: resolvedSr.usd,
      vvvUsd: resolvedVvv.usd,
      updatedAt: nowIso,
    }

    try {
      await writeWaitlistState(state, process.env.WAITLIST_STATE_PATH)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to write waitlist state'
      sendJson(res, 500, { error: message, stage: 'write_waitlist_state_new' })
      return
    }

    sendJson(res, 200, {
      ok: true,
      user: applied.user,
      rank: rankForWallet(state, walletAddress),
      initialSnapshot: true,
      filePath,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected register failure'
    sendJson(res, 500, { error: message, stage: 'unhandled_register_error' })
  }
}
