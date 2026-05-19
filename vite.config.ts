import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, PreviewServer, ViteDevServer } from 'vite'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { Buffer } from 'node:buffer'
import { resolveAvatar } from './lib/avatarRequest'
import { appendMindshareSubmissionCsv } from './lib/mindshareCsvStore'
import { applyMindshareEpoch2Env } from './lib/mindshareEpoch2Env'
import { getMindshareEpoch2LeaderboardForDisplay } from './lib/mindshareEpoch2LeaderboardBuild'
import { runMindshareEpoch2DailySnapshot } from './lib/mindshareEpoch2DailySnapshot'
import { exchangeTwitterOAuth2Code } from './lib/xTwitterOAuthExchange'

function readHttpBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function patchVercelResponse(res: ServerResponse): VercelResponse {
  const r = res as ServerResponse & { status?: (code: number) => ServerResponse }
  if (typeof r.status !== 'function') {
    r.status = function status(code: number) {
      r.statusCode = code
      return r
    }
  }
  return r as VercelResponse
}

async function incomingToVercelRequest(req: IncomingMessage, host: string): Promise<VercelRequest> {
  const url = new URL(req.url ?? '/', `http://${host}`)
  const method = (req.method ?? 'GET').toUpperCase()
  let body: unknown = {}
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    const raw = await readHttpBody(req)
    try {
      body = raw ? JSON.parse(raw) : {}
    } catch {
      body = {}
    }
  }
  const query: Record<string, string | string[]> = {}
  url.searchParams.forEach((value, key) => {
    const prev = query[key]
    if (prev === undefined) query[key] = value
    else if (Array.isArray(prev)) prev.push(value)
    else query[key] = [prev, value]
  })
  /** `IncomingMessage` headers are non-enumerable — `{...req}` drops them; Vercel handlers expect `headers`. */
  return {
    ...req,
    headers: req.headers ?? {},
    method,
    body,
    query,
    url: req.url ?? '/',
  } as unknown as VercelRequest
}

// https://vitejs.dev/config/
function parsePositiveInt(raw: string | undefined, fallback: number) {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

/** `.env` is not on `process.env` for Vite middleware; copy waitlist-related keys for local API routes. */
function applyWaitlistEnvToProcess(fromLoadedEnv: Record<string, string>) {
  const keys = [
    'BASE_RPC_URL',
    'VITE_BASE_RPC_URL',
    'WAITLIST_STATE_PATH',
    'WAITLIST_CRON_SECRET',
    'CRON_SECRET',
    'SR_USD_PRICE',
    'VVV_USD_PRICE',
    'WAITLIST_CSV_MIRROR_DIR',
    'WAITLIST_SNAPSHOT_SKIP_AUTH',
  ] as const
  for (const k of keys) {
    const v = fromLoadedEnv[k]?.trim()
    if (v && !process.env[k]?.trim()) process.env[k] = v
  }
}

const DEFAULT_WAITLIST_DEV_CRON_MS = 15 * 60 * 1000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isConnRefused(err: unknown): boolean {
  let cur: unknown = err
  for (let i = 0; i < 6 && cur; i++) {
    if (
      typeof cur === 'object' &&
      cur !== null &&
      'code' in cur &&
      (cur as { code: string }).code === 'ECONNREFUSED'
    ) {
      return true
    }
    if (typeof cur === 'object' && cur !== null && 'cause' in cur) {
      cur = (cur as { cause: unknown }).cause
      continue
    }
    break
  }
  return false
}

/** `npm run dev` / `vite preview` only. On by default (15 min). Opt out: WAITLIST_DEV_CRON=0 */
function getWaitlistDevCronIntervalMs(loadedEnv: Record<string, string>): number {
  if (
    loadedEnv.WAITLIST_DEV_CRON === '0' ||
    loadedEnv.WAITLIST_DEV_CRON_DISABLED === '1'
  ) {
    return 0
  }
  const explicit = Number(loadedEnv.WAITLIST_DEV_CRON_MS?.trim())
  if (Number.isFinite(explicit) && explicit > 0) return Math.floor(explicit)
  return DEFAULT_WAITLIST_DEV_CRON_MS
}

function attachWaitlistDevCron(server: ViteDevServer | PreviewServer, loadedEnv: Record<string, string>) {
  const intervalMs = getWaitlistDevCronIntervalMs(loadedEnv)
  if (intervalMs <= 0) return

  const bind = () => {
    const httpServer = server.httpServer
    if (!httpServer) return

    const snapshotHeaders = (): Headers => {
      applyWaitlistEnvToProcess(loadedEnv)
      const headers = new Headers()
      const skip = process.env.WAITLIST_SNAPSHOT_SKIP_AUTH === '1' && !process.env.VERCEL
      if (!skip) {
        const s = process.env.WAITLIST_CRON_SECRET?.trim()
        const c = process.env.CRON_SECRET?.trim()
        if (s) headers.set('x-cron-secret', s)
        else if (c) headers.set('Authorization', `Bearer ${c}`)
      }
      return headers
    }

    const runSnapshot = async () => {
      if (!httpServer.listening) return
      const addr = httpServer.address()
      if (typeof addr === 'string') return
      const port =
        typeof addr === 'object' && addr && 'port' in addr
          ? addr.port
          : server.config.server.port ?? 3000

      const paths = [
        `http://127.0.0.1:${port}/api/waitlist/snapshot`,
        `http://[::1]:${port}/api/waitlist/snapshot`,
        `http://localhost:${port}/api/waitlist/snapshot`,
      ]

      const headers = snapshotHeaders()
      const maxRounds = 8
      let lastErr: unknown
      for (let round = 0; round < maxRounds; round++) {
        for (const url of paths) {
          try {
            const res = await fetch(url, { headers })
            const text = await res.text()
            if (!res.ok) {
              console.warn('[waitlist dev cron]', res.status, text.slice(0, 300))
            }
            return
          } catch (e) {
            lastErr = e
          }
        }
        if (lastErr !== undefined && !isConnRefused(lastErr)) {
          console.warn('[waitlist dev cron] request failed:', lastErr)
          return
        }
        if (round < maxRounds - 1) await sleep(400)
      }
      console.warn('[waitlist dev cron] request failed:', lastErr)
    }

    const id = setInterval(() => void runSnapshot(), intervalMs)
    const warmup = setTimeout(() => void runSnapshot(), 800)
    const onClose = () => {
      clearInterval(id)
      clearTimeout(warmup)
    }
    httpServer.once('close', onClose)

    console.info(
      `[waitlist] dev cron: every ${intervalMs / 1000}s → GET /api/waitlist/snapshot (disable: WAITLIST_DEV_CRON=0)`,
    )
  }

  if (server.httpServer?.listening) bind()
  else server.httpServer?.once('listening', bind)
}

/** Next 17:00 UTC (= 00:00 GMT+7) from now, in milliseconds. */
function msUntilNextUtc17(): number {
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 17, 0, 0, 0))
  if (now.getTime() >= next.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1)
  }
  return next.getTime() - now.getTime()
}

function mindshareEpoch2SrSnapshotDevCronEnabled(loadedEnv: Record<string, string>): boolean {
  if (loadedEnv.MINDSHARE_EPOCH2_SR_SNAPSHOT_DEV_CRON_DISABLED === '1') return false
  return loadedEnv.MINDSHARE_EPOCH2_SR_SNAPSHOT_DEV_CRON === '1'
}

/**
 * `npm run dev` / `vite preview`: optional schedule GET /api/mindshare/epoch2-sr-snapshot at each 17:00 UTC (midnight GMT+7).
 * Off by default; enable: MINDSHARE_EPOCH2_SR_SNAPSHOT_DEV_CRON=1. Production: Vercel Cron `0 17 * * *`.
 */
function attachMindshareEpoch2SrSnapshotDevCron(server: ViteDevServer | PreviewServer, loadedEnv: Record<string, string>) {
  if (!mindshareEpoch2SrSnapshotDevCronEnabled(loadedEnv)) return

  const bind = () => {
    const httpServer = server.httpServer
    if (!httpServer) return

    const runSnapshot = async () => {
      if (!httpServer.listening) return
      const addr = httpServer.address()
      if (typeof addr === 'string') return
      const port =
        typeof addr === 'object' && addr && 'port' in addr
          ? addr.port
          : server.config.server.port ?? 3000

      const paths = [
        `http://127.0.0.1:${port}/api/mindshare/epoch2-sr-snapshot`,
        `http://[::1]:${port}/api/mindshare/epoch2-sr-snapshot`,
        `http://localhost:${port}/api/mindshare/epoch2-sr-snapshot`,
      ]

      const headers = snapshotHeaders()
      const maxRounds = 8
      let lastErr: unknown
      for (let round = 0; round < maxRounds; round++) {
        for (const url of paths) {
          try {
            const res = await fetch(url, { method: 'GET', headers })
            const text = await res.text()
            if (!res.ok) {
              console.warn('[epoch2 SR snapshot dev cron]', res.status, text.slice(0, 300))
            }
            return
          } catch (e) {
            lastErr = e
          }
        }
        if (lastErr !== undefined && !isConnRefused(lastErr)) {
          console.warn('[epoch2 SR snapshot dev cron] request failed:', lastErr)
          return
        }
        if (round < maxRounds - 1) await sleep(400)
      }
      console.warn('[epoch2 SR snapshot dev cron] request failed:', lastErr)
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const scheduleNext = () => {
      const delay = msUntilNextUtc17()
      timeoutId = setTimeout(() => {
        void runSnapshot().finally(() => {
          scheduleNext()
        })
      }, delay)
    }

    scheduleNext()

    const onClose = () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
    httpServer.once('close', onClose)

    const nextAt = new Date(Date.now() + msUntilNextUtc17())
    console.info(
      `[mindshare epoch2] SR eligibility dev cron: next snapshot ~${nextAt.toISOString()} (17:00 UTC = 00:00 GMT+7). Opt out: unset MINDSHARE_EPOCH2_SR_SNAPSHOT_DEV_CRON or set MINDSHARE_EPOCH2_SR_SNAPSHOT_DEV_CRON_DISABLED=1`,
    )
  }

  if (server.httpServer?.listening) bind()
  else server.httpServer?.once('listening', bind)
}

function mindshareEpoch2CronHeaders(loadedEnv: Record<string, string>): Headers {
  applyMindshareEpoch2Env(loadedEnv)
  applyWaitlistEnvToProcess(loadedEnv)
  const headers = new Headers()
  const skip = process.env.MINDSHARE_EPOCH2_CRON_SKIP_AUTH === '1' && !process.env.VERCEL
  if (!skip) {
    const s = process.env.WAITLIST_CRON_SECRET?.trim()
    const c = process.env.CRON_SECRET?.trim()
    if (s) headers.set('x-cron-secret', s)
    else if (c) headers.set('Authorization', `Bearer ${c}`)
  }
  return headers
}

/** `npm run dev` / `vite preview`: off by default (daily job only). Enable: MINDSHARE_EPOCH2_REFRESH_DEV_CRON=1 */
function getMindshareEpoch2RefreshDevCronIntervalMs(loadedEnv: Record<string, string>): number {
  if (
    loadedEnv.MINDSHARE_EPOCH2_REFRESH_DEV_CRON !== '1' ||
    loadedEnv.MINDSHARE_EPOCH2_REFRESH_DEV_CRON_DISABLED === '1'
  ) {
    return 0
  }
  const explicit = Number(loadedEnv.MINDSHARE_EPOCH2_REFRESH_DEV_CRON_MS?.trim())
  if (Number.isFinite(explicit) && explicit > 0) return explicit
  return DEFAULT_WAITLIST_DEV_CRON_MS
}

function attachMindshareEpoch2RefreshDevCron(server: ViteDevServer | PreviewServer, loadedEnv: Record<string, string>) {
  const intervalMs = getMindshareEpoch2RefreshDevCronIntervalMs(loadedEnv)
  if (intervalMs <= 0) return

  const bind = () => {
    const httpServer = server.httpServer
    if (!httpServer) return

    const runRefresh = async () => {
      if (!httpServer.listening) return
      const addr = httpServer.address()
      if (typeof addr === 'string') return
      const port =
        typeof addr === 'object' && addr && 'port' in addr
          ? addr.port
          : server.config.server.port ?? 3000

      const paths = [
        `http://127.0.0.1:${port}/api/mindshare/epoch2-refresh`,
        `http://[::1]:${port}/api/mindshare/epoch2-refresh`,
        `http://localhost:${port}/api/mindshare/epoch2-refresh`,
      ]

      const headers = mindshareEpoch2CronHeaders(loadedEnv)
      const maxRounds = 8
      let lastErr: unknown
      for (let round = 0; round < maxRounds; round++) {
        for (const url of paths) {
          try {
            const res = await fetch(url, { method: 'GET', headers })
            const text = await res.text()
            if (!res.ok) {
              console.warn('[epoch2 refresh dev cron]', res.status, text.slice(0, 300))
            }
            return
          } catch (e) {
            lastErr = e
          }
        }
        if (lastErr !== undefined && !isConnRefused(lastErr)) {
          console.warn('[epoch2 refresh dev cron] request failed:', lastErr)
          return
        }
        if (round < maxRounds - 1) await sleep(400)
      }
      console.warn('[epoch2 refresh dev cron] request failed:', lastErr)
    }

    const id = setInterval(() => void runRefresh(), intervalMs)
    const warmup = setTimeout(() => void runRefresh(), 1200)
    const onClose = () => {
      clearInterval(id)
      clearTimeout(warmup)
    }
    httpServer.once('close', onClose)

    console.info(
      `[mindshare epoch2] dev cron: every ${intervalMs / 1000}s → GET /api/mindshare/epoch2-refresh (daily snapshot; disable: unset MINDSHARE_EPOCH2_REFRESH_DEV_CRON)`,
    )
  }

  if (server.httpServer?.listening) bind()
  else server.httpServer?.once('listening', bind)
}

async function serveEpoch2SrBackfillDayIfMatched(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  env: Record<string, string>,
): Promise<boolean> {
  if (!pathname.startsWith('/api/mindshare/epoch2-sr-backfill-day')) return false
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Allow', 'GET, POST')
    res.end('Method Not Allowed')
    return true
  }
  try {
    applyMindshareEpoch2Env(env)
    const handler = (await import('./api/mindshare/epoch2-sr-backfill-day')).default
    const host = req.headers.host ?? 'localhost'
    const vercelReq = await incomingToVercelRequest(req, host)
    const vercelRes = patchVercelResponse(res)
    await handler(vercelReq, vercelRes)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Epoch 2 SR backfill failed'
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: false, error: message }))
  }
  return true
}

async function serveEpoch2RecountIfMatched(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  env: Record<string, string>,
): Promise<boolean> {
  if (!pathname.startsWith('/api/mindshare/epoch2-recount')) return false
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Allow', 'GET, POST')
    res.end('Method Not Allowed')
    return true
  }
  try {
    applyMindshareEpoch2Env(env)
    const handler = (await import('./api/mindshare/epoch2-recount')).default
    const host = req.headers.host ?? 'localhost'
    const vercelReq = await incomingToVercelRequest(req, host)
    const vercelRes = patchVercelResponse(res)
    await handler(vercelReq, vercelRes)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Epoch 2 recount failed'
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: false, error: message }))
  }
  return true
}

async function serveEpoch2RefreshIfMatched(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  env: Record<string, string>,
): Promise<boolean> {
  if (!pathname.startsWith('/api/mindshare/epoch2-refresh')) return false
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Allow', 'GET, POST')
    res.end('Method Not Allowed')
    return true
  }
  try {
    applyMindshareEpoch2Env(env)
    const handler = (await import('./api/mindshare/epoch2-refresh')).default
    const host = req.headers.host ?? 'localhost'
    const vercelReq = await incomingToVercelRequest(req, host)
    const vercelRes = patchVercelResponse(res)
    await handler(vercelReq, vercelRes)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Epoch 2 refresh failed'
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: false, error: message }))
  }
  return true
}

/** Dev + preview: handle /api/waitlist/* (Vite does not run this on production static hosting). */
async function serveWaitlistApiIfMatched(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  env: Record<string, string>,
  passToNext: Connect.NextFunction,
): Promise<boolean> {
  const isLegacyWaitlistStatsShortcut =
    pathname === '/waitlist-stats' ||
    pathname.startsWith('/waitlist-stats/') ||
    pathname === '/sr-platform/waitlist-stats' ||
    pathname.startsWith('/sr-platform/waitlist-stats/')
  if (
    !pathname.startsWith('/api/waitlist/') &&
    !pathname.startsWith('/waitlist/') &&
    pathname !== '/waitlist' &&
    !isLegacyWaitlistStatsShortcut
  )
    return false
  applyWaitlistEnvToProcess(env)
  let handler: ((req: VercelRequest, res: VercelResponse) => Promise<void>) | undefined
  try {
    if (
      pathname.startsWith('/api/waitlist/register-test') ||
      pathname.startsWith('/waitlist/register-test')
    ) {
      handler = (await import('./api/waitlist/register-test')).default
    } else if (pathname.startsWith('/api/waitlist/register') || pathname.startsWith('/waitlist/register')) {
      handler = (await import('./api/waitlist/register')).default
    } else if (
      pathname === '/api/waitlist/stats' ||
      pathname === '/waitlist' ||
      pathname === '/waitlist/stats' ||
      pathname.startsWith('/waitlist/stats/') ||
      isLegacyWaitlistStatsShortcut
    ) {
      handler = (await import('./api/waitlist/stats')).default
    } else if (pathname.startsWith('/api/waitlist/status') || pathname.startsWith('/waitlist/status')) {
      handler = (await import('./api/waitlist/status')).default
    } else if (pathname.startsWith('/api/waitlist/snapshot') || pathname.startsWith('/waitlist/snapshot')) {
      handler = (await import('./api/waitlist/snapshot')).default
    } else if (pathname.startsWith('/api/waitlist/prices') || pathname.startsWith('/waitlist/prices')) {
      handler = (await import('./api/waitlist/prices')).default
    }
  } catch {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'Failed to load waitlist handler' }))
    return true
  }
  if (!handler) {
    passToNext()
    return true
  }
  try {
    const host = req.headers.host ?? 'localhost'
    const vercelReq = await incomingToVercelRequest(req, host)
    const vercelRes = patchVercelResponse(res)
    await handler(vercelReq, vercelRes)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Waitlist API error'
    if (!res.headersSent && !res.writableEnded) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: message }))
    }
  }
  return true
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const avatarOpts = {
    maxUnavatarPerMinute: parsePositiveInt(env.UNAVATAR_MAX_PER_MINUTE, 30),
    cacheTtlMs: parsePositiveInt(env.UNAVATAR_CACHE_TTL_MS, 86_400_000),
  }

  return {
    plugins: [
      react(),
      {
        name: 'api-dev-proxy',
        configureServer(server) {
          attachWaitlistDevCron(server, env)
          attachMindshareEpoch2RefreshDevCron(server, env)
          attachMindshareEpoch2SrSnapshotDevCron(server, env)
          server.middlewares.use(async (req, res, next) => {
            const pathname = req.url?.split('?')[0] ?? ''

            if (await serveWaitlistApiIfMatched(req, res, pathname, env, next)) return

            if (pathname.startsWith('/api/x-oauth/exchange') || pathname.startsWith('/api/x/oauth/exchange')) {
              if (req.method !== 'POST') {
                res.statusCode = 405
                res.end('Method Not Allowed')
                return
              }
              try {
                const raw = await readHttpBody(req)
                const json = JSON.parse(raw || '{}') as {
                  code?: string
                  code_verifier?: string
                  redirect_uri?: string
                }
                const clientId = env.TWITTER_OAUTH2_CLIENT_ID
                const clientSecret = env.TWITTER_OAUTH2_CLIENT_SECRET
                if (!clientId || !clientSecret) {
                  res.statusCode = 503
                  res.setHeader('Content-Type', 'application/json')
                  res.end(
                    JSON.stringify({
                      error:
                        'Set TWITTER_OAUTH2_CLIENT_ID and TWITTER_OAUTH2_CLIENT_SECRET in .env for local dev',
                    }),
                  )
                  return
                }
                if (!json.code || !json.code_verifier || !json.redirect_uri) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing code, code_verifier, or redirect_uri' }))
                  return
                }
                const profile = await exchangeTwitterOAuth2Code({
                  clientId,
                  clientSecret,
                  code: json.code,
                  redirectUri: json.redirect_uri,
                  codeVerifier: json.code_verifier,
                })
                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.setHeader('Cache-Control', 'no-store')
                res.end(JSON.stringify({ profile }))
              } catch (e: unknown) {
                const message = e instanceof Error ? e.message : 'Exchange failed'
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ error: message }))
              }
              return
            }

            if (pathname.startsWith('/api/mindshare/test-epoch2-leaderboard')) {
              if (req.method !== 'GET') {
                res.statusCode = 405
                res.setHeader('Allow', 'GET')
                res.end('Method Not Allowed')
                return
              }
              try {
                applyMindshareEpoch2Env(env)
                const host = req.headers.host ?? 'localhost'
                const url = new URL(req.url ?? '/', `http://${host}`)
                const forceRefresh =
                  url.searchParams.get('refresh') === '1' || url.searchParams.get('refresh') === 'true'
                if (forceRefresh) {
                  const run = await runMindshareEpoch2DailySnapshot({
                    bearerToken: process.env.TWITTER_BEARER_TOKEN,
                    csvPath: process.env.MINDSHARE_SUBMISSIONS_CSV_PATH,
                  })
                  if (!run.ok) {
                    res.statusCode = 500
                    res.setHeader('Content-Type', 'application/json; charset=utf-8')
                    res.end(JSON.stringify({ ok: false, error: run.error }))
                    return
                  }
                }
                const payload = await getMindshareEpoch2LeaderboardForDisplay({
                  bearerToken: process.env.TWITTER_BEARER_TOKEN,
                  csvPath: process.env.MINDSHARE_SUBMISSIONS_CSV_PATH,
                  forceRefresh: false,
                })
                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.setHeader('Cache-Control', 'no-store')
                res.end(JSON.stringify(payload))
              } catch (e: unknown) {
                const message = e instanceof Error ? e.message : 'Epoch 2 leaderboard build failed'
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ ok: false, error: message }))
              }
              return
            }

            if (await serveEpoch2RefreshIfMatched(req, res, pathname, env)) return
            if (await serveEpoch2RecountIfMatched(req, res, pathname, env)) return
            if (await serveEpoch2SrBackfillDayIfMatched(req, res, pathname, env)) return

            if (pathname.startsWith('/api/mindshare/epoch2-sr-snapshot')) {
              if (req.method !== 'GET' && req.method !== 'POST') {
                res.statusCode = 405
                res.setHeader('Allow', 'GET, POST')
                res.end('Method Not Allowed')
                return
              }
              try {
                applyMindshareEpoch2Env(env)
                const handler = (await import('./api/mindshare/epoch2-sr-snapshot')).default
                const host = req.headers.host ?? 'localhost'
                const vercelReq = await incomingToVercelRequest(req, host)
                const vercelRes = patchVercelResponse(res)
                await handler(vercelReq, vercelRes)
              } catch (e: unknown) {
                const message = e instanceof Error ? e.message : 'Epoch2 SR snapshot failed'
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ ok: false, error: message }))
              }
              return
            }

            if (pathname.startsWith('/api/mindshare/submit')) {
              if (req.method !== 'POST') {
                res.statusCode = 405
                res.end('Method Not Allowed')
                return
              }
              try {
                const raw = await readHttpBody(req)
                const json = JSON.parse(raw || '{}') as {
                  name?: string
                  xHandle?: string
                  mindshareUrls?: string
                  rewardWalletAddress?: string
                  srBalance?: string
                }

                const name = (json.name ?? '').trim()
                const xHandle = (json.xHandle ?? '').trim()
                const mindshareUrls = (json.mindshareUrls ?? '').trim()
                const rewardWalletAddress = (json.rewardWalletAddress ?? '').trim()
                const srBalance = (json.srBalance ?? '').trim()
                if (!name || !xHandle || !mindshareUrls || !rewardWalletAddress) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(
                    JSON.stringify({
                      error:
                        'Missing required fields: name, xHandle, mindshareUrls, rewardWalletAddress',
                    }),
                  )
                  return
                }

                const result = await appendMindshareSubmissionCsv(
                  {
                    xHandle,
                    walletAddress: rewardWalletAddress,
                    name,
                    postSubmitted: mindshareUrls,
                    srBalance,
                  },
                  env.MINDSHARE_SUBMISSIONS_CSV_PATH,
                )

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ ok: true, file: result.filePath }))
              } catch (e: unknown) {
                const message = e instanceof Error ? e.message : 'Failed to append CSV row'
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ error: message }))
              }
              return
            }

            if (!pathname.startsWith('/api/avatar')) {
              next()
              return
            }
            try {
              const host = req.headers.host ?? 'localhost'
              const url = new URL(req.url ?? '/', `http://${host}`)
              const username = url.searchParams.get('username')
              if (!username) {
                res.statusCode = 400
                res.end('Missing username')
                return
              }
              const result = await resolveAvatar(username, env.TWITTER_BEARER_TOKEN, avatarOpts)
              if (result.kind === 'redirect') {
                res.statusCode = 302
                res.setHeader('Location', result.url)
                res.setHeader('Cache-Control', 'public, max-age=300')
                res.end()
                return
              }
              if (result.kind === 'rate_limited') {
                res.statusCode = 429
                res.setHeader('Retry-After', '60')
                res.end('Too Many Requests')
                return
              }
              res.statusCode = 200
              res.setHeader('Content-Type', result.contentType)
              res.setHeader('Cache-Control', 'public, max-age=86400')
              res.end(Buffer.from(result.body))
            } catch {
              res.statusCode = 502
              res.end()
            }
          })
        },
        configurePreviewServer(previewServer) {
          attachWaitlistDevCron(previewServer, env)
          attachMindshareEpoch2RefreshDevCron(previewServer, env)
          attachMindshareEpoch2SrSnapshotDevCron(previewServer, env)
          previewServer.middlewares.use(async (req, res, next) => {
            const pathname = req.url?.split('?')[0] ?? ''
            if (await serveWaitlistApiIfMatched(req, res, pathname, env, next)) return
            if (pathname.startsWith('/api/mindshare/test-epoch2-leaderboard')) {
              if (req.method !== 'GET') {
                res.statusCode = 405
                res.setHeader('Allow', 'GET')
                res.end('Method Not Allowed')
                return
              }
              try {
                applyMindshareEpoch2Env(env)
                const host = req.headers.host ?? 'localhost'
                const url = new URL(req.url ?? '/', `http://${host}`)
                const forceRefresh =
                  url.searchParams.get('refresh') === '1' || url.searchParams.get('refresh') === 'true'
                if (forceRefresh) {
                  const run = await runMindshareEpoch2DailySnapshot({
                    bearerToken: process.env.TWITTER_BEARER_TOKEN,
                    csvPath: process.env.MINDSHARE_SUBMISSIONS_CSV_PATH,
                  })
                  if (!run.ok) {
                    res.statusCode = 500
                    res.setHeader('Content-Type', 'application/json; charset=utf-8')
                    res.end(JSON.stringify({ ok: false, error: run.error }))
                    return
                  }
                }
                const payload = await getMindshareEpoch2LeaderboardForDisplay({
                  bearerToken: process.env.TWITTER_BEARER_TOKEN,
                  csvPath: process.env.MINDSHARE_SUBMISSIONS_CSV_PATH,
                  forceRefresh: false,
                })
                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.setHeader('Cache-Control', 'no-store')
                res.end(JSON.stringify(payload))
              } catch (e: unknown) {
                const message = e instanceof Error ? e.message : 'Epoch 2 leaderboard build failed'
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ ok: false, error: message }))
              }
              return
            }

            if (await serveEpoch2RefreshIfMatched(req, res, pathname, env)) return
            if (await serveEpoch2RecountIfMatched(req, res, pathname, env)) return
            if (await serveEpoch2SrBackfillDayIfMatched(req, res, pathname, env)) return

            if (pathname.startsWith('/api/mindshare/epoch2-sr-snapshot')) {
              if (req.method !== 'GET' && req.method !== 'POST') {
                res.statusCode = 405
                res.setHeader('Allow', 'GET, POST')
                res.end('Method Not Allowed')
                return
              }
              try {
                applyMindshareEpoch2Env(env)
                const handler = (await import('./api/mindshare/epoch2-sr-snapshot')).default
                const host = req.headers.host ?? 'localhost'
                const vercelReq = await incomingToVercelRequest(req, host)
                const vercelRes = patchVercelResponse(res)
                await handler(vercelReq, vercelRes)
              } catch (e: unknown) {
                const message = e instanceof Error ? e.message : 'Epoch2 SR snapshot failed'
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ ok: false, error: message }))
              }
              return
            }
            next()
          })
        },
      },
    ],
    server: {
      port: 3000,
      open: true,
      /** Tunnels / reverse proxies that forward `Host: strikerobot.ai` (e.g. Cloudflare). */
      allowedHosts: ['strikerobot.ai', '.strikerobot.ai'],
    },
    preview: {
      port: 3000,
      allowedHosts: ['strikerobot.ai', '.strikerobot.ai'],
    },
    esbuild: {
      drop: ['console'],
    },
    build: {
      minify: 'esbuild',
      rollupOptions: {
        input: {
          main: 'index.html',
          srPlatform: 'sr-platform/index.html',
        },
      },
    },
  }
})

