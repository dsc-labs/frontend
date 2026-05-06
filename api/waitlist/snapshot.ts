import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applySnapshotToUser, fetchErc20Balance } from '../../lib/waitlistCalculator'
import { fetchResolvedSrVvvUsd, WAITLIST_SR_TOKEN, WAITLIST_VVV_TOKEN } from '../../lib/waitlistPricing'
import { getServerBaseRpcUrl } from '../../lib/serverBaseRpc'
import { readWaitlistState, writeWaitlistState } from '../../lib/waitlistStore'

/**
 * Optional lock for /api/waitlist/snapshot.
 * - Manual / non-Vercel: header `x-cron-secret: <WAITLIST_CRON_SECRET>`
 * - Vercel Cron: sends `Authorization: Bearer <CRON_SECRET>` (see Vercel cron docs)
 *   We accept Bearer if it matches `CRON_SECRET` or the same value as `WAITLIST_CRON_SECRET`.
 * - Local: set `WAITLIST_SNAPSHOT_SKIP_AUTH=1` only when `VERCEL` is not set (never on deployed Vercel).
 */
function authOk(req: VercelRequest): boolean {
  if (process.env.WAITLIST_SNAPSHOT_SKIP_AUTH === '1' && !process.env.VERCEL) {
    return true
  }
  const waitlistSecret = process.env.WAITLIST_CRON_SECRET?.trim()
  const vercelCronSecret = process.env.CRON_SECRET?.trim()
  if (!waitlistSecret && !vercelCronSecret) return true

  const x = typeof req.headers['x-cron-secret'] === 'string' ? req.headers['x-cron-secret'] : ''
  if (waitlistSecret && x === waitlistSecret) return true

  const auth = typeof req.headers.authorization === 'string' ? req.headers.authorization : ''
  const m = /^Bearer\s+(.+)$/i.exec(auth)
  const bearer = m?.[1]?.trim() ?? ''
  if (waitlistSecret && bearer === waitlistSecret) return true
  if (vercelCronSecret && bearer === vercelCronSecret) return true

  return false
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET, POST').end('Method Not Allowed')
    return
  }
  if (!authOk(req)) {
    sendJson(res, 401, { error: 'Unauthorized snapshot request' })
    return
  }

  const rpcUrl = getServerBaseRpcUrl()
  if (!rpcUrl) {
    sendJson(res, 503, {
      error: 'Missing BASE_RPC_URL or VITE_BASE_RPC_URL (Base JSON-RPC for balance reads)',
    })
    return
  }

  const nowIso = new Date().toISOString()
  const { filePath, state } = await readWaitlistState(process.env.WAITLIST_STATE_PATH)
  const wallets = Object.keys(state.users)

  const { resolvedSr, resolvedVvv, dexSr, dexVvv } = await fetchResolvedSrVvvUsd(state)

  const processed: Array<{ walletAddress: string; pointsAdded: number }> = []
  const failures: Array<{ walletAddress: string; error: string }> = []

  for (const walletKey of wallets) {
    const user = state.users[walletKey]
    try {
      const [srRaw, vvvRaw] = await Promise.all([
        fetchErc20Balance({ rpcUrl, tokenAddress: WAITLIST_SR_TOKEN, walletAddress: user.walletAddress }),
        fetchErc20Balance({ rpcUrl, tokenAddress: WAITLIST_VVV_TOKEN, walletAddress: user.walletAddress }),
      ])
      const applied = applySnapshotToUser({
        user,
        atIso: nowIso,
        srRaw,
        vvvRaw,
        srUsdPrice: resolvedSr.usd,
        vvvUsdPrice: resolvedVvv.usd,
        srPriceSource: resolvedSr.source,
        vvvPriceSource: resolvedVvv.source,
      })
      state.users[walletKey] = applied.user
      state.snapshots.push(applied.snapshot)
      processed.push({ walletAddress: user.walletAddress, pointsAdded: applied.snapshot.pointsAdded })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'snapshot failed'
      failures.push({ walletAddress: user.walletAddress, error: message })
    }
  }

  if (state.snapshots.length > 5000) {
    state.snapshots = state.snapshots.slice(-5000)
  }

  state.lastUsdPrices = {
    srUsd: resolvedSr.usd,
    vvvUsd: resolvedVvv.usd,
    updatedAt: nowIso,
  }

  await writeWaitlistState(state, process.env.WAITLIST_STATE_PATH)
  sendJson(res, 200, {
    ok: true,
    filePath,
    at: nowIso,
    prices: {
      sr: { usd: resolvedSr.usd, source: resolvedSr.source, dexRaw: dexSr },
      vvv: { usd: resolvedVvv.usd, source: resolvedVvv.source, dexRaw: dexVvv },
    },
    usersProcessed: processed.length,
    usersFailed: failures.length,
    processed,
    failures,
  })
}

function sendJson(res: VercelResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}
