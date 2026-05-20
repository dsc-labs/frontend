import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { usePrivy } from '@privy-io/react-auth'
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
import {
  getMindshareEpochPhase,
  EPOCH_3_START_GMT7_LABEL,
  isEpoch2MindshareSubmissionOpen,
  mindshareCountdownEndMs,
} from '../../lib/mindshareEpochSchedule'
import './MindshareSubmit.css'

type SubmissionState = {
  mindshareUrls: string
}

const X_OAUTH_CLIENT_ID = (import.meta.env.VITE_X_OAUTH_CLIENT_ID as string | undefined)?.trim() || undefined
const BASE_RPC_URL = (import.meta.env.VITE_BASE_RPC_URL as string | undefined)?.trim() || undefined
const TRACKED_TOKEN = {
  address: '0x10c56F005a379f8eAfc88ff5c3f40d30F0031AC9',
  name: 'Strike Robot',
  symbol: 'SR',
  decimals: 18,
} as const

type MindshareCountdownProps = {
  end: Date
  expiredLabel: string
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

const MindshareCountdown = ({ end, expiredLabel }: MindshareCountdownProps) => {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const { days, hours, minutes, seconds, expired } = getRemaining(end, nowMs)

  if (expired) {
    return (
      <p className="mindshare-submit-countdown-expired" role="status">
        {expiredLabel}
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
  const fractionStr = fraction.toString().padStart(decimals, '0')
  return `${whole.toString()}.${fractionStr.slice(0, 1)}`
}

function buildErc20BalanceOfCall(walletAddress: string): string {
  const normalized = walletAddress.toLowerCase().replace(/^0x/, '')
  return `0x70a08231000000000000000000000000${normalized}`
}

async function fetchTokenBalanceFromBaseRpc(walletAddress: string): Promise<bigint> {
  if (!BASE_RPC_URL) {
    throw new Error('missing base rpc url')
  }
  const data = buildErc20BalanceOfCall(walletAddress)
  const res = await fetch(BASE_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{ to: TRACKED_TOKEN.address, data }, 'latest'],
    }),
  })
  const json = (await res.json()) as { result?: string; error?: { message?: string } }
  if (!res.ok || !json.result || json.error) {
    throw new Error(json.error?.message || `rpc failed (${res.status})`)
  }
  return BigInt(json.result)
}

const MindshareSubmit = () => {
  const [scheduleNowMs, setScheduleNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setScheduleNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const phase = getMindshareEpochPhase(scheduleNowMs)
  const submissionsOpen = isEpoch2MindshareSubmissionOpen(phase)
  const countdownEndMs = mindshareCountdownEndMs(phase)
  const countdownExpiredLabel =
    phase === 'epoch3_countdown'
      ? 'Epoch 3 has begun.'
      : phase === 'epoch2'
        ? 'Epoch 2 has ended.'
        : 'Epoch 1 has ended.'
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { getAccessToken } = usePrivy()
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
  useEffect(() => {
    if (!walletAddress) {
      setTokenBalance(null)
      setTokenError(null)
      setTokenBusy(false)
      return
    }

    if (!BASE_RPC_URL) {
      setTokenBalance(null)
      setTokenError('base rpc missing')
      setTokenBusy(false)
      return
    }

    let cancelled = false
    ;(async () => {
      setTokenBusy(true)
      setTokenError(null)
      try {
        const parsed = await fetchTokenBalanceFromBaseRpc(walletAddress)
        if (cancelled) return
        setTokenBalance(parsed)
      } catch {
        if (cancelled) return
        setTokenBalance(null)
        setTokenError('scan failed')
      } finally {
        if (!cancelled) setTokenBusy(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [walletAddress, BASE_RPC_URL])

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!submissionsOpen) {
      setSubmitMessage('Epoch 2 submissions are closed. New entries open with Epoch 3.')
      return
    }
    if (!xProfile?.username || !walletAddress) {
      setSubmitMessage('Please connect both X and Wallet before submitting.')
      return
    }
    setSubmitBusy(true)
    setSubmitMessage(null)
    try {
      const token = await getAccessToken()
      if (!token) {
        setSubmitMessage('Submit failed: Could not get auth token. Please reconnect your wallet.')
        return
      }
      const srBalance =
        tokenBalance !== null
          ? formatTokenBalance(tokenBalance, TRACKED_TOKEN.decimals)
          : tokenError
            ? 'N/A'
            : ''
      const payload = {
        ...form,
        name: xProfile.name?.trim() || `@${xProfile.username}`,
        xHandle: `@${xProfile.username}`,
        rewardWalletAddress: walletAddress,
        srBalance,
      }
      const res = await fetch('/api/mindshare/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
            {countdownEndMs != null ? (
              <MindshareCountdown
                end={new Date(countdownEndMs)}
                expiredLabel={countdownExpiredLabel}
              />
            ) : (
              <p className="mindshare-submit-countdown-expired" role="status">
                Epoch 3 is underway.
              </p>
            )}
            <h1>SUBMIT YOUR MINDSHARE</h1>
          </header>

          <div className="mindshare-submit-identity">
            <span className={`mindshare-submit-identity-dot ${isIdentityLinked ? 'is-linked' : ''}`} aria-hidden="true" />
            <div>
              <span className="mindshare-submit-identity-status">
                {isIdentityLinked ? 'Identity linked' : 'Identity not fully linked'}
              </span>
              <p>
                <span className="mindshare-submit-identity-line">
                  <span
                    className={`mindshare-submit-identity-label ${xProfile ? 'is-unlocked' : ''}`}
                  >
                    X:
                  </span>{' '}
                  {xProfile ? <strong>@{xProfile.username}</strong> : 'not connected'}
                </span>
                <span className="mindshare-submit-identity-line">
                  <span
                    className={`mindshare-submit-identity-label ${xProfile ? 'is-unlocked' : ''}`}
                  >
                    Wallet:
                  </span>{' '}
                  {walletAddress ? <strong>{walletAddress}</strong> : 'not connected'}
                </span>
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
                  className="mindshare-submit-identity-btn is-static"
                  disabled
                >
                  {tokenBusy
                    ? '… $SR'
                    : tokenBalance !== null
                      ? `${formatTokenBalance(tokenBalance, TRACKED_TOKEN.decimals)} $SR`
                      : tokenError
                        ? 'N/A $SR'
                        : '$SR BALANCE'}
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
                <strong>01. ELIGIBILITY:</strong> Eligible contributors must have a verified X account older than 3
                months and hold at least 10,000 $SR during random snapshots.
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

          {!submissionsOpen ? (
            <p className="mindshare-submit-closed" role="status">
              Epoch 2 submissions closed at midnight GMT+7 when Epoch 2 ended. The countdown above runs until
              Epoch 3 begins at {EPOCH_3_START_GMT7_LABEL} (3 days after Epoch 2 ended). Submit will stay closed
              until Epoch 3 entry rules are announced.
            </p>
          ) : null}

          <form className="mindshare-submit-form" onSubmit={onSubmit}>
            <fieldset disabled={!submissionsOpen} className="mindshare-submit-form-fieldset">
              <label className="mindshare-submit-field">
                <span>Submit your mindshare about Strike Robot *</span>
                <textarea
                  placeholder="You can submit one or multiple post URLs (e.g. https://x.com/your-post)"
                  rows={7}
                  value={form.mindshareUrls}
                  onChange={(e) => setForm((prev) => ({ ...prev, mindshareUrls: e.target.value }))}
                  required={submissionsOpen}
                />
              </label>

              <div className="mindshare-submit-actions">
                <button type="submit" disabled={submitBusy || !isIdentityLinked || !submissionsOpen}>
                  {submitBusy ? 'Submitting...' : 'Submit Entry'}
                </button>
                <Link to="/mindshare-challenge">Back to challenge</Link>
              </div>
            </fieldset>
            {submitMessage ? <p className="mindshare-submit-status">{submitMessage}</p> : null}
          </form>
        </section>
      </main>
    </div>
  )
}

export default MindshareSubmit
