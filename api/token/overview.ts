import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readTokenOverview } from '../../lib/tokenOnchainOverview'

function sendUnavailable(res: VercelResponse): void {
  res.statusCode = 503
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ error: 'TOKEN_DATA_UNAVAILABLE' }))
}

export function createTokenOverviewHandler(read = readTokenOverview) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    if (req.method !== 'GET') {
      res.status(405).setHeader('Allow', 'GET').end('Method Not Allowed')
      return
    }

    const rpcUrl = process.env.BASE_RPC_URL?.trim()
    if (!rpcUrl) {
      sendUnavailable(res)
      return
    }

    try {
      const data = await read(rpcUrl)
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'public, s-maxage=30')
      res.end(JSON.stringify(data))
    } catch {
      sendUnavailable(res)
    }
  }
}

export default createTokenOverviewHandler()
