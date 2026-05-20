import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runMindshareEpoch2DailySnapshot } from '../../lib/mindshareEpoch2DailySnapshot'
import { isVercelCronAuthorizedRequest } from '../../lib/vercelCronAuth'

/**
 * Vercel Cron: `0 17 * * *` (17:00 UTC daily) until Epoch 2 ends.
 * Daily snapshot (see `lib/mindshareEpoch2DailySnapshot.ts`):
 * 1. SR eligibility at archive block for 17:00 UTC (`BASE_ARCHIVE_RPC_URL`)
 * 2. Post counting/scoring via eligibility-day windows (separate from SR)
 * Writes `epoch2_sr_eligible_wallets.json`, `epoch2_leaderboard_snapshot.json`, and daily state.
 *
 * Auth: same as waitlist / epoch2-refresh (`CRON_SECRET` Bearer, `WAITLIST_CRON_SECRET`, or `x-cron-secret`).
 * Local `npm run dev`: optional same schedule via Vite — see `attachMindshareEpoch2SrSnapshotDevCron` in `vite.config.ts` (enable: `MINDSHARE_EPOCH2_SR_SNAPSHOT_DEV_CRON=1`).
 * Local: `MINDSHARE_EPOCH2_CRON_SKIP_AUTH=1` (never on Vercel).
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
    res.end(JSON.stringify({ error: 'Unauthorized epoch2 SR snapshot request' }))
    return
  }

  try {
    const result = await runMindshareEpoch2DailySnapshot({
      bearerToken: process.env.TWITTER_BEARER_TOKEN,
      csvPath: process.env.MINDSHARE_SUBMISSIONS_CSV_PATH,
    })
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(result))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Epoch2 SR snapshot failed'
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: false, error: message }))
  }
}
