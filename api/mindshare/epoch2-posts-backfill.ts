import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runMindshareEpoch2PostsBackfill } from '../../lib/mindshareEpoch2PostsBackfill'
import { isVercelCronAuthorizedRequest } from '../../lib/vercelCronAuth'

function queryFlag(req: VercelRequest, name: string): boolean {
  const v = req.query[name]
  const s = Array.isArray(v) ? v[0] : v
  return s === '1' || s === 'true'
}

function queryDays(req: VercelRequest): string[] | undefined {
  const v = req.query.days
  const s = (Array.isArray(v) ? v[0] : v)?.trim()
  if (!s) return undefined
  return s
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean)
}

/**
 * Operator-only: replay post counting for checkpoint days (first → last) using per-day SR jsonl,
 * then score all resulting `countedPostKeys` and write the leaderboard.
 *
 * Query:
 * - `replace=1` — rebuild `countedPostKeys` from scratch (recommended)
 * - `days=2026-05-15,2026-05-16` — subset of checkpoint days (default: 15–19)
 * - `runSr=1` — also run tonight's SR snapshot before replay
 *
 * Prerequisite: `epoch2_sr_snapshots.jsonl` has a line per day (`epoch2-sr-backfill-day`).
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
    res.end(JSON.stringify({ error: 'Unauthorized epoch2 posts backfill request' }))
    return
  }

  try {
    const result = await runMindshareEpoch2PostsBackfill({
      bearerToken: process.env.TWITTER_BEARER_TOKEN,
      csvPath: process.env.MINDSHARE_SUBMISSIONS_CSV_PATH,
      replace: queryFlag(req, 'replace'),
      dayKeys: queryDays(req),
      runSrSnapshot: queryFlag(req, 'runSr'),
    })
    res.statusCode = result.ok ? 200 : 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(result))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Epoch 2 posts backfill failed'
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: false, error: message }))
  }
}
