import type { VercelRequest } from '@vercel/node'

export type VercelCronAuthOptions = {
  /**
   * When this env var is `1` and the app is not on Vercel (`VERCEL` unset), auth passes.
   * Used for local cron / curl without secrets.
   */
  skipAuthEnvName?: string
}

/**
 * Same rules as legacy waitlist snapshot cron:
 * - Optional local bypass: `skipAuthEnvName` (default `WAITLIST_SNAPSHOT_SKIP_AUTH`) === `1` and not `VERCEL`.
 * - If neither `WAITLIST_CRON_SECRET` nor `CRON_SECRET` is set, allow (open endpoint — dev only).
 * - Else require `x-cron-secret: WAITLIST_CRON_SECRET` or `Authorization: Bearer` matching either secret.
 */
export function isVercelCronAuthorizedRequest(
  req: VercelRequest,
  options?: VercelCronAuthOptions,
): boolean {
  const skipName = options?.skipAuthEnvName ?? 'WAITLIST_SNAPSHOT_SKIP_AUTH'
  if (process.env[skipName] === '1' && !process.env.VERCEL) {
    return true
  }

  const waitlistSecret = process.env.WAITLIST_CRON_SECRET?.trim()
  const vercelCronSecret = process.env.CRON_SECRET?.trim()
  if (!waitlistSecret && !vercelCronSecret) return true

  const headers = req.headers ?? {}
  const x = typeof headers['x-cron-secret'] === 'string' ? headers['x-cron-secret'] : ''
  if (waitlistSecret && x === waitlistSecret) return true

  const auth = typeof headers.authorization === 'string' ? headers.authorization : ''
  const m = /^Bearer\s+(.+)$/i.exec(auth)
  const bearer = m?.[1]?.trim() ?? ''
  if (waitlistSecret && bearer === waitlistSecret) return true
  if (vercelCronSecret && bearer === vercelCronSecret) return true

  return false
}
