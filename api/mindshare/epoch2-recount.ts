import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runMindshareEpoch2LeaderboardRecount } from '../../lib/mindshareEpoch2LeaderboardRecount'
import { isVercelCronAuthorizedRequest } from '../../lib/vercelCronAuth'

/**
 * Operator-only: re-score all posts in `epoch2_daily_state.json` `countedPostKeys`.
 * Fixes wrong `postCount` / scores when X cache was incomplete. Does **not** run SR snapshot
 * or add new posts from the current eligibility window (use `epoch2-sr-snapshot` / `epoch2-refresh` for that).
 *
 * Auth: same as `epoch2-refresh` (`CRON_SECRET` Bearer, `WAITLIST_CRON_SECRET`, or `x-cron-secret`).
 * Local: `MINDSHARE_EPOCH2_CRON_SKIP_AUTH=1`.
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
    res.end(JSON.stringify({ error: 'Unauthorized epoch2 recount request' }))
    return
  }

  try {
    const result = await runMindshareEpoch2LeaderboardRecount({
      bearerToken: process.env.TWITTER_BEARER_TOKEN,
      csvPath: process.env.MINDSHARE_SUBMISSIONS_CSV_PATH,
    })
    res.statusCode = result.ok ? 200 : 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(result))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Epoch 2 recount failed'
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: false, error: message }))
  }
}
