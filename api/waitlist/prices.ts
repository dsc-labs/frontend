import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchResolvedSrVvvUsd } from '../../lib/waitlistPricing'
import { readWaitlistState } from '../../lib/waitlistStore'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').end('Method Not Allowed')
    return
  }

  try {
    const { state } = await readWaitlistState(process.env.WAITLIST_STATE_PATH)
    const { resolvedSr, resolvedVvv } = await fetchResolvedSrVvvUsd(state)
    sendJson(res, 200, {
      ok: true,
      srUsd: resolvedSr.usd,
      vvvUsd: resolvedVvv.usd,
      srSource: resolvedSr.source,
      vvvSource: resolvedVvv.source,
      cachedUpdatedAt: state.lastUsdPrices?.updatedAt ?? null,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to resolve prices'
    sendJson(res, 500, { error: message })
  }
}

function sendJson(res: VercelResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}
