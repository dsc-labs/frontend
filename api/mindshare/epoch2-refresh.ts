import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildMindshareEpoch2LeaderboardPayload } from '../../lib/mindshareEpoch2LeaderboardBuild'
import { isVercelCronAuthorizedRequest } from '../../lib/vercelCronAuth'

/**
 * Cron / operator-only: refetches X metrics (force refresh) and rewrites the Epoch 2 metrics cache.
 * Vercel Cron: `vercel.json` calls `/api/mindshare/epoch2-refresh` every 15 minutes; set `CRON_SECRET` in the dashboard.
 * Daily SR eligibility snapshots (GMT+7 midnight): `/api/mindshare/epoch2-sr-snapshot` — see `vercel.json` and `lib/mindshareEpoch2SrSnapshot.ts`.
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
    const payload = await buildMindshareEpoch2LeaderboardPayload({
      bearerToken: process.env.TWITTER_BEARER_TOKEN,
      csvPath: process.env.MINDSHARE_SUBMISSIONS_CSV_PATH,
      forceRefresh: true,
    })
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(
      JSON.stringify({
        ok: true,
        generatedAt: payload.generatedAt,
        participants: payload.stats.totalParticipants,
        posts: payload.stats.totalMindsharePosts,
        totalScore: payload.stats.totalScore,
      }),
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Epoch 2 refresh failed'
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: false, error: message }))
  }
}
