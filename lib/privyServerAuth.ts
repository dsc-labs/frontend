import { PrivyClient, type AuthTokenClaims } from '@privy-io/server-auth'
import type { VercelRequest } from '@vercel/node'

let privyClient: PrivyClient | null = null

function getPrivyClient(): PrivyClient | null {
  const appId = process.env.PRIVY_APP_ID?.trim()
  const appSecret = process.env.PRIVY_APP_SECRET?.trim()
  if (!appId || !appSecret) return null
  if (!privyClient) {
    privyClient = new PrivyClient(appId, appSecret)
  }
  return privyClient
}

export function extractBearerToken(req: Pick<VercelRequest, 'headers'>): string {
  const auth = typeof req.headers.authorization === 'string' ? req.headers.authorization : ''
  return /^Bearer\s+(.+)$/i.exec(auth)?.[1]?.trim() ?? ''
}

export type PrivyAuthResult =
  | { ok: true; claims: AuthTokenClaims }
  | { ok: false; status: number; error: string }

export async function verifyPrivyBearerRequest(req: Pick<VercelRequest, 'headers'>): Promise<PrivyAuthResult> {
  const privy = getPrivyClient()
  if (!privy) {
    return { ok: false, status: 503, error: 'Privy auth is not configured on the server.' }
  }

  const token = extractBearerToken(req)
  if (!token) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }

  try {
    const claims = await privy.verifyAuthToken(token)
    return { ok: true, claims }
  } catch {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
}
