import { useEffect, useMemo, useState } from 'react'
import type { Epoch2CheckpointColumn, Epoch2LeaderboardUser, Epoch2StatsInput } from './mindshareEpoch2Data'
import { EPOCH2_PAGE_SIZE } from './mindshareEpoch2Data'
import UserAvatar, { xProfileUrl } from '../../components/UserAvatar/UserAvatar'
import { filterEpoch2Users, formatComma, formatShortWallet, getRankedUsers } from './mindshareEpoch2Format'
import '../../components/UserAvatar/UserAvatar.css'

function Epoch2RankCell({ rank }: { rank: number }) {
  if (rank <= 3) {
    const tier =
      rank === 1 ? 'epoch2-rank-badge--gold' : rank === 2 ? 'epoch2-rank-badge--silver' : 'epoch2-rank-badge--bronze'
    return (
      <div className="epoch2-rank">
        <div className={`epoch2-rank-badge ${tier}`} aria-label={`Rank ${rank}`}>
          🏆
        </div>
      </div>
    )
  }
  return (
    <div className="epoch2-rank">
      <div className="epoch2-rank-number">{rank}</div>
    </div>
  )
}

function defaultCheckpoints(len: number): boolean[] {
  return Array.from({ length: len }, () => false)
}

function Epoch2Checkpoints({
  checkpoints,
  checkpointDays,
}: {
  checkpoints: boolean[]
  checkpointDays: Epoch2CheckpointColumn[]
}) {
  const days =
    checkpoints.length === checkpointDays.length
      ? checkpoints
      : defaultCheckpoints(checkpointDays.length)
  return (
    <div className="epoch2-checkpoints" role="list" aria-label="Daily SR eligibility checkpoints">
      {checkpointDays.map((cp, i) => {
        const passed = days[i] ?? false
        return (
          <span
            key={cp.dayKey}
            className={`epoch2-checkpoint${passed ? ' epoch2-checkpoint--passed' : ''}`}
            role="listitem"
            tabIndex={0}
            aria-label={`${cp.dateLabel}: ${passed ? 'eligible' : 'not eligible'}`}
          >
            <span className="epoch2-checkpoint-tooltip" role="tooltip">
              {cp.dateLabel}
            </span>
            {passed ? (
              <svg viewBox="0 0 12 12" fill="none" aria-hidden>
                <path
                  d="M2.5 6.2 4.8 8.5 9.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </span>
        )
      })}
    </div>
  )
}

type Epoch2LeaderboardTableProps = {
  users: Epoch2LeaderboardUser[]
  stats: Epoch2StatsInput
  checkpointDays: Epoch2CheckpointColumn[]
  pageSize?: number
}

export function Epoch2LeaderboardTable({
  users,
  stats,
  checkpointDays,
  pageSize = EPOCH2_PAGE_SIZE,
}: Epoch2LeaderboardTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = useMemo(() => filterEpoch2Users(users, searchQuery), [users, searchQuery])
  const ranked = useMemo(() => getRankedUsers(filtered), [filtered])

  const totalPages = Math.max(1, Math.ceil(ranked.length / pageSize))

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages))
  }, [totalPages])
  const safePage = Math.min(Math.max(1, currentPage), totalPages)
  const start = (safePage - 1) * pageSize
  const pageUsers = ranked.slice(start, start + pageSize)

  const totalCount = stats.totalParticipants || users.length
  const isSearching = searchQuery.trim().length > 0
  const footerLabel = isSearching
    ? `${formatComma(ranked.length)} match${ranked.length === 1 ? '' : 'es'} · showing ${pageUsers.length} on this page`
    : `Showing ${pageUsers.length} of ${formatComma(totalCount)} competitors`

  return (
    <div className="epoch2-leaderboard-wrap">
      <div className="epoch2-search-row">
        <label className="epoch2-search-label" htmlFor="epoch2-leaderboard-search">
          Find
        </label>
        <input
          id="epoch2-leaderboard-search"
          type="search"
          className="epoch2-search-input"
          placeholder="Handle, name, or wallet…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {isSearching ? (
          <button type="button" className="epoch2-search-clear" onClick={() => setSearchQuery('')}>
            Clear
          </button>
        ) : null}
      </div>
      <div className="epoch2-leaderboard">
      <div className="epoch2-table-header">
        <div>Rank</div>
        <div>User</div>
        <div className="epoch2-col-wallet">Wallet</div>
        <div className="epoch2-col-score">Score</div>
        <div className="epoch2-col-status">Eligible</div>
      </div>

      <div className="epoch2-table-body">
        {ranked.length === 0 ? (
          <p className="epoch2-table-empty" role="status">
            {isSearching ? 'No competitors match your search.' : 'No participants to show.'}
          </p>
        ) : null}
        {pageUsers.map((u) => {
          const handle = u.xHandle || u.username
          return (
            <div key={`${u.rank}-${u.wallet}`} className="epoch2-table-row">
              <Epoch2RankCell rank={u.rank} />
              <div className="epoch2-user-cell">
                <a
                  href={xProfileUrl(handle)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="user-x-link"
                  aria-label={`@${handle} on X`}
                >
                  <UserAvatar username={handle} csvAvatarUrl={u.avatarUrl} size={34} />
                  <span className="epoch2-user-labels">
                    <span className="user-name">@{handle}</span>
                    {u.displayName && u.displayName !== handle ? (
                      <span className="epoch2-user-display-name">{u.displayName}</span>
                    ) : null}
                  </span>
                </a>
              </div>
              <div className="epoch2-wallet" title={u.wallet}>
                {formatShortWallet(u.wallet, 4, 4)}
              </div>
              <div className="epoch2-score">{formatComma(u.score)}</div>
              <div className="epoch2-status-cell">
                <Epoch2Checkpoints checkpoints={u.checkpoints ?? []} checkpointDays={checkpointDays} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="epoch2-table-footer">
        <div className="epoch2-footer-info">{footerLabel}</div>
        <div className="epoch2-pagination">
          <button
            type="button"
            className="epoch2-page-btn"
            aria-label="Previous page"
            disabled={safePage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            className="epoch2-page-btn"
            aria-label="Next page"
            disabled={safePage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
    </div>
  )
}
