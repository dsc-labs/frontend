import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../../components/common/Header/Header'
import { DefaultPageSEO } from '../../components/common/PageSEO/PageSEO'
import { useEip1193Wallet } from '../../hooks/useEip1193Wallet'
import {
  clearStoredXProfile,
  exchangeCodeForProfile,
  getXOAuthRedirectUri,
  readStoredXProfile,
  startXOAuthPkceFlow,
  type XOAuthStoredProfile,
} from '../../lib/xOAuthClient'
import './MindshareSubmit.css'

type SubmissionState = {
  mindshareUrls: string
}

const X_OAUTH_CLIENT_ID = (import.meta.env.VITE_X_OAUTH_CLIENT_ID as string | undefined)?.trim() || undefined
const EPOCH_1_END = new Date('2026-04-22T17:00:00Z')
const EPOCH_2_DURATION_MS = 28 * 24 * 60 * 60 * 1000
const EPOCH_2_END = new Date(EPOCH_1_END.getTime() + EPOCH_2_DURATION_MS)
const TRACKED_TOKEN = {
  address: '0x10c56F005a379f8eAfc88ff5c3f40d30F0031AC9',
  name: 'Strike Robot',
  symbol: 'SR',
  decimals: 18,
} as const

type MindshareCountdownProps = {
  end: Date
  epoch: 1 | 2
  onComplete?: () => void
}

function pad2(n: number) {
  return n.toString().padStart(2, '0')
}

function getRemaining(end: Date, nowMs: number) {
  const t = end.getTime() - nowMs
  if (t <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  }
  const seconds = Math.floor(t / 1000)
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return { days, hours, minutes, seconds: secs, expired: false }
}

const MindshareCountdown = ({ end, epoch, onComplete }: MindshareCountdownProps) => {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const hasTriggeredRef = useRef(false)

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const { days, hours, minutes, seconds, expired } = getRemaining(end, nowMs)

  useEffect(() => {
    if (!expired || hasTriggeredRef.current || !onComplete) return
    hasTriggeredRef.current = true
    onComplete()
  }, [expired, onComplete])

  if (expired) {
    return (
      <p className="mindshare-submit-countdown-expired" role="status">
        Epoch {epoch} has ended.
      </p>
    )
  }

  const units = [
    { label: 'Days', value: pad2(days) },
    { label: 'Hours', value: pad2(hours) },
    { label: 'Minutes', value: pad2(minutes) },
    { label: 'Seconds', value: pad2(seconds) },
  ]

  return (
    <div className="mindshare-submit-countdown" aria-live="polite" role="timer">
      {units.map((u) => (
        <div key={u.label} className="mindshare-submit-countdown-unit">
          <span className="mindshare-submit-countdown-value">{u.value}</span>
          <span className="mindshare-submit-countdown-label">{u.label}</span>
        </div>
      ))}
    </div>
  )
}

function formatTokenBalance(raw: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals)
  const whole = raw / base
  const fraction = raw % base
  if (fraction === 0n) return whole.toString()
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '')
  return `${whole.toString()}.${fractionStr.slice(0, 4)}`
}

function buildErc20BalanceOfCall(walletAddress: string): string {
  const normalized = walletAddress.toLowerCase().replace(/^0x/, '')
  return `0x70a08231000000000000000000000000${normalized}`
}

type EthereumProviderLike = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

function getEthereumProvider(): EthereumProviderLike | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as Window & { ethereum?: EthereumProviderLike }).ethereum
}

const MindshareSubmit = () => {
  const [activeEpoch, setActiveEpoch] = useState<1 | 2>(() =>
    Date.now() > EPOCH_1_END.getTime() ? 2 : 1,
  )
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { address, hasProvider, connect, disconnect } = useEip1193Wallet()
  const [xProfile, setXProfile] = useState<XOAuthStoredProfile | null>(() => readStoredXProfile())
  const [xBusy, setXBusy] = useState(false)
  const [submitBusy, setSubmitBusy] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [tokenBusy, setTokenBusy] = useState(false)
  const oauthHandledRef = useRef(false)

  const [form, setForm] = useState<SubmissionState>({
    mindshareUrls: '',
  })

  const clearOAuthParams = useCallback(() => {
    navigate('/mindshare-submit', { replace: true })
  }, [navigate])

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

    const lockKey = `x_oauth_lock_submit_${state}`
    if (sessionStorage.getItem(lockKey)) {
      clearOAuthParams()
      return
    }
    sessionStorage.setItem(lockKey, '1')

    let cancelled = false
    ;(async () => {
      setXBusy(true)
      try {
        const redirectUri = getXOAuthRedirectUri('/mindshare-submit')
        const profile = await exchangeCodeForProfile({ code, state, redirectUri })
        if (cancelled) return
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
  }, [searchParams, clearOAuthParams])

  const onConnectX = () => {
    if (!X_OAUTH_CLIENT_ID) {
      window.alert('Set VITE_X_OAUTH_CLIENT_ID in .env, then restart dev server.')
      return
    }
    void startXOAuthPkceFlow(X_OAUTH_CLIENT_ID, '/mindshare-submit')
  }

  const onDisconnectX = () => {
    clearStoredXProfile()
    setXProfile(null)
  }

  const walletAddress = address
  const isIdentityLinked = !!xProfile && !!walletAddress
  const countdownEnd = activeEpoch === 1 ? EPOCH_1_END : EPOCH_2_END

  const handleCountdownComplete = () => {
    if (activeEpoch === 1) {
      setActiveEpoch(2)
    }
  }

  useEffect(() => {
    setTokenBalance(null)
    setTokenError(null)
  }, [walletAddress])

  const onScanTokenBalance = async () => {
    if (!walletAddress) {
      setTokenError('connect wallet to scan token balance')
      return
    }
    const provider = getEthereumProvider()
    if (!provider) {
      setTokenError('wallet provider unavailable for token scan')
      return
    }
    setTokenBusy(true)
    setTokenError(null)
    try {
      const data = buildErc20BalanceOfCall(walletAddress)
      const result = (await provider.request({
        method: 'eth_call',
        params: [{ to: TRACKED_TOKEN.address, data }, 'latest'],
      })) as string
      const parsed = BigInt(result)
      setTokenBalance(parsed)
    } catch {
      setTokenBalance(null)
      setTokenError('unable to scan token on current network')
    } finally {
      setTokenBusy(false)
    }
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!xProfile?.username || !walletAddress) {
      setSubmitMessage('Please connect both X and Wallet before submitting.')
      return
    }
    setSubmitBusy(true)
    setSubmitMessage(null)
    try {
      const payload = {
        ...form,
        name: xProfile.name?.trim() || `@${xProfile.username}`,
        xHandle: `@${xProfile.username}`,
        rewardWalletAddress: walletAddress,
      }
      const res = await fetch('/api/mindshare/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const text = await res.text()
      let json: { ok?: boolean; error?: string } = {}
      try {
        json = JSON.parse(text) as { ok?: boolean; error?: string }
      } catch {
        /* no-op */
      }
      if (!res.ok || !json.ok) {
        throw new Error(json.error || text || `HTTP ${res.status}`)
      }
      setSubmitMessage('Submitted successfully. Your entry has been saved.')
      setForm((prev) => ({ ...prev, mindshareUrls: '' }))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit entry'
      setSubmitMessage(`Submit failed: ${message}`)
    } finally {
      setSubmitBusy(false)
    }
  }

  return (
    <div className="mindshare-submit-page">
      <DefaultPageSEO path="/mindshare-submit" />
      <Header showSocialIcons={false} />

      <main className="mindshare-submit-container">
        <section className="mindshare-submit-shell">
          <header className="mindshare-submit-head">
            <MindshareCountdown
              end={countdownEnd}
              epoch={activeEpoch}
              onComplete={handleCountdownComplete}
            />
            <h1>SUBMIT YOUR MINDSHARE</h1>
          </header>

          <div className="mindshare-submit-identity">
            <span className={`mindshare-submit-identity-dot ${isIdentityLinked ? 'is-linked' : ''}`} aria-hidden="true" />
            <div>
              <strong>{isIdentityLinked ? 'Identity linked' : 'Identity not fully linked'}</strong>
              <p>
                X: {xProfile ? `@${xProfile.username}` : 'not connected'} · Wallet: {walletAddress ?? 'not connected'}
              </p>
            </div>
            <div className="mindshare-submit-identity-actions">
              {xProfile ? (
                <button type="button" className="mindshare-submit-identity-btn is-ghost" onClick={onDisconnectX}>
                  Disconnect X
                </button>
              ) : (
                <button type="button" className="mindshare-submit-identity-btn" onClick={onConnectX} disabled={xBusy}>
                  {xBusy ? 'Connecting X...' : 'Connect X'}
                </button>
              )}

              {walletAddress ? (
                <button type="button" className="mindshare-submit-identity-btn is-ghost" onClick={disconnect}>
                  Disconnect Wallet
                </button>
              ) : (
                <button
                  type="button"
                  className="mindshare-submit-identity-btn"
                  onClick={() => void connect()}
                  disabled={!hasProvider}
                  title={!hasProvider ? 'No EIP-1193 wallet in this browser' : undefined}
                >
                  Connect Wallet
                </button>
              )}

              <div className="mindshare-submit-identity-actions-secondary">
                <button
                  type="button"
                  className="mindshare-submit-identity-btn"
                  onClick={() => void onScanTokenBalance()}
                  disabled={tokenBusy}
                >
                  {tokenBusy
                    ? 'Scanning...'
                    : tokenBalance !== null
                      ? `SR: ${formatTokenBalance(tokenBalance, TRACKED_TOKEN.decimals)}`
                      : tokenError
                        ? 'Retry SR Scan'
                        : 'Show SR Balance'}
                </button>
                <a
                  href="https://app.virtuals.io/virtuals/70972"
                  className="mindshare-submit-identity-btn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Buy SR
                </a>
              </div>
            </div>
          </div>

          <section className="mindshare-submit-protocol" aria-label="Submission protocol">
            <div className="mindshare-submit-protocol-title">SUBMISSION REQUIREMENTS</div>
            <div className="mindshare-submit-protocol-grid">
              <p>
                <strong>01. ELIGIBILITY:</strong> Contributors must have a verified X account that has been active
                for at least 3 months.
              </p>
              <p>
                <strong>03. REVIEW:</strong> Accounts and content with high AI-generated signals will not be
                prioritized in the evaluation process.
              </p>
              <p>
                <strong>02. FORMAT:</strong> All content must be created around Strike Robot and be relevant to its
                ecosystem.
              </p>
              <p>
                <strong>04. SUBMISSION:</strong> You must submit all of your posts for tracking and evaluation.
              </p>
            </div>
          </section>

          <form className="mindshare-submit-form" onSubmit={onSubmit}>
            <label className="mindshare-submit-field">
              <span>Submit your mindshare about Strike Robot *</span>
              <textarea
                placeholder="You can submit one or multiple post URLs (e.g. https://x.com/your-post)"
                rows={7}
                value={form.mindshareUrls}
                onChange={(e) => setForm((prev) => ({ ...prev, mindshareUrls: e.target.value }))}
                required
              />
            </label>

            <div className="mindshare-submit-actions">
              <button type="submit" disabled={submitBusy || !isIdentityLinked}>
                {submitBusy ? 'Submitting...' : 'Submit Entry'}
              </button>
              <Link to="/mindshare-challenge">Back to challenge</Link>
            </div>
            {submitMessage ? <p className="mindshare-submit-status">{submitMessage}</p> : null}
          </form>
        </section>
      </main>
    </div>
  )
}

export default MindshareSubmit
