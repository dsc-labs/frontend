import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildMindshareEpoch2LeaderboardPayload } from '../../lib/mindshareEpoch2LeaderboardBuild'

function queryFirst(q: string | string[] | undefined): string | undefined {
  if (q === undefined) return undefined
  return Array.isArray(q) ? q[0] : q
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Allow', 'GET')
    res.end('Method Not Allowed')
    return
  }

  const refreshRaw = queryFirst(req.query?.refresh as string | string[] | undefined)
  /** Operator-only: bypasses TTL and refetches X. Public `/epoch2` should omit this; use cron `/api/mindshare/epoch2-refresh` instead. */
  const forceRefresh = refreshRaw === '1' || refreshRaw === 'true'

  try {
    const payload = await buildMindshareEpoch2LeaderboardPayload({
      bearerToken: process.env.TWITTER_BEARER_TOKEN,
      csvPath: process.env.MINDSHARE_SUBMISSIONS_CSV_PATH,
      forceRefresh,
    })
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(payload))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Epoch 2 leaderboard build failed'
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: false, error: message }))
  }
}
