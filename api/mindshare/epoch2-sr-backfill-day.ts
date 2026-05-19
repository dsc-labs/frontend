import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runMindshareEpoch2SrHistoricalBackfill } from '../../lib/mindshareEpoch2SrHistoricalBackfill'
import { isVercelCronAuthorizedRequest } from '../../lib/vercelCronAuth'

function queryFirst(q: string | string[] | undefined): string | undefined {
  if (q === undefined) return undefined
  return Array.isArray(q) ? q[0] : q
}

function parseDay(req: VercelRequest): string | undefined {
  const fromQuery = queryFirst(req.query?.day as string | string[] | undefined)?.trim()
  if (fromQuery) return fromQuery
  const body = req.body as { day?: string; eligibilityDayKey?: string } | undefined
  if (body && typeof body === 'object') {
    const d = (body.day ?? body.eligibilityDayKey)?.trim()
    if (d) return d
  }
  return undefined
}

function parseReplace(req: VercelRequest): boolean {
  const q = queryFirst(req.query?.replace as string | string[] | undefined)
  if (q === '1' || q === 'true') return true
  const body = req.body as { replace?: boolean | string } | undefined
  if (body?.replace === true || body?.replace === '1' || body?.replace === 'true') return true
  return false
}

/**
 * Operator-only: historical on-chain SR snapshot for one GMT+7 eligibility day (archive RPC).
 * Appends to `epoch2_sr_snapshots.jsonl` for checkpoint UI. Does not change live gating file.
 *
 * Query/body: `day=2026-05-16`, optional `replace=1` to overwrite an existing line for that day.
 *
 * Auth: same as other epoch2 cron routes (`CRON_SECRET` Bearer). Local: `MINDSHARE_EPOCH2_CRON_SKIP_AUTH=1`.
 * Env: `BASE_ARCHIVE_RPC_URL` (recommended) or `BASE_RPC_URL`.
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
    res.end(JSON.stringify({ error: 'Unauthorized epoch2 SR backfill request' }))
    return
  }

  const day = parseDay(req)
  if (!day) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(
      JSON.stringify({
        ok: false,
        error: 'Missing day (query ?day=YYYY-MM-DD or JSON body { "day": "2026-05-16" })',
      }),
    )
    return
  }

  try {
    const result = await runMindshareEpoch2SrHistoricalBackfill({
      eligibilityDayKey: day,
      csvPath: process.env.MINDSHARE_SUBMISSIONS_CSV_PATH,
      replace: parseReplace(req),
    })
    res.statusCode = result.ok ? 200 : 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(result))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Epoch2 SR historical backfill failed'
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: false, error: message }))
  }
}
