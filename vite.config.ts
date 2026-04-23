import type { IncomingMessage } from 'node:http'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { Buffer } from 'node:buffer'
import { resolveAvatar } from './lib/avatarRequest'
import { appendMindshareSubmission } from './lib/mindshareSheets'
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

// https://vitejs.dev/config/
function parsePositiveInt(raw: string | undefined, fallback: number) {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
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
          server.middlewares.use(async (req, res, next) => {
            const pathname = req.url?.split('?')[0] ?? ''

            if (pathname.startsWith('/api/x/oauth/exchange')) {
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
                }

                const name = (json.name ?? '').trim()
                const xHandle = (json.xHandle ?? '').trim()
                const mindshareUrls = (json.mindshareUrls ?? '').trim()
                const rewardWalletAddress = (json.rewardWalletAddress ?? '').trim()
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

                const clientEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL
                const privateKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
                const spreadsheetId =
                  env.GOOGLE_SHEETS_SPREADSHEET_ID || '1SDrT1CvJlgp6Se-onIGzaiy5D-kSF_a_hnLd630DsJo'
                const sheetName = env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1'
                if (!clientEmail || !privateKey) {
                  res.statusCode = 503
                  res.setHeader('Content-Type', 'application/json')
                  res.end(
                    JSON.stringify({
                      error:
                        'Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in .env',
                    }),
                  )
                  return
                }

                await appendMindshareSubmission({
                  spreadsheetId,
                  sheetName,
                  clientEmail,
                  privateKey,
                  row: {
                    xHandle,
                    walletAddress: rewardWalletAddress,
                    name,
                    postSubmitted: mindshareUrls,
                  },
                })

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ ok: true }))
              } catch (e: unknown) {
                const message = e instanceof Error ? e.message : 'Failed to append row'
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
      },
    ],
    server: {
      port: 3000,
      open: true,
    },
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
        },
      },
      rollupOptions: {
        input: {
          main: 'index.html',
          srPlatform: 'sr-platform/index.html',
        },
      },
    },
  }
})

