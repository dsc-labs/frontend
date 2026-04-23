import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useEip1193Wallet } from '../../hooks/useEip1193Wallet'
import {
  clearStoredXProfile,
  exchangeCodeForProfile,
  getXOAuthRedirectUri,
  readStoredXProfile,
  startXOAuthPkceFlow,
  storeXProfile,
  type XOAuthStoredProfile,
} from '../../lib/xOAuthClient'
import './LeaderboardConnectBar.css'

const X_CONNECT_URL = (import.meta.env.VITE_X_CONNECT_URL as string | undefined)?.trim() || undefined
const X_OAUTH_CLIENT_ID = (import.meta.env.VITE_X_OAUTH_CLIENT_ID as string | undefined)?.trim() || undefined

const DEFAULT_OAUTH_PATH = '/leaderboard'

function normalizeOauthPath(path: string): string {
  const t = path.trim()
  if (!t) return DEFAULT_OAUTH_PATH
  return t.startsWith('/') ? t : `/${t}`
}

function explainXConnectOptions(oauthCallbackPath: string) {
  const path = normalizeOauthPath(oauthCallbackPath)
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://yoursite.com'
  window.alert(
    'Connect X (read your @handle) uses OAuth 2.0.\n\n' +
      'Option A — built-in flow:\n' +
      '1. X Developer Portal → app → User authentication → OAuth 2.0\n' +
      '2. Callback URL must match exactly (add every page you use):\n' +
      `   ${origin}${path}\n` +
      `   (e.g. also ${origin}/leaderboard or ${origin}/mindshare-challenge)\n` +
      '3. .env (restart dev server):\n' +
      '   VITE_X_OAUTH_CLIENT_ID=your_oauth2_client_id\n' +
      '   VITE_X_OAUTH_REDIRECT_URI=optional_full_url_override\n' +
      '4. Server / Vercel env (never VITE_):\n' +
      '   TWITTER_OAUTH2_CLIENT_ID=same_as_above\n' +
      '   TWITTER_OAUTH2_CLIENT_SECRET=your_client_secret\n\n' +
      'Option B — your own auth URL:\n' +
      '   VITE_X_CONNECT_URL=https://your-api…/auth/x',
  )
}

export type LeaderboardConnectBarProps = {
  /** Where X redirects after auth; must be registered on the X app (default `/leaderboard`). */
  oauthCallbackPath?: string
  /** Use on light pages (e.g. Mindshare) for readable buttons/chips. */
  onLightPage?: boolean
}

const LeaderboardConnectBar = ({
  oauthCallbackPath = DEFAULT_OAUTH_PATH,
  onLightPage = false,
}: LeaderboardConnectBarProps) => {
  const oauthPath = normalizeOauthPath(oauthCallbackPath)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { address, shortAddress, hasProvider, connect, disconnect } = useEip1193Wallet()
  const [xProfile, setXProfile] = useState<XOAuthStoredProfile | null>(() => readStoredXProfile())
  const [xBusy, setXBusy] = useState(false)
  const oauthHandledRef = useRef(false)

  const clearOAuthParams = useCallback(() => {
    navigate(oauthPath, { replace: true })
  }, [navigate, oauthPath])

  useEffect(() => {
    const err = searchParams.get('error')
    const desc = searchParams.get('error_description')
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      oauthHandledRef.current = false
    }

    if (err) {
      oauthHandledRef.current = false
      window.alert(
        `X authorization failed: ${err}${desc ? `\n${decodeURIComponent(desc.replace(/\+/g, ' '))}` : ''}`,
      )
      clearOAuthParams()
      return
    }

    if (!code || !state) return
    if (oauthHandledRef.current) return
    oauthHandledRef.current = true

    const lockKey = `x_oauth_lock_${state}`
    if (sessionStorage.getItem(lockKey)) {
      clearOAuthParams()
      return
    }
    sessionStorage.setItem(lockKey, '1')

    let cancelled = false
    ;(async () => {
      setXBusy(true)
      try {
        const redirectUri = getXOAuthRedirectUri(oauthPath)
        const profile = await exchangeCodeForProfile({ code, state, redirectUri })
        if (cancelled) return
        storeXProfile(profile)
        setXProfile(profile)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'X sign-in failed'
        window.alert(msg)
        sessionStorage.removeItem(lockKey)
        oauthHandledRef.current = false
      } finally {
        if (!cancelled) setXBusy(false)
        clearOAuthParams()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams, clearOAuthParams, oauthPath])

  const onConnectX = () => {
    if (X_CONNECT_URL) {
      window.open(X_CONNECT_URL, '_blank', 'noopener,noreferrer')
      return
    }
    if (X_OAUTH_CLIENT_ID) {
      void startXOAuthPkceFlow(X_OAUTH_CLIENT_ID, oauthPath)
      return
    }
    explainXConnectOptions(oauthPath)
  }

  const onDisconnectX = () => {
    clearStoredXProfile()
    setXProfile(null)
  }

  return (
    <div
      className={['leaderboard-connect-bar', onLightPage && 'leaderboard-connect-bar--light'].filter(Boolean).join(' ')}
      role="region"
      aria-label="Account connections"
    >
      <div className="leaderboard-connect-group">
        {X_CONNECT_URL ? (
          <a
            href={X_CONNECT_URL}
            className="leaderboard-connect-btn leaderboard-connect-btn--x"
            target="_blank"
            rel="noopener noreferrer"
          >
            Connect X
          </a>
        ) : xProfile ? (
          <div className="leaderboard-x-row">
            <span className="leaderboard-x-chip" title={xProfile.name}>
              @{xProfile.username}
            </span>
            <button type="button" className="leaderboard-connect-btn is-ghost" onClick={onDisconnectX}>
              Disconnect X
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="leaderboard-connect-btn leaderboard-connect-btn--x"
            onClick={onConnectX}
            disabled={xBusy}
            title={
              X_OAUTH_CLIENT_ID
                ? 'Sign in with X (read username)'
                : 'Configure OAuth (see click for env vars) or set VITE_X_CONNECT_URL'
            }
          >
            {xBusy ? 'Signing in…' : 'Connect X'}
          </button>
        )}
      </div>

      <div className="leaderboard-connect-group">
        {!address ? (
          <button
            type="button"
            className="leaderboard-connect-btn leaderboard-connect-btn--wallet"
            onClick={() => void connect()}
            disabled={!hasProvider}
            title={!hasProvider ? 'No EIP-1193 wallet in this browser' : undefined}
          >
            Connect wallet
          </button>
        ) : (
          <div className="leaderboard-wallet-row">
            <span className="leaderboard-wallet-chip" title={address}>
              {shortAddress}
            </span>
            <button type="button" className="leaderboard-connect-btn is-ghost" onClick={disconnect}>
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default LeaderboardConnectBar
