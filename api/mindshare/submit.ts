import type { VercelRequest, VercelResponse } from '@vercel/node'
import { appendMindshareSubmission } from '../../lib/mindshareSheets'

const DEFAULT_SPREADSHEET_ID = '1SDrT1CvJlgp6Se-onIGzaiy5D-kSF_a_hnLd630DsJo'
const DEFAULT_SHEET_NAME = 'Sheet1'

type SubmitBody = {
  name?: string
  xHandle?: string
  mindshareUrls?: string
  rewardWalletAddress?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').end('Method Not Allowed')
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
  if (!name || !xHandle || !mindshareUrls || !rewardWalletAddress) {
    sendJson(res, 400, {
      error: 'Missing required fields: name, xHandle, mindshareUrls, rewardWalletAddress',
    })
    return
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || DEFAULT_SHEET_NAME
  if (!clientEmail || !privateKey) {
    sendJson(res, 503, {
      error:
        'Server missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    })
    return
  }

  try {
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
    sendJson(res, 200, { ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to append row'
    sendJson(res, 500, { error: message })
  }
}

function sendJson(res: VercelResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}
