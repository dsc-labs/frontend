/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Privy app id (public) for wallet authentication UI */
  readonly VITE_PRIVY_APP_ID: string
  /** Full URL to start X (Twitter) login — your OAuth backend or hosted auth page */
  readonly VITE_X_CONNECT_URL?: string
  /** OAuth 2.0 Client ID from X Developer Portal (public; used for PKCE authorize URL) */
  readonly VITE_X_OAUTH_CLIENT_ID?: string
  /** Optional full redirect_uri override; when unset, each flow uses `origin` + its page path (e.g. `/mindshare-challenge`). */
  readonly VITE_X_OAUTH_REDIRECT_URI?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

