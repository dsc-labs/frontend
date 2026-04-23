import type { VercelRequest, VercelResponse } from '@vercel/node'
import { exchangeTwitterOAuth2Code } from '../../lib/xTwitterOAuthExchange'

type ExchangeBody = {
  code?: string
  code_verifier?: string
  redirect_uri?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').end('Method Not Allowed')
    return
  }

  let body: ExchangeBody = {}
  try {
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body || '{}') as ExchangeBody
    } else if (req.body && typeof req.body === 'object') {
      body = req.body as ExchangeBody
    }
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' })
    return
  }

  const code = typeof body.code === 'string' ? body.code : ''
  const codeVerifier = typeof body.code_verifier === 'string' ? body.code_verifier : ''
  const redirectUri = typeof body.redirect_uri === 'string' ? body.redirect_uri : ''
  if (!code || !codeVerifier || !redirectUri) {
    sendJson(res, 400, { error: 'Missing code, code_verifier, or redirect_uri' })
    return
  }

  const clientId = process.env.TWITTER_OAUTH2_CLIENT_ID
  const clientSecret = process.env.TWITTER_OAUTH2_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    sendJson(res, 503, {
      error: 'Server missing TWITTER_OAUTH2_CLIENT_ID or TWITTER_OAUTH2_CLIENT_SECRET',
    })
    return
  }

  try {
    const profile = await exchangeTwitterOAuth2Code({
      clientId,
      clientSecret,
      code,
      redirectUri,
      codeVerifier,
    })
    res.setHeader('Cache-Control', 'no-store')
    sendJson(res, 200, { profile })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Exchange failed'
    sendJson(res, 400, { error: message })
  }
}

function sendJson(res: VercelResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}
