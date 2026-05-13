import type { VercelRequest, VercelResponse } from '@vercel/node'
import { topUsersByPoints } from '../../lib/waitlistCalculator'
import { readWaitlistState } from '../../lib/waitlistStore'

/**
 * Public aggregate waitlist metrics (no wallet addresses or emails).
 * GET `/api/waitlist/stats`, `/waitlist-stats`, or `/sr-platform/waitlist-stats` (Vite dev + Vercel rewrites).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').end('Method Not Allowed')
    return
  }

  try {
    const { state } = await readWaitlistState(process.env.WAITLIST_STATE_PATH)
    const users = Object.values(state.users)
    const srPlatformUsers = users.filter((u) => u.accruesPoints !== false)
    const testOnlyUsers = users.filter((u) => u.accruesPoints === false)

    let lastSnapshotAt: string | null = null
    for (const s of state.snapshots) {
      if (!lastSnapshotAt || Date.parse(s.at) > Date.parse(lastSnapshotAt)) lastSnapshotAt = s.at
    }

    const ranked = topUsersByPoints(state, users.length)
    const topScore = ranked[0]?.cumulativePoints ?? null
    const totalCumulativePointsSrPlatform = srPlatformUsers.reduce((sum, u) => sum + u.cumulativePoints, 0)

    sendJson(res, 200, {
      ok: true,
      totalWallets: users.length,
      srPlatformSignups: srPlatformUsers.length,
      testSignups: testOnlyUsers.length,
      snapshotRowCount: state.snapshots.length,
      lastSnapshotAt,
      lastUsdPrices: state.lastUsdPrices ?? null,
      totalCumulativePointsSrPlatform,
      topScore,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to read waitlist stats'
    sendJson(res, 500, { error: message })
  }
}

function sendJson(res: VercelResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}
