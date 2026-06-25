import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getWaitlistUser, readWaitlistState } from '../../lib/waitlistStore'
import { topUsersByPoints } from '../../lib/waitlistCalculator'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').end('Method Not Allowed')
    return
  }

  const walletAddress = typeof req.query.walletAddress === 'string' ? req.query.walletAddress.trim() : ''
  const limit = Number(typeof req.query.limit === 'string' ? req.query.limit : '20')

  if (!walletAddress) {
    sendJson(res, 400, { error: 'walletAddress query param is required' })
    return
  }

  const user = await getWaitlistUser(walletAddress, process.env.WAITLIST_STATE_PATH)
  if (!user) {
    // Not an error — wallet simply hasn't joined yet. 200 avoids red entries in DevTools.
    sendJson(res, 200, { ok: true, registered: false, user: null, rank: null, leaderboard: [] })
    return
  }

  const { state } = await readWaitlistState(process.env.WAITLIST_STATE_PATH)
  const cap = Number.isFinite(limit) ? Math.max(1, Math.min(200, limit)) : 20
  const fullCount = Object.keys(state.users).length || 1
  const sorted = topUsersByPoints(state, fullCount)
  const rank = sorted.findIndex((u) => u.walletAddress.toLowerCase() === walletAddress.toLowerCase()) + 1
  const leaderboard = sorted.slice(0, cap)

  sendJson(res, 200, {
    ok: true,
    user,
    rank: rank > 0 ? rank : null,
    leaderboard,
  })
}

function sendJson(res: VercelResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}
