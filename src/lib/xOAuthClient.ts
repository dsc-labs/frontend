/**
 * Browser-side X (Twitter) OAuth 2.0 PKCE: build authorize URL and persist verifier by state.
 * Token exchange runs on your server (/api/x-oauth/exchange) with TWITTER_OAUTH2_CLIENT_SECRET.
 */

const PKCE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'

export const X_OAUTH_PROFILE_KEY = 'mma_robot_x_profile'

export type XOAuthStoredProfile = {
  id: string
  username: string
  name: string
  profile_image_url?: string
}

function randomBytesUrlSafe(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += PKCE_CHARSET[bytes[i]! % PKCE_CHARSET.length]
  }
  return out
}

async function sha256Base64Url(plain: string): Promise<string> {
  const enc = new TextEncoder().encode(plain)
  const digest = await crypto.subtle.digest('SHA-256', enc)
  const bytes = new Uint8Array(digest)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function normalizeCallbackPath(path: string): string {
  const t = path.trim()
  if (!t) return '/leaderboard'
  return t.startsWith('/') ? t : `/${t}`
}

/**
 * Full redirect_uri for X OAuth (must match a callback URL on your X app).
 * @param callbackPath pathname only, e.g. `/mindshare-challenge` or `/leaderboard` (default).
 */
export function getXOAuthRedirectUri(callbackPath = '/leaderboard'): string {
  const override = (import.meta.env.VITE_X_OAUTH_REDIRECT_URI as string | undefined)?.trim()
  if (override) return override
  return `${window.location.origin}${normalizeCallbackPath(callbackPath)}`
}

export function readStoredXProfile(): XOAuthStoredProfile | null {
  try {
    const raw = localStorage.getItem(X_OAUTH_PROFILE_KEY)
    if (!raw) return null
    const j = JSON.parse(raw) as XOAuthStoredProfile
    if (!j?.username || !j?.id) return null
    return j
  } catch {
    return null
  }
}

export function clearStoredXProfile() {
  localStorage.removeItem(X_OAUTH_PROFILE_KEY)
}

export function storeXProfile(profile: XOAuthStoredProfile) {
  localStorage.setItem(X_OAUTH_PROFILE_KEY, JSON.stringify(profile))
}

/** 64-char verifier (within RFC 7636 43–128). */
function createCodeVerifier(): string {
  return randomBytesUrlSafe(64)
}

function verifierStorageKey(state: string) {
  return `x_oauth_pkce_${state}`
}

export async function startXOAuthPkceFlow(
  clientId: string,
  callbackPath = '/leaderboard',
): Promise<void> {
  const redirectUri = getXOAuthRedirectUri(callbackPath)
  const state = randomBytesUrlSafe(24)
  const codeVerifier = createCodeVerifier()
  const codeChallenge = await sha256Base64Url(codeVerifier)

  sessionStorage.setItem(verifierStorageKey(state), codeVerifier)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'users.read',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  window.location.assign(`https://twitter.com/i/oauth2/authorize?${params.toString()}`)
}

export async function exchangeCodeForProfile(args: {
  code: string
  state: string
  redirectUri: string
}): Promise<XOAuthStoredProfile> {
  const verifier = sessionStorage.getItem(verifierStorageKey(args.state))
  if (!verifier) {
    throw new Error('Missing PKCE verifier (try connecting again).')
  }

  const payload = JSON.stringify({
    code: args.code,
    code_verifier: verifier,
    redirect_uri: args.redirectUri,
  })
  const endpointCandidates = ['/api/x-oauth/exchange', '/api/x/oauth/exchange']
  let lastError = 'X sign-in failed'
  let profile: XOAuthStoredProfile | null = null

  for (const endpoint of endpointCandidates) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    })

    const text = await res.text()
    let json: { profile?: XOAuthStoredProfile; error?: string }
    try {
      json = JSON.parse(text) as { profile?: XOAuthStoredProfile; error?: string }
    } catch {
      json = {}
    }

    if (res.status === 404) {
      lastError = `Endpoint not found: ${endpoint}`
      continue
    }

    if (!res.ok) {
      throw new Error(json.error || text || `HTTP ${res.status}`)
    }

    if (!json.profile?.username) {
      throw new Error('Invalid profile response')
    }

    profile = json.profile
    break
  }

  if (!profile) {
    throw new Error(lastError)
  }

  sessionStorage.removeItem(verifierStorageKey(args.state))
  return profile
}
