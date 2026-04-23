import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Buffer } from 'node:buffer'
import { resolveAvatar } from '../lib/avatarRequest'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).end('Method Not Allowed')
    return
  }

  const raw = req.query.username ?? req.query.u
  const username = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : ''
  if (!username) {
    res.status(400).end('Missing username')
    return
  }

  const bearer = process.env.TWITTER_BEARER_TOKEN
  const result = await resolveAvatar(username, bearer)

  if (result.kind === 'redirect') {
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return res.redirect(302, result.url)
  }

  if (result.kind === 'rate_limited') {
    res.setHeader('Retry-After', '60')
    return res.status(429).end('Too Many Requests')
  }

  res.setHeader('Content-Type', result.contentType)
  res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=86400, stale-while-revalidate=604800')
  const body = Buffer.from(result.body)
  if (req.method === 'HEAD') {
    res.setHeader('Content-Length', String(body.length))
    return res.status(200).end()
  }
  return res.status(200).send(body)
}
