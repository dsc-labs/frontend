import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runMindshareEpoch2SrEligibilitySnapshot } from '../../lib/mindshareEpoch2SrSnapshot'
import { isVercelCronAuthorizedRequest } from '../../lib/vercelCronAuth'

/**
 * Vercel Cron: `0 17 * * *` (17:00 UTC = **00:00 GMT+7**) until Epoch 2 ends.
 * Writes **`epoch2_sr_eligible_wallets.json`** (live leaderboard SR gate — updated once per run) and appends one line to the jsonl audit log. Eligible = on-chain SR **> 10_000** (hardcoded in `lib/mindshareEpoch2Constants.ts`).
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
    const result = await runMindshareEpoch2SrEligibilitySnapshot()
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
