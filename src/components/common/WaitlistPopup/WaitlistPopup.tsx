import { Fragment, useEffect, useState } from 'react'
import './WaitlistPopup.css'
import { useEip1193Wallet } from '../../../hooks/useEip1193Wallet'

const MIN = 10000
const BASE_RPC_URL = (import.meta.env.VITE_BASE_RPC_URL as string | undefined)?.trim() || undefined
const SR_TOKEN = { address: '0x10c56F005a379f8eAfc88ff5c3f40d30F0031AC9', decimals: 18 } as const
const VVV_TOKEN = { address: '0xacfE6019Ed1A7Dc6f7B508C02d1b04ec88cC21bf', decimals: 18 } as const
const WAITLIST_CAPACITY = 5000
const SNAPSHOT_INTERVAL_MS = 15 * 60 * 1000
/** Matches sr-popup.html mock: illustrative $/token for the live ticker (server snapshots use Dex prices). */
const LIVE_PREVIEW_USD_PER_TOKEN = 0.02

type Step = 1 | 2 | 3

type WaitlistUserPayload = {
  walletAddress: string
  email: string
  createdAt: string
  cumulativePoints: number
  lastSnapshotAt: string | null
  latestSrBalance: string
  latestVvvBalance: string
  latestMultiplier: number
  latestUsdPerMinute: number
}

function formatTokenBalance(raw: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals)
  const whole = raw / base
  const fraction = raw % base
  if (fraction === 0n) return whole.toString()
  const fractionStr = fraction.toString().padStart(decimals, '0')
  return `${whole.toString()}.${fractionStr.slice(0, 1)}`
}

function toTokenUnits(raw: bigint, decimals: number): number {
  const parsed = Number(formatTokenBalance(raw, decimals))
  return Number.isFinite(parsed) ? parsed : 0
}

function buildErc20BalanceOfCall(walletAddress: string): string {
  const normalized = walletAddress.toLowerCase().replace(/^0x/, '')
  return `0x70a08231000000000000000000000000${normalized}`
}

async function fetchTokenBalanceFromBaseRpc(walletAddress: string, tokenAddress: string): Promise<bigint> {
  if (!BASE_RPC_URL) throw new Error('missing base rpc url')
  const res = await fetch(BASE_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{ to: tokenAddress, data: buildErc20BalanceOfCall(walletAddress) }, 'latest'],
    }),
  })
  const json = (await res.json()) as { result?: string; error?: { message?: string } }
  if (!res.ok || !json.result || json.error) throw new Error(json.error?.message || `rpc failed (${res.status})`)
  return BigInt(json.result)
}

/** Tie-break for display when rank is unavailable (same formula as before). */
function displayWaitlistSlot(points: number, address?: string | null): number {
  const p = Math.max(0, points)
  const base = Math.ceil(4200 / Math.log10(p + 10))
  const tie = address ? address.charCodeAt(address.length - 1) % 9 : 0
  return Math.max(1, Math.min(WAITLIST_CAPACITY, base + tie))
}

/** sr-popup.html: (srUsd+vvvUsd) × hours × mult, using flat $/token for the preview. */
function livePreviewPtsFromSession(
  sessionStartMs: number,
  srBal: number,
  vvvBal: number,
  usdPerToken: number,
  nowMs: number,
): number {
  const srU = srBal * usdPerToken
  const vvvU = vvvBal * usdPerToken
  const hasV = vvvBal > 0
  const mult = hasV ? 1.2 : 1
  const hrs = Math.max(0, (nowMs - sessionStartMs) / 3_600_000)
  return (srU + vvvU) * hrs * mult
}

/** Grow server cumulative using last snapshot rates (same shape as snapshot job). */
function extrapolatedLivePointsFromServer(user: WaitlistUserPayload, nowMs: number): number {
  if (!user.lastSnapshotAt) return user.cumulativePoints
  const prev = Date.parse(user.lastSnapshotAt)
  if (!Number.isFinite(prev)) return user.cumulativePoints
  const minutes = Math.max(0, (nowMs - prev) / 60_000)
  return user.cumulativePoints + user.latestUsdPerMinute * minutes * user.latestMultiplier
}

/** Hold clock for registered users: same anchors as waitlist state JSON (`lastSnapshotAt`, else `createdAt`). */
function holdClockAnchorMsFromServerUser(user: WaitlistUserPayload): number | null {
  if (user.lastSnapshotAt) {
    const t = Date.parse(user.lastSnapshotAt)
    if (Number.isFinite(t)) return t
  }
  const c = Date.parse(user.createdAt)
  return Number.isFinite(c) ? c : null
}

function nextSnapshotMsFromServerUser(user: WaitlistUserPayload): number | null {
  const anchorMs = holdClockAnchorMsFromServerUser(user)
  if (anchorMs === null) return null
  return anchorMs + SNAPSHOT_INTERVAL_MS
}

function nextSnapshotMsFromNow(nowMs: number): number {
  return Math.ceil(nowMs / SNAPSHOT_INTERVAL_MS) * SNAPSHOT_INTERVAL_MS
}

function currentSnapshotStartMsFromNow(nowMs: number): number {
  return Math.floor(nowMs / SNAPSHOT_INTERVAL_MS) * SNAPSHOT_INTERVAL_MS
}

function formatRemainingHms(msRemaining: number): string {
  const totalSec = Math.max(0, Math.floor(msRemaining / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function WaitlistPopup({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState<Step>(1)
  const [email, setEmail] = useState('')
  const [srBalanceRaw, setSrBalanceRaw] = useState<bigint | null>(null)
  const [vvvBalanceRaw, setVvvBalanceRaw] = useState<bigint | null>(null)
  const [tokenBusy, setTokenBusy] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [joinBusy, setJoinBusy] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [registered, setRegistered] = useState<{ user: WaitlistUserPayload; rank: number | null } | null>(null)
  /** Server check: already on waitlist for this wallet? */
  const [walletRegStatus, setWalletRegStatus] = useState<'idle' | 'loading' | 'new' | 'existing'>('idle')
  const [existingFromServer, setExistingFromServer] = useState<{ user: WaitlistUserPayload; rank: number | null } | null>(
    null,
  )
  /** Session clock for hold timer + HTML-style preview (resets when wallet disconnects). */
  const [sessionStartMs, setSessionStartMs] = useState<number | null>(null)
  const [, setLiveTick] = useState(0)
  const { address, shortAddress, hasProvider, connect, disconnect } = useEip1193Wallet()

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose?.()
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  useEffect(() => {
    if (!address) {
      setSrBalanceRaw(null)
      setVvvBalanceRaw(null)
      setTokenBusy(false)
      setTokenError(null)
      setStep(1)
      setEmail('')
      setRegistered(null)
      setJoinError(null)
      setStatusBusy(false)
      setWalletRegStatus('idle')
      setExistingFromServer(null)
      setSessionStartMs(null)
      return
    }
    setSessionStartMs((s) => (s === null ? Date.now() : s))
    setStep((prev) => (prev === 3 ? prev : 2))
  }, [address])

  useEffect(() => {
    if (!address) return
    let cancelled = false
    setWalletRegStatus('loading')
    setExistingFromServer(null)
    setJoinError(null)
    ;(async () => {
      try {
        const res = await fetch(
          `/api/waitlist/status?walletAddress=${encodeURIComponent(address)}&limit=5`,
        )
        const data = (await res.json()) as {
          ok?: boolean
          user?: WaitlistUserPayload
          rank?: number | null
        }
        if (cancelled) return
        if (res.ok && data.user) {
          setWalletRegStatus('existing')
          setEmail(data.user.email)
          setExistingFromServer({ user: data.user, rank: data.rank ?? null })
        } else {
          setWalletRegStatus('new')
          setEmail('')
          setExistingFromServer(null)
        }
      } catch {
        if (!cancelled) {
          setWalletRegStatus('new')
          setEmail('')
          setExistingFromServer(null)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [address])

  useEffect(() => {
    if (step !== 2 && !(step === 3 && registered)) return
    const id = window.setInterval(() => setLiveTick((n) => n + 1), 100)
    return () => window.clearInterval(id)
  }, [step, registered])

  useEffect(() => {
    if (!address) return
    if (!BASE_RPC_URL) {
      setTokenError('base rpc missing')
      return
    }
    let cancelled = false
    ;(async () => {
      setTokenBusy(true)
      setTokenError(null)
      try {
        const [srParsed, vvvParsed] = await Promise.all([
          fetchTokenBalanceFromBaseRpc(address, SR_TOKEN.address),
          fetchTokenBalanceFromBaseRpc(address, VVV_TOKEN.address),
        ])
        if (!cancelled) {
          setSrBalanceRaw(srParsed)
          setVvvBalanceRaw(vvvParsed)
        }
      } catch {
        if (!cancelled) {
          setSrBalanceRaw(null)
          setVvvBalanceRaw(null)
          setTokenError('scan failed')
        }
      } finally {
        if (!cancelled) setTokenBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [address])

  const srBalance = srBalanceRaw !== null ? toTokenUnits(srBalanceRaw, SR_TOKEN.decimals) : 0
  const vvvBalance = vvvBalanceRaw !== null ? toTokenUnits(vvvBalanceRaw, VVV_TOKEN.decimals) : 0
  const srDisplay = srBalanceRaw !== null ? formatTokenBalance(srBalanceRaw, SR_TOKEN.decimals) : '0'
  const vvvDisplay = vvvBalanceRaw !== null ? formatTokenBalance(vvvBalanceRaw, VVV_TOKEN.decimals) : '0'
  const eligible = srBalance >= MIN
  const emailOk = email.includes('@') && email.trim().length >= 5
  const isExistingWallet = walletRegStatus === 'existing' && existingFromServer !== null
  const statusStillLoading = walletRegStatus === 'loading' || walletRegStatus === 'idle'
  /** Returning users can continue even while balances are still loading. */
  const continueEnabled =
    isExistingWallet && !joinBusy && !statusBusy && !statusStillLoading && existingFromServer !== null
  const joinNewEnabled =
    walletRegStatus === 'new' &&
    !tokenBusy &&
    !joinBusy &&
    !statusStillLoading &&
    eligible &&
    emailOk

  const nowMs = Date.now()
  const hasVvvLive = vvvBalance > 0
  const livePtsStep2 =
    isExistingWallet && existingFromServer
      ? extrapolatedLivePointsFromServer(existingFromServer.user, nowMs)
      : livePreviewPtsFromSession(
          currentSnapshotStartMsFromNow(nowMs),
          srBalance,
          vvvBalance,
          LIVE_PREVIEW_USD_PER_TOKEN,
          nowMs,
        )
  const usdPerHrPreview = (srBalance + vvvBalance) * LIVE_PREVIEW_USD_PER_TOKEN
  const usdPerHrServer =
    isExistingWallet && existingFromServer
      ? existingFromServer.user.latestUsdPerMinute * 60
      : usdPerHrPreview
  const displayUsdPerHr = isExistingWallet && existingFromServer ? usdPerHrServer : usdPerHrPreview
  const holdAnchorMs =
    isExistingWallet && existingFromServer
      ? holdClockAnchorMsFromServerUser(existingFromServer.user)
      : sessionStartMs
  const elapsedSec = holdAnchorMs !== null ? Math.max(0, Math.floor((nowMs - holdAnchorMs) / 1000)) : 0
  const holdClock = `${String(Math.floor(elapsedSec / 3600)).padStart(2, '0')}:${String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, '0')}:${String(elapsedSec % 60).padStart(2, '0')}`
  const nextSnapshotMs =
    isExistingWallet && existingFromServer
      ? nextSnapshotMsFromServerUser(existingFromServer.user)
      : nextSnapshotMsFromNow(nowMs)
  const snapshotCountdown = nextSnapshotMs !== null ? formatRemainingHms(nextSnapshotMs - nowMs) : holdClock

  async function submitRegister() {
    if (!address || !joinNewEnabled) return
    setJoinBusy(true)
    setJoinError(null)
    try {
      const res = await fetch('/api/waitlist/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, email: email.trim() }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        user?: WaitlistUserPayload
        rank?: number | null
      }
      if (!res.ok) {
        setJoinError(data.error ?? `Could not register (${res.status})`)
        return
      }
      if (data.user) {
        setRegistered({ user: data.user, rank: data.rank ?? null })
        setStep(3)
      }
    } catch {
      setJoinError('Network error — try again')
    } finally {
      setJoinBusy(false)
    }
  }

  async function goToStatusFromExisting() {
    if (!continueEnabled || !existingFromServer || !address) return
    setStatusBusy(true)
    setJoinError(null)
    try {
      const res = await fetch(
        `/api/waitlist/status?walletAddress=${encodeURIComponent(address)}&limit=5`,
      )
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        user?: WaitlistUserPayload
        rank?: number | null
      }
      if (!res.ok || !data.user) {
        setJoinError(data.error ?? `Could not load status (${res.status})`)
        return
      }
      const next = { user: data.user, rank: data.rank ?? null }
      setExistingFromServer(next)
      setRegistered(next)
      setStep(3)
    } catch {
      setJoinError('Network error — try again')
    } finally {
      setStatusBusy(false)
    }
  }

  const serverPoints = registered?.user.cumulativePoints ?? 0
  const serverRank = registered?.rank
  const livePtsStep3 = registered ? extrapolatedLivePointsFromServer(registered.user, Date.now()) : 0
  const waitlistPositionDisplay =
    serverRank != null ? `#${serverRank}` : `#${displayWaitlistSlot(livePtsStep3, address)}`
  const pointsDisplay = livePtsStep3.toFixed(4)
  const serverPointsDisplay = serverPoints.toFixed(4)
  const regHasVvv = Number(registered?.user.latestVvvBalance ?? 0) > 0

  return (
    <div className="wp-overlay" onClick={() => onClose?.()}>
      <div className="pop" onClick={(e) => e.stopPropagation()}>
        <div className="ph">
          <div className="logo">STRIKE<div className="logo-sep" />ROBOT<span className="logo-ai">AI</span></div>
          <button className="xbtn" onClick={() => onClose?.()} aria-label="Close">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="body">
          <div className="snav">
            <button className={`bbtn${step === 2 ? '' : ' hid'}`} onClick={() => { disconnect(); setStep(1) }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
              Back
            </button>
            <div className="dots">
              {([1, 2, 3] as Step[]).map((n, i) => (
                <Fragment key={n}>
                  <div className={`sd${step > n ? ' dn' : step === n ? ' act' : ''}`}>{step > n ? '✓' : n}</div>
                  {i < 2 ? <div className={`sl${step > n ? ' dn' : ''}`} /> : null}
                </Fragment>
              ))}
            </div>
            <div className="sp" />
          </div>

          {step === 1 ? (
            <div>
              <div className="title">Join SR Platform Waitlist</div>
              <p className="desc">
                Connect your wallet to verify your <strong>$SR</strong> and <strong>$VVV</strong> holdings. Minimum{' '}
                <strong>10,000 $SR</strong> to qualify. Hold both tokens to earn a <strong>×1.2 points multiplier</strong>.
              </p>
              <button className="cwb" onClick={() => void connect()} disabled={!hasProvider} title={!hasProvider ? 'No EIP-1193 wallet in this browser' : undefined}>
                <div className="cwb-ico"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><rect x="1" y="4" width="22" height="16" rx="2" /><path d="M1 10h22" /><circle cx="17" cy="15" r="1.5" fill="#fff" stroke="none" /></svg></div>
                Connect Wallet via Privy
              </button>
              <p className="foot-note">Secured by privy.io · Read-only · No transactions</p>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <div className="wbar">
                <div className="wdot" />
                <div style={{ flex: 1 }}>
                  <div className="waddr" title={address ?? undefined}>{shortAddress ?? '-'}</div>
                  <div className="wvia">via Privy</div>
                </div>
                <button className="disc" onClick={() => { disconnect(); setStep(1) }}>Disconnect</button>
              </div>

              <div className="tgrid">
                <div className="tc">
                  <div className="tc-head"><span className="tag sr">$SR</span><span className="tc-lbl">Balance</span></div>
                  <div className={`tc-val ${eligible ? 'ok' : 'bad'}`}>{tokenBusy ? '...' : srDisplay}</div>
                  <div className="tc-usd">
                    {tokenBusy
                      ? 'Checking...'
                      : tokenError
                        ? 'Balance unavailable'
                        : `≈ ${(srBalance * LIVE_PREVIEW_USD_PER_TOKEN).toFixed(2)}`}
                  </div>
                </div>
                <div className="tc">
                  <div className="tc-head"><span className="tag vvv">$VVV</span><span className="tc-lbl">Balance</span></div>
                  <div className={`tc-val ${vvvBalance > 0 ? 'ok' : 'bad'}`}>{tokenBusy ? '...' : vvvDisplay}</div>
                  <div className="tc-usd">
                    {tokenBusy
                      ? 'Checking...'
                      : tokenError
                        ? 'Balance unavailable'
                        : `≈ ${(vvvBalance * LIVE_PREVIEW_USD_PER_TOKEN).toFixed(2)}`}
                  </div>
                </div>
              </div>

              {isExistingWallet && existingFromServer ? (
                <p className="p-expl" style={{ marginBottom: 10 }}>
                  <span className="p-expl-strong">
                    Confirmed: {existingFromServer.user.cumulativePoints.toFixed(4)} pts
                    {existingFromServer.rank != null ? ` · Rank #${existingFromServer.rank}` : ''}
                  </span>
                </p>
              ) : (
                <p className="p-expl" style={{ marginBottom: 10 }}>
                  <span className="p-expl-muted">
                    Live preview uses <strong>$0.02</strong> per token (like the design mock); snapshots use live Dex prices.
                    After you join, the server also records balances for snapshot scoring.
                  </span>
                </p>
              )}

              <div className="pcard">
                <div className="pcard-top">
                  <span className="p-lbl">Points — realtime</span>
                  <span className={`bonus-pill${hasVvvLive ? ' show' : ''}`}>⚡ ×1.2 bonus</span>
                </div>
                <div className="p-main">
                  <div className="p-num">{livePtsStep2.toFixed(4)}</div>
                  <div className="p-unit">pts</div>
                </div>
                <div className="p-divider" />
                <div className="p-bottom">
                  <div className="timer-row">
                    <div className="tdot" />
                    <span className="t-lbl">Next Snapshot</span>
                    <span className="t-val">{snapshotCountdown}</span>
                  </div>
                  <div className="p-rate">
                    {displayUsdPerHr.toFixed(0)}/hr{hasVvvLive ? ' · ×1.2' : ''}
                  </div>
                </div>
              </div>

              <div className={`req ${eligible ? 'ok' : 'bad'}`}>{eligible ? '✓ Eligible — 10,000 $SR minimum met' : '✕ Not eligible — need at least 10,000 $SR'}</div>
              <div className="snap"><div className="snap-ico">⚡</div><div className="snap-txt"><b>Snapshots.</b> Hold at least <b>10,000 $SR</b> — dropping below on a snapshot may yield no points for that interval.</div></div>
              <label className="flbl">{isExistingWallet ? 'Registered email' : 'Email address'}</label>
              {statusStillLoading ? (
                <div className="finp finp-muted" aria-busy>
                  Checking registration…
                </div>
              ) : isExistingWallet ? (
                <div className="finp finp-locked" title="Email cannot be changed after registration">
                  {email}
                </div>
              ) : (
                <input
                  className="finp"
                  type="email"
                  value={email}
                  placeholder="you@example.com"
                  autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
              {joinError ? <div className="req bad" style={{ marginTop: 8 }}>{joinError}</div> : null}
              <button
                className="jbtn"
                disabled={isExistingWallet ? !continueEnabled : !joinNewEnabled}
                onClick={() => (isExistingWallet ? void goToStatusFromExisting() : void submitRegister())}
              >
                {statusBusy
                  ? 'Updating…'
                  : joinBusy
                    ? 'Joining…'
                    : isExistingWallet
                      ? 'Continue →'
                      : 'Join SR Platform →'}
              </button>
              <div className="j-note">Rank from total points after each snapshot run</div>
            </div>
          ) : null}

          {step === 3 && registered ? (
            <div className="s3">
              <div className="s3-ico"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg></div>
              <div className="s3-title">You're on the list!</div>
              <p className="s3-sub">
                Notification goes to <strong>{registered.user.email}</strong>. The live ticker estimates points between snapshots;{' '}
                <strong>official</strong> totals are written when the snapshot job runs.
              </p>
              <div className="rank-card">
                <div className="rank-n">{waitlistPositionDisplay}</div>
                <div>
                  <div className="rank-lbl">Waitlist position</div>
                  <div className="rank-s">Based on ~{livePtsStep3.toFixed(2)} pts (live est.)</div>
                </div>
              </div>
              <div className="final-card">
                <div className="f-lbl">Points — realtime (live estimate)</div>
                <div className="f-val">{pointsDisplay} pts</div>
                <div className="f-desc">
                  Confirmed at last snapshot: <strong>{serverPointsDisplay} pts</strong>. $SR ({registered.user.latestSrBalance}) + $VVV (
                  {registered.user.latestVvvBalance})
                  {regHasVvv ? ' · ×1.2 when both non-zero' : ''}. Leaderboard uses snapshot totals; this ticker matches sr-popup.html behavior between runs.
                </div>
              </div>
              <div className="snap" style={{ marginBottom: 14, textAlign: 'left' }}><div className="snap-ico">⚡</div><div className="snap-txt"><b>Keep holding.</b> Your standing updates on each snapshot.</div></div>
              <button className="sbtn">Share on X to move up ↗</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
