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
  name: string
  mindshareUrls: string
}

const X_OAUTH_CLIENT_ID = (import.meta.env.VITE_X_OAUTH_CLIENT_ID as string | undefined)?.trim() || undefined

const MindshareSubmit = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { address, hasProvider, connect, disconnect } = useEip1193Wallet()
  const [xProfile, setXProfile] = useState<XOAuthStoredProfile | null>(() => readStoredXProfile())
  const [xBusy, setXBusy] = useState(false)
  const [submitBusy, setSubmitBusy] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const oauthHandledRef = useRef(false)

  const [form, setForm] = useState<SubmissionState>({
    name: '',
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
              <span>Type Your Name *</span>
              <input
                type="text"
                placeholder="Type your name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>

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
