import { useState } from 'react'
import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import { DefaultPageSEO } from '../../components/common/PageSEO/PageSEO'
import LeaderboardConnectBar from '../../components/Leaderboard/LeaderboardConnectBar'
import leaderboardCsv from '../../../leaderboard_export.csv?raw'
import './Leaderboard.css'

type LeaderboardEntry = {
  rank: number
  username: string
  /** Profile image URL from CSV (`avatar` column); when empty, `/api/avatar` is used. */
  avatarUrl?: string
  wallet: string
  posts: number
  score: number
}

type LeaderboardStat = {
  label: string
  value: string
  isHighlighted?: boolean
}

type CsvRow = {
  rank?: string
  username: string
  name?: string
  avatar?: string
  wallet?: string
  score?: string
  total_score?: string
  posts?: string
  total_posts?: string
}

const SNAPSHOT_TRACKED_USERS = '439'
const SNAPSHOT_RELEVANT_POSTS = '1,723'
const SNAPSHOT_AVERAGE_SCORE = '4.1'
const SNAPSHOT_TOTAL_SCORE = '6,986.8'
const SNAPSHOT_TOTAL_LIKES = '40,394'
const SNAPSHOT_TOTAL_COMMENTS = '28,615'
const SNAPSHOT_TOTAL_RETWEETS = '5,705'
const SNAPSHOT_TOTAL_ENGAGEMENT = '74,714'

function parseCsvLine(line: string) {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      const nextChar = line[i + 1]
      if (inQuotes && nextChar === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }
    current += char
  }
  values.push(current)
  return values
}

function parseCsv(rawCsv: string): CsvRow[] {
  const lines = rawCsv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const row = Object.fromEntries(headers.map((header, idx) => [header, values[idx] ?? '']))
    return row as CsvRow
  })
}

function toNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const CSV_ROWS = parseCsv(leaderboardCsv)

function getPosts(row: CsvRow) {
  return toNumber(row.posts ?? row.total_posts ?? '0')
}

function getScore(row: CsvRow) {
  return toNumber(row.score ?? row.total_score ?? '0')
}

const SCORED_ROWS = CSV_ROWS.filter((row) => getScore(row) > 0)

const LEADERBOARD_ENTRIES: LeaderboardEntry[] = SCORED_ROWS.map((row, index) => {
  const avatar = row.avatar?.trim()
  return {
    rank: index + 1,
    username: row.username || 'unknown',
    ...(avatar ? { avatarUrl: avatar } : {}),
    wallet: row.wallet || '-',
    posts: getPosts(row),
    score: getScore(row),
  }
})

const LEADERBOARD_STATS: LeaderboardStat[] = [
  { label: 'Tracked Users', value: SNAPSHOT_TRACKED_USERS },
  { label: 'Relevant Posts', value: SNAPSHOT_RELEVANT_POSTS },
  { label: 'Average Score', value: SNAPSHOT_AVERAGE_SCORE },
  { label: 'Total Score', value: SNAPSHOT_TOTAL_SCORE },
  { label: 'Total Likes', value: SNAPSHOT_TOTAL_LIKES },
  { label: 'Total Comments', value: SNAPSHOT_TOTAL_COMMENTS },
  { label: 'Total Retweets', value: SNAPSHOT_TOTAL_RETWEETS },
  { label: 'Total Engagement', value: SNAPSHOT_TOTAL_ENGAGEMENT, isHighlighted: true },
]

function rankLabel(rank: number) {
  if (rank === 1) return '1st'
  if (rank === 2) return '2nd'
  if (rank === 3) return '3rd'
  return `${rank}`
}

function averageByPosts(score: number, posts: number) {
  if (posts === 0) return '0.0'
  return (score / posts).toFixed(1)
}

function avatarSeed(name: string) {
  return Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0)
}

function xProfileUrl(username: string) {
  const handle = username.startsWith('@') ? username.slice(1) : username
  return `https://x.com/${encodeURIComponent(handle)}`
}

function avatarProxyUrl(username: string) {
  const handle = username.startsWith('@') ? username.slice(1) : username
  return `/api/avatar?username=${encodeURIComponent(handle)}`
}

type AvatarLoadMode = 'csv' | 'api' | 'fallback'

function UserAvatar({ username, csvAvatarUrl }: { username: string; csvAvatarUrl?: string }) {
  const trimmedCsv = csvAvatarUrl?.trim() ?? ''
  const [mode, setMode] = useState<AvatarLoadMode>(() => (trimmedCsv ? 'csv' : 'api'))

  if (mode === 'fallback') {
    return (
      <span
        className="user-avatar user-avatar--fallback"
        style={{ '--avatar-seed': avatarSeed(username) } as CSSProperties}
        aria-hidden="true"
      >
        {username[0]?.toUpperCase() ?? 'U'}
      </span>
    )
  }

  const src = mode === 'csv' && trimmedCsv ? trimmedCsv : avatarProxyUrl(username)

  return (
    <img
      key={src}
      src={src}
      alt=""
      className="user-avatar user-avatar-img"
      width={30}
      height={30}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (mode === 'csv' && trimmedCsv) {
          setMode('api')
        } else {
          setMode('fallback')
        }
      }}
    />
  )
}

const Leaderboard = () => {
  return (
    <div className="leaderboard-page">
      <DefaultPageSEO path="/leaderboard" />
      <motion.div
        className="leaderboard-shell"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <LeaderboardConnectBar />
        <section className="leaderboard-stats" aria-label="Leaderboard summary metrics">
          {LEADERBOARD_STATS.map((stat) => (
            <article
              key={stat.label}
              className={`leaderboard-stat-card ${stat.isHighlighted ? 'is-highlighted' : ''}`}
            >
              <p className="leaderboard-stat-label">{stat.label}</p>
              <p className="leaderboard-stat-value">{stat.value}</p>
            </article>
          ))}
        </section>

        <div className="leaderboard-table-wrap">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>User</th>
                <th>Wallet</th>
                <th className="is-right">Posts</th>
                <th className="is-right">Score</th>
                <th className="is-right">Avg</th>
              </tr>
            </thead>
            <tbody>
              {LEADERBOARD_ENTRIES.map((entry) => (
                <tr key={entry.rank}>
                  <td>
                    <span className={`rank-value rank-${entry.rank}`}>{rankLabel(entry.rank)}</span>
                  </td>
                  <td>
                    <div className="user-cell">
                      <a
                        href={xProfileUrl(entry.username)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="user-x-link"
                        aria-label={`@${entry.username} on X`}
                      >
                        <UserAvatar username={entry.username} csvAvatarUrl={entry.avatarUrl} />
                        <span className="user-name">{entry.username}</span>
                      </a>
                    </div>
                  </td>
                  <td className="wallet-cell">{entry.wallet}</td>
                  <td className="is-right">{entry.posts}</td>
                  <td className="is-right score-cell">{entry.score.toFixed(1)}</td>
                  <td className="is-right">{averageByPosts(entry.score, entry.posts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}

export default Leaderboard
