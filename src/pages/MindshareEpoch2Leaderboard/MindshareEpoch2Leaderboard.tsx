import { useEffect, useState } from 'react'
import Header from '../../components/common/Header/Header'
import { PageSEO } from '../../components/common/PageSEO/PageSEO'
import type { Epoch2LeaderboardApiPayload, Epoch2LeaderboardUser, Epoch2StatsInput } from './mindshareEpoch2Data'
import { Epoch2LeaderboardTable } from './Epoch2LeaderboardTable'
import { Epoch2StatCards } from './Epoch2StatCards'
import './MindshareEpoch2Leaderboard.css'

const EPOCH2_SEO_TITLE = 'Mindshare Challenge — Epoch 2 Leaderboard'
const EPOCH2_SEO_DESCRIPTION =
  'Epoch 2 mindshare leaderboard: participants, engagement, and ranked scores for the StrikeRobot mindshare challenge.'

function isEpoch2Payload(x: unknown): x is Epoch2LeaderboardApiPayload {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    o.ok === true &&
    typeof o.generatedAt === 'string' &&
    o.stats !== null &&
    typeof o.stats === 'object' &&
    Array.isArray(o.users) &&
    Array.isArray(o.warnings)
  )
}

type LoadState = 'loading' | 'ready' | 'error'

const MindshareEpoch2Leaderboard = () => {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [stats, setStats] = useState<Epoch2StatsInput | null>(null)
  const [users, setUsers] = useState<Epoch2LeaderboardUser[] | null>(null)
  const [errorNotice, setErrorNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch('/api/mindshare/epoch2-leaderboard')
        const ct = res.headers.get('content-type') ?? ''
        if (!ct.includes('application/json')) {
          throw new Error(
            `API returned non-JSON (${ct || 'no Content-Type'}). Often the dev server moved to another port — use the exact URL Vite prints (e.g. localhost:3001), not a stale bookmark.`,
          )
        }
        const json: unknown = await res.json().catch(() => null)
        if (!res.ok) {
          const errBody =
            json && typeof json === 'object' && 'error' in json
              ? String((json as { error?: unknown }).error ?? '')
              : ''
          throw new Error(`HTTP ${res.status}${errBody ? `: ${errBody}` : ''}`)
        }
        if (!isEpoch2Payload(json)) throw new Error('Response was not a valid leaderboard payload')
        if (cancelled) return
        setStats(json.stats)
        setUsers(json.users)
        setErrorNotice(null)
        setLoadState('ready')
      } catch (e) {
        if (!cancelled) {
          setStats(null)
          setUsers(null)
          const detail = e instanceof Error ? e.message : 'Request failed'
          setErrorNotice(detail)
          setLoadState('error')
          if (import.meta.env.DEV) {
            console.warn('[epoch2 leaderboard]', e)
          }
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mindshare-epoch2-page">
      <PageSEO title={EPOCH2_SEO_TITLE} metaDescription={EPOCH2_SEO_DESCRIPTION} path="/epoch2" />
      <Header showSocialIcons />
      <div className="epoch2-lb-container">
        <h1 className="epoch2-lb-title">MINDSHARE CHALLENGE - EPOCH 2 LEADERBOARD</h1>
        {loadState === 'loading' ? (
          <p className="epoch2-lb-loading" role="status">
            Loading leaderboard…
          </p>
        ) : null}
        {loadState === 'error' && errorNotice ? (
          <p className="epoch2-lb-notice epoch2-lb-notice--error" role="alert">
            Could not load the leaderboard. {errorNotice}
          </p>
        ) : null}
        {loadState === 'ready' && stats !== null && users !== null ? (
          <>
            <Epoch2StatCards stats={stats} />
            <Epoch2LeaderboardTable users={users} stats={stats} />
          </>
        ) : null}
      </div>
    </div>
  )
}

export default MindshareEpoch2Leaderboard
