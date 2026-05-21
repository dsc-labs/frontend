import { useEffect, useState } from 'react'
import Header from '../../components/common/Header/Header'
import { PageSEO } from '../../components/common/PageSEO/PageSEO'
import type {
  Epoch2CheckpointColumn,
  Epoch2LeaderboardApiPayload,
  Epoch2LeaderboardUser,
  Epoch2StatsInput,
} from './mindshareEpoch2Data'
import { epoch2PublishedCheckpointsClient } from './mindshareEpoch2Data'
import { Epoch2LeaderboardTable } from './Epoch2LeaderboardTable'
import { Epoch2StatCards } from './Epoch2StatCards'
import { enrichEpoch2UsersForDisplay } from './epoch2ClientProfileEnrichment'
import './MindshareEpoch2Leaderboard.css'

const EPOCH2_SEO_TITLE = 'Mindshare Challenge — Epoch 2 Leaderboard'
const EPOCH2_SEO_DESCRIPTION =
  'Epoch 2 mindshare leaderboard: participants, engagement, and ranked scores for the StrikeRobot mindshare challenge.'

function leaderboardApiUrl(): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  return `${base}/api/mindshare/test-epoch2-leaderboard`
}

function isEpoch2Payload(x: unknown): x is Epoch2LeaderboardApiPayload {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    o.ok === true &&
    typeof o.generatedAt === 'string' &&
    o.stats !== null &&
    typeof o.stats === 'object' &&
    Array.isArray(o.users) &&
    (o.users as unknown[]).every(
      (u) =>
        u &&
        typeof u === 'object' &&
        typeof (u as Epoch2LeaderboardUser).wallet === 'string' &&
        typeof (u as Epoch2LeaderboardUser).srEligible === 'boolean',
    ) &&
    Array.isArray(o.warnings)
  )
}

type LoadState = 'loading' | 'ready' | 'error'

const MindshareEpoch2Leaderboard = () => {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [stats, setStats] = useState<Epoch2StatsInput | null>(null)
  const [users, setUsers] = useState<Epoch2LeaderboardUser[] | null>(null)
  const [checkpointDays, setCheckpointDays] = useState<Epoch2CheckpointColumn[]>(() =>
    epoch2PublishedCheckpointsClient(),
  )
  const [errorNotice, setErrorNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch(leaderboardApiUrl())
        const ct = res.headers.get('content-type') ?? ''
        if (!ct.includes('application/json')) {
          throw new Error(
            `API returned non-JSON (${ct || 'no Content-Type'}). If you deploy only static files (nginx “dist”), you must proxy ${leaderboardApiUrl()} to a server that runs the API (e.g. Vercel), or use \`npm run dev\` / \`vite preview\` which wire /api in Vite.`,
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
        setUsers(enrichEpoch2UsersForDisplay(json.users))
        setCheckpointDays(
          json.checkpointDays?.length ? json.checkpointDays : epoch2PublishedCheckpointsClient(),
        )
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
      <PageSEO title={EPOCH2_SEO_TITLE} metaDescription={EPOCH2_SEO_DESCRIPTION} path="/mindshare-leaderboard" />
      <Header showSocialIcons />
      <div className="epoch2-lb-container">
        <h1 className="epoch2-lb-sr-only">Epoch 2 Mindshare Leaderboard</h1>
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
            <p className="epoch2-lb-snapshot">
              The Latest Snapshot: <strong>12:00 AM, May 20, 2026</strong>
            </p>
            <Epoch2StatCards stats={stats} />
            {users.length === 0 ? (
              <p className="epoch2-lb-notice" role="status">
                No participants on the leaderboard yet. Scores update on a schedule; check back soon.
              </p>
            ) : (
              <Epoch2LeaderboardTable users={users} stats={stats} checkpointDays={checkpointDays} />
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

export default MindshareEpoch2Leaderboard
