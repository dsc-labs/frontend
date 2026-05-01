import type { VercelRequest, VercelResponse } from '@vercel/node'
import { PrivyClient } from '@privy-io/server-auth'
import { appendMindshareSubmissionCsv } from '../../lib/mindshareCsvStore'

function getPrivyClient(): PrivyClient | null {
  const appId = process.env.PRIVY_APP_ID
  const appSecret = process.env.PRIVY_APP_SECRET
  if (!appId || !appSecret) return null
  return new PrivyClient(appId, appSecret)
}

const privyClient = getPrivyClient()

type SubmitBody = {
  name?: string
  xHandle?: string
  mindshareUrls?: string
  rewardWalletAddress?: string
  /** Human-readable SR balance at submit time (optional). */
  srBalance?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').end('Method Not Allowed')
    return
  }

  if (!privyClient) {
    sendJson(res, 503, { error: 'Server auth not configured (missing PRIVY_APP_ID or PRIVY_APP_SECRET)' })
    return
  }

  const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) {
    sendJson(res, 401, { error: 'Missing authorization token' })
    return
  }

  try {
    await privyClient.verifyAuthToken(token)
  } catch {
    sendJson(res, 401, { error: 'Invalid or expired authorization token' })
    return
  }

  let body: SubmitBody = {}
  try {
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body || '{}') as SubmitBody
    } else if (req.body && typeof req.body === 'object') {
      body = req.body as SubmitBody
    }
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' })
    return
  }

  const name = (body.name ?? '').trim()
  const xHandle = (body.xHandle ?? '').trim()
  const mindshareUrls = (body.mindshareUrls ?? '').trim()
  const rewardWalletAddress = (body.rewardWalletAddress ?? '').trim()
  const srBalance = (body.srBalance ?? '').trim()
  if (!name || !xHandle || !mindshareUrls || !rewardWalletAddress) {
    sendJson(res, 400, {
      error: 'Missing required fields: name, xHandle, mindshareUrls, rewardWalletAddress',
    })
    return
  }

  try {
    const result = await appendMindshareSubmissionCsv(
      {
        xHandle,
        walletAddress: rewardWalletAddress,
        name,
        postSubmitted: mindshareUrls,
        srBalance,
      },
      process.env.MINDSHARE_SUBMISSIONS_CSV_PATH,
    )
    sendJson(res, 200, {
      ok: true,
      file: result.filePath,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to append CSV row'
    sendJson(res, 500, { error: message })
  }
}

function sendJson(res: VercelResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}
