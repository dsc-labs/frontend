import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runMindshareEpoch2DailySnapshot } from '../../lib/mindshareEpoch2DailySnapshot'
import { isVercelCronAuthorizedRequest } from '../../lib/vercelCronAuth'

/**
 * Operator-only alias for the daily midnight job (`runMindshareEpoch2DailySnapshot`).
 * Production schedule: `vercel.json` → `/api/mindshare/epoch2-sr-snapshot` at `0 17 * * *` (17:00 UTC).
 * Same auth as waitlist snapshot: `CRON_SECRET` Bearer, `WAITLIST_CRON_SECRET`, or `x-cron-secret`.
 * Local bypass (never on Vercel): `MINDSHARE_EPOCH2_CRON_SKIP_AUTH=1`.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Allow', 'GET, POST')
    res.end('Method Not Allowed')
    return
  }

  if (
    !isVercelCronAuthorizedRequest(req, {
      skipAuthEnvName: 'MINDSHARE_EPOCH2_CRON_SKIP_AUTH',
    })
  ) {
    res.statusCode = 401
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'Unauthorized epoch2 refresh request' }))
    return
  }

  try {
    const result = await runMindshareEpoch2DailySnapshot({
      bearerToken: process.env.TWITTER_BEARER_TOKEN,
      csvPath: process.env.MINDSHARE_SUBMISSIONS_CSV_PATH,
    })
    res.statusCode = result.ok ? 200 : 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(result))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Epoch 2 refresh failed'
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: false, error: message }))
  }
}
