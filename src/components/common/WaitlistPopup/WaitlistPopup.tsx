import { Fragment, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './WaitlistPopup.css'
import { useEip1193Wallet } from '../../../hooks/useEip1193Wallet'

const MIN_SR = 10000
const MIN_VVV = 5
const BASE_RPC_URL = (import.meta.env.VITE_BASE_RPC_URL as string | undefined)?.trim() || undefined
const WAITLIST_API_BASE = (import.meta.env.VITE_WAITLIST_API_BASE as string | undefined)?.trim() || '/waitlist'
const SR_TOKEN = { address: '0x10c56F005a379f8eAfc88ff5c3f40d30F0031AC9', decimals: 18 } as const
const VVV_TOKEN = { address: '0xacfE6019Ed1A7Dc6f7B508C02d1b04ec88cC21bf', decimals: 18 } as const
const WAITLIST_CAPACITY = 5000
const SNAPSHOT_INTERVAL_MS = 15 * 60 * 1000

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
  /** false = joined via `/test`; snapshots do not add points (see server). */
  accruesPoints?: boolean
}

function userAccruesWaitlistPoints(u: WaitlistUserPayload | null | undefined): boolean {
  return u?.accruesPoints !== false
}

function formatTokenBalance(raw: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals)
  const whole = raw / base
  const fraction = raw % base
  if (fraction === 0n) return whole.toString()
  const fractionStr = fraction.toString().padStart(decimals, '0')
  return `${whole.toString()}.${fractionStr.slice(0, 1)}`
}

/** Same numeric conversion as `lib/waitlistCalculator.rawBalanceToTokenUnits` (register / snapshots). */
function rawBalanceToTokenUnits(raw: bigint, decimals: number): number {
  const base = 10n ** BigInt(decimals)
  const whole = raw / base
  const fraction = raw % base
  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 6)
  const value = Number(`${whole.toString()}.${fractionStr}`)
  return Number.isFinite(value) ? value : 0
}

function formatAmount(value: number, fractionDigits = 2): string {
  const safe = Number.isFinite(value) ? value : 0
  return safe.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
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

function parsedFinite(value: string | number | null | undefined): number {
  const n = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
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

export default function WaitlistPopup({
  onClose,
  useTestRegisterApi = false,
}: {
  onClose?: () => void
  /** When true (`/test` only): call `/register-test` (no point accrual). `/sr-platform` always uses 10k $SR or 5+ $VVV + `/register`. */
  useTestRegisterApi?: boolean
}) {
  const navigate = useNavigate()
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
  const [srUsdPrice, setSrUsdPrice] = useState(0)
  const [vvvUsdPrice, setVvvUsdPrice] = useState(0)
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
      setSrUsdPrice(0)
      setVvvUsdPrice(0)
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
          `${WAITLIST_API_BASE}/status?walletAddress=${encodeURIComponent(address)}&limit=5`,
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
    if (!address) return
    let cancelled = false
    const loadPrices = async () => {
      try {
        const res = await fetch(`${WAITLIST_API_BASE}/prices`)
        const data = (await res.json()) as { ok?: boolean; srUsd?: number; vvvUsd?: number }
        if (!cancelled && res.ok) {
          setSrUsdPrice(Number.isFinite(data.srUsd) ? Number(data.srUsd) : 0)
          setVvvUsdPrice(Number.isFinite(data.vvvUsd) ? Number(data.vvvUsd) : 0)
        }
      } catch {
        if (!cancelled) return
      }
    }
    void loadPrices()
    const id = window.setInterval(() => {
      void loadPrices()
    }, 60_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [address])

  useEffect(() => {
    if (step !== 2 && !(step === 3 && registered)) return
    const id = window.setInterval(() => setLiveTick((n) => n + 1), 2000)
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

  const srBalance =
    srBalanceRaw !== null ? rawBalanceToTokenUnits(srBalanceRaw, SR_TOKEN.decimals) : 0
  const vvvBalance =
    vvvBalanceRaw !== null ? rawBalanceToTokenUnits(vvvBalanceRaw, VVV_TOKEN.decimals) : 0
  const srDisplay = srBalanceRaw !== null ? formatTokenBalance(srBalanceRaw, SR_TOKEN.decimals) : '0'
  const vvvDisplay = vvvBalanceRaw !== null ? formatTokenBalance(vvvBalanceRaw, VVV_TOKEN.decimals) : '0'
  const eligibleSr = srBalance >= MIN_SR
  const eligibleVvvMin = vvvBalance >= MIN_VVV
  const eligible = eligibleSr || eligibleVvvMin
  const vvvRowOk = eligibleVvvMin
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
  const existingSrBal = existingFromServer ? parsedFinite(existingFromServer.user.latestSrBalance) : 0
  const existingVvvBal = existingFromServer ? parsedFinite(existingFromServer.user.latestVvvBalance) : 0
  const existingUsdPerMinLive = existingSrBal * srUsdPrice + existingVvvBal * vvvUsdPrice
  const existingLastSnapMs =
    isExistingWallet && existingFromServer?.user.lastSnapshotAt
      ? Date.parse(existingFromServer.user.lastSnapshotAt)
      : Number.NaN
  const existingMinutesSinceSnapshot =
    Number.isFinite(existingLastSnapMs) ? Math.max(0, (nowMs - existingLastSnapMs) / 60_000) : 0
  const livePtsStep2 =
    isExistingWallet && existingFromServer
      ? userAccruesWaitlistPoints(existingFromServer.user)
        ? existingFromServer.user.cumulativePoints + existingUsdPerMinLive * existingMinutesSinceSnapshot
        : 0
      : useTestRegisterApi
        ? 0
        : !eligible
          ? 0
          : (srBalance * srUsdPrice + vvvBalance * vvvUsdPrice) *
            Math.max(0, (nowMs - currentSnapshotStartMsFromNow(nowMs)) / 60_000)
  const usdPerMinPreview = srBalance * srUsdPrice + vvvBalance * vvvUsdPrice
  const usdPerMinServer =
    isExistingWallet && existingFromServer
      ? existingUsdPerMinLive
      : usdPerMinPreview
  const displayUsdPerMin = isExistingWallet && existingFromServer ? usdPerMinServer : usdPerMinPreview
  /** Step 2 card: no “accrual” preview until wallet meets join rules (new wallets only). */
  const displayUsdPerMinCard =
    isExistingWallet && existingFromServer ? displayUsdPerMin : eligible ? usdPerMinPreview : 0
  const showX12BonusPill = eligible && srBalance > 0 && vvvBalance > 0
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
      const registerUrl = useTestRegisterApi
        ? `${WAITLIST_API_BASE}/register-test`
        : `${WAITLIST_API_BASE}/register`
      const res = await fetch(registerUrl, {
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
        `${WAITLIST_API_BASE}/status?walletAddress=${encodeURIComponent(address)}&limit=5`,
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
  const regSrBal = parsedFinite(registered?.user.latestSrBalance)
  const regVvvBal = parsedFinite(registered?.user.latestVvvBalance)
  const regPerMinute = regSrBal * srUsdPrice + regVvvBal * vvvUsdPrice
  const regLastSnapMs = registered?.user.lastSnapshotAt ? Date.parse(registered.user.lastSnapshotAt) : Number.NaN
  const regMinutesSinceSnapshot = Number.isFinite(regLastSnapMs) ? Math.max(0, (Date.now() - regLastSnapMs) / 60_000) : 0
  const regAccrues = registered ? userAccruesWaitlistPoints(registered.user) : true
  const livePtsStep3 =
    registered && regAccrues ? serverPoints + regPerMinute * regMinutesSinceSnapshot : registered ? 0 : 0
  const waitlistPositionDisplay = !regAccrues
    ? '—'
    : serverRank != null
      ? `#${serverRank}`
      : `#${displayWaitlistSlot(livePtsStep3, address)}`
  const pointsDisplay = livePtsStep3.toFixed(4)
  const serverPointsDisplay = serverPoints.toFixed(4)

  return (
    <div className="wp-overlay" onClick={() => onClose?.()}>
      <div className="pop" onClick={(e) => e.stopPropagation()}>
        <div className="ph">
          <div className="logo">SR PLATFORM WAITLIST</div>
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
                {allowVvvMinimumEligible ? (
                  <>
                    Connect your wallet to verify your <strong>$SR</strong> and <strong>$VVV</strong> holdings. You qualify
                    with at least <strong>10,000 $SR</strong> or <strong>5 $VVV</strong>. Hold both tokens to earn a{' '}
                    <strong>×1.2 points multiplier</strong>.
                  </>
                ) : (
                  <>
                    Connect your wallet to verify your <strong>$SR</strong> and <strong>$VVV</strong> holdings. Minimum{' '}
                    <strong>10,000 $SR</strong> to qualify. Hold both tokens to earn a{' '}
                    <strong>×1.2 points multiplier</strong>.
                  </>
                )}
              </p>
              <button className="cwb" onClick={() => void connect()} disabled={!hasProvider} title={!hasProvider ? 'No EIP-1193 wallet in this browser' : undefined}>
                <div className="cwb-ico"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><rect x="1" y="4" width="22" height="16" rx="2" /><path d="M1 10h22" /><circle cx="17" cy="15" r="1.5" fill="#fff" stroke="none" /></svg></div>
                Connect Wallet
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
                </div>
                <button className="disc" onClick={() => { disconnect(); setStep(1) }}>Disconnect</button>
              </div>

              <div className="tgrid">
                <div className="tc">
                  <div className="tc-head"><span className="tag sr">$SR</span><span className="tc-lbl">Balance</span></div>
                  <div className={`tc-val ${eligibleSr ? 'ok' : 'bad'}`}>{tokenBusy ? '...' : srDisplay}</div>
                  <div className="tc-usd">
                    {tokenBusy
                      ? 'Checking...'
                      : tokenError
                        ? 'Balance unavailable'
                        : `≈ $${formatAmount(srBalance * srUsdPrice)}`}
                  </div>
                </div>
                <div className="tc">
                  <div className="tc-head"><span className="tag vvv">$VVV</span><span className="tc-lbl">Balance</span></div>
                  <div className={`tc-val ${vvvRowOk ? 'ok' : 'bad'}`}>{tokenBusy ? '...' : vvvDisplay}</div>
                  <div className="tc-usd">
                    {tokenBusy
                      ? 'Checking...'
                      : tokenError
                        ? 'Balance unavailable'
                        : `≈ $${formatAmount(vvvBalance * vvvUsdPrice)}`}
                  </div>
                </div>
              </div>

              {isExistingWallet && existingFromServer ? (
                <p className="p-expl" style={{ marginBottom: 10 }}>
                  <span className="p-expl-strong">
                    {userAccruesWaitlistPoints(existingFromServer.user) ? (
                      <>
                        Confirmed: {existingFromServer.user.cumulativePoints.toFixed(4)} pts
                        {existingFromServer.rank != null ? ` · Rank #${existingFromServer.rank}` : ''}
                      </>
                    ) : (
                      <>
                        /test signup: listed with <strong>no point accrual</strong>. Complete signup on{' '}
                        <strong>/sr-platform</strong> (10,000 $SR) for ranked points.
                      </>
                    )}
                  </span>
                </p>
              ) : (
                <p className="p-expl" style={{ marginBottom: 10 }}>
                  <span className="p-expl-muted">
                    Live preview uses current SR/VVV prices from snapshots (Dexscreener with cached fallback), refreshed every minute.
                    After you join, the server also records balances for snapshot scoring.
                  </span>
                </p>
              )}

              <div className="pcard">
                <div className="pcard-top">
                  <span className="p-lbl">Points — realtime</span>
                  <span className={`bonus-pill${showX12BonusPill ? ' show' : ''}`}>⚡ ×1.2 bonus</span>
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
                    {displayUsdPerMinCard.toFixed(2)}/min
                  </div>
                </div>
              </div>
              {useTestRegisterApi && !isExistingWallet ? (
                <p className="p-expl-muted" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
                  Realtime points stay at 0 on /test; only <strong>/sr-platform</strong> signups accrue waitlist points.
                </p>
              ) : null}

              <div className={`req ${eligible ? 'ok' : 'bad'}`}>
                {allowVvvMinimumEligible
                  ? eligible
                    ? eligibleSr && eligibleVvvMin
                      ? '✓ Eligible — 10,000 $SR minimum met and 5 $VVV minimum met'
                      : eligibleSr
                        ? '✓ Eligible — 10,000 $SR minimum met'
                        : '✓ Eligible — 5 $VVV minimum met'
                    : '✕ Not eligible — need at least 10,000 $SR or 5 $VVV'
                  : eligible
                    ? '✓ Eligible — 10,000 $SR minimum met'
                    : '✕ Not eligible — need at least 10,000 $SR'}
              </div>
              <div className="snap">
                <div className="snap-ico">⚡</div>
                <div className="snap-txt">
                  <b>Snapshots.</b>{' '}
                  {allowVvvMinimumEligible ? (
                    <>
                      Hold at least <b>10,000 $SR</b> or <b>5 $VVV</b> — dropping below both minima on a snapshot may yield
                      no points for that interval.
                    </>
                  ) : (
                    <>
                      Hold at least <b>10,000 $SR</b> — dropping below on a snapshot may yield no points for that interval.
                    </>
                  )}
                </div>
              </div>
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
            </div>
          ) : null}

          {step === 3 && registered ? (
            <div className="s3">
              <div className="s3-ico"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg></div>
              <div className="s3-title">You're on the list!</div>
              <div className="rank-card">
                <div className="rank-n">{waitlistPositionDisplay}</div>
                <div>
                  <div className="rank-lbl">Waitlist position</div>
                  <div className="rank-s">
                    {regAccrues
                      ? `Based on ~${livePtsStep3.toFixed(2)} pts (live est.)`
                      : 'Ranked points apply to /sr-platform signups only.'}
                  </div>
                </div>
              </div>
              <div className="final-card">
                <div className="f-lbl">Points — realtime (live estimate)</div>
                <div className="f-val">{pointsDisplay} pts</div>
                <div className="f-desc">
                  {regAccrues ? (
                    <>
                      Confirmed at last snapshot: <strong>{serverPointsDisplay} pts</strong>.
                    </>
                  ) : (
                    <>
                      <strong>/test</strong> signup: balances refresh on snapshots, but <strong>cumulative waitlist points stay 0</strong>.
                      Join from <strong>/sr-platform</strong> (10,000 $SR) to accrue points.
                    </>
                  )}
                </div>
              </div>
              <div className="snap" style={{ marginBottom: 14, textAlign: 'left' }}>
                <div className="snap-ico">⚡</div>
                <div className="snap-txt">
                  {regAccrues ? (
                    <>
                      <b>Keep holding.</b> Your standing updates on each snapshot.
                    </>
                  ) : (
                    <>
                      <b>Test route.</b> No waitlist point accrual here — use <b>/sr-platform</b> for the public leaderboard.
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="sbtn"
                onClick={() => {
                  onClose?.()
                  navigate('/mindshare-challenge')
                }}
              >
                Join Mindshare Challenge to Move up ↗
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
