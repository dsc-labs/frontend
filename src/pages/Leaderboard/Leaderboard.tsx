import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import { DefaultPageSEO } from '../../components/common/PageSEO/PageSEO'
import leaderboardCsv from '../../../leaderboard.csv?raw'
import './Leaderboard.css'

type LeaderboardEntry = {
  rank: number
  name: string
  handle: string
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
  username: string
  name: string
  wallet: string
  total_score: string
  total_posts: string
}

const SNAPSHOT_TOTAL_LIKES = 40431
const SNAPSHOT_TOTAL_COMMENTS = 28719
const SNAPSHOT_TOTAL_RETWEETS = 5732

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

function formatInteger(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

function formatDecimal(value: number, digits = 1) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

const CSV_ROWS = parseCsv(leaderboardCsv)

const SCORED_ROWS = CSV_ROWS.filter((row) => toNumber(row.total_score) > 0)

const LEADERBOARD_ENTRIES: LeaderboardEntry[] = SCORED_ROWS.map((row, index) => ({
  rank: index + 1,
  name: row.name || row.username || 'Unknown',
  handle: row.username ? `@${row.username}` : '-',
  wallet: row.wallet || '-',
  posts: toNumber(row.total_posts),
  score: toNumber(row.total_score),
}))

const trackedUsers = LEADERBOARD_ENTRIES.length
const relevantPosts = LEADERBOARD_ENTRIES.reduce((sum, row) => sum + row.posts, 0)
const totalScore = LEADERBOARD_ENTRIES.reduce((sum, row) => sum + row.score, 0)
const averageScore = trackedUsers > 0 ? totalScore / trackedUsers : 0
const totalEngagement = SNAPSHOT_TOTAL_LIKES + SNAPSHOT_TOTAL_COMMENTS + SNAPSHOT_TOTAL_RETWEETS

const LEADERBOARD_STATS: LeaderboardStat[] = [
  { label: 'Tracked Users', value: formatInteger(trackedUsers) },
  { label: 'Relevant Posts', value: formatInteger(relevantPosts) },
  { label: 'Average Score', value: formatDecimal(averageScore, 1) },
  { label: 'Total Score', value: formatDecimal(totalScore, 1) },
  { label: 'Total Likes', value: formatInteger(SNAPSHOT_TOTAL_LIKES) },
  { label: 'Total Comments', value: formatInteger(SNAPSHOT_TOTAL_COMMENTS) },
  { label: 'Total Retweets', value: formatInteger(SNAPSHOT_TOTAL_RETWEETS) },
  { label: 'Total Engagement', value: formatInteger(totalEngagement), isHighlighted: true },
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
                      <span
                        className="user-avatar"
                        style={{ '--avatar-seed': avatarSeed(entry.name) } as CSSProperties}
                        aria-hidden="true"
                      >
                        {entry.name[0].toUpperCase()}
                      </span>
                      <div className="user-copy">
                        <p className="user-name">{entry.name}</p>
                        <p className="user-handle">{entry.handle}</p>
                      </div>
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
