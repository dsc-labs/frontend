import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runEpoch2FullRebuild } from '../../lib/mindshareEpoch2FullRebuild'
import { isVercelCronAuthorizedRequest } from '../../lib/vercelCronAuth'

function queryFlag(req: VercelRequest, name: string): boolean {
  const v = req.query[name]
  const s = Array.isArray(v) ? v[0] : v
  return s === '1' || s === 'true'
}

/**
 * Operator-only: full rebuild (`data/newmindshare` + repo-root CSV; optional `?dataDir=` override).
 * 1. SR eligibility backfill per checkpoint day (archive RPC)
 * 2. Replay all post windows + score → leaderboard snapshot
 * Optional `latestSr=1` — update `epoch2_sr_eligible_wallets.json` for tonight.
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
    res.end(JSON.stringify({ error: 'Unauthorized epoch2 rebuild request' }))
    return
  }

  const dataDirRaw = req.query.dataDir
  const dataDir = (Array.isArray(dataDirRaw) ? dataDirRaw[0] : dataDirRaw)?.trim() || undefined

  try {
    const result = await runEpoch2FullRebuild({
      bearerToken: process.env.TWITTER_BEARER_TOKEN,
      dataDir,
      replacePosts: !queryFlag(req, 'keepPosts'),
      runLatestSrSnapshot: queryFlag(req, 'latestSr'),
    })
    res.statusCode = result.ok ? 200 : 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(result))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Epoch 2 rebuild failed'
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: false, error: message }))
  }
}
