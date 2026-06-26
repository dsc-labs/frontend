import type { VercelRequest, VercelResponse } from '@vercel/node'
import { appendMindshareSubmissionCsv } from '../../lib/mindshareCsvStore'
import { isMindshareSubmissionOpen } from '../../lib/mindshareEpoch2Constants'
import { resolveActiveMindshareSubmissionsCsvPath } from '../../lib/mindshareEpoch2DataPaths'
import { verifyPrivyBearerRequest, extractBearerToken } from '../../lib/privyServerAuth'

type SubmitBody = {
  name?: string
  xHandle?: string
  mindshareUrls?: string
  rewardWalletAddress?: string
  srBalance?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').end('Method Not Allowed')
    return
  }

  const bearer = extractBearerToken(req)
  const skipAuth = process.env.MINDSHARE_SUBMIT_SKIP_AUTH === '1' && !process.env.VERCEL
  if (bearer && !skipAuth) {
    const auth = await verifyPrivyBearerRequest(req)
    if (!auth.ok) {
      sendJson(res, auth.status, { error: auth.error })
      return
    }
  }

  const csvPath = resolveActiveMindshareSubmissionsCsvPath()
  if (!csvPath || !isMindshareSubmissionOpen()) {
    sendJson(res, 403, {
      error: 'Submissions are closed. Epoch 3 entries open at 17:00 UTC, May 26, 2026.',
    })
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
      csvPath,
    )
    sendJson(res, 200, { ok: true, file: result.filePath })
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
