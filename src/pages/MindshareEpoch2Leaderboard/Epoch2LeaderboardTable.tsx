import { useEffect, useMemo, useState } from 'react'
import type { Epoch2LeaderboardUser, Epoch2StatsInput } from './mindshareEpoch2Data'
import { EPOCH2_PAGE_SIZE } from './mindshareEpoch2Data'
import { formatComma, formatShortWallet, getRankedUsers } from './mindshareEpoch2Format'

const avatarSvg = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
)

function Epoch2RankCell({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <div className="epoch2-rank">
        <div className="epoch2-rank-badge epoch2-rank-badge--gold">🏆</div>
      </div>
    )
  if (rank === 2)
    return (
      <div className="epoch2-rank">
        <div className="epoch2-rank-badge epoch2-rank-badge--silver">🏆</div>
      </div>
    )
  if (rank === 3)
    return (
      <div className="epoch2-rank">
        <div className="epoch2-rank-badge epoch2-rank-badge--bronze">🏆</div>
      </div>
    )
  return (
    <div className="epoch2-rank">
      <div className="epoch2-rank-number">{rank}</div>
    </div>
  )
}

type Epoch2LeaderboardTableProps = {
  users: Epoch2LeaderboardUser[]
  stats: Epoch2StatsInput
  pageSize?: number
}

export function Epoch2LeaderboardTable({ users, stats, pageSize = EPOCH2_PAGE_SIZE }: Epoch2LeaderboardTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const ranked = useMemo(() => getRankedUsers(users), [users])

  const totalPages = Math.max(1, Math.ceil(ranked.length / pageSize))

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages))
  }, [totalPages])
  const safePage = Math.min(Math.max(1, currentPage), totalPages)
  const start = (safePage - 1) * pageSize
  const pageUsers = ranked.slice(start, start + pageSize)

  const totalCount = stats.totalParticipants || ranked.length
  const footerLabel = `Showing ${pageUsers.length} of ${formatComma(totalCount)} competitors`

  return (
    <div className="epoch2-leaderboard">
      <div className="epoch2-table-header">
        <div>Rank</div>
        <div>User</div>
        <div className="epoch2-col-wallet">Wallet</div>
        <div className="epoch2-col-sr">SR</div>
        <div className="epoch2-col-posts">Post Count</div>
        <div className="epoch2-col-score">Score</div>
      </div>

      <div>
        {pageUsers.map((u) => (
          <div key={`${u.rank}-${u.wallet}`} className="epoch2-table-row">
            <Epoch2RankCell rank={u.rank} />
            <div className="epoch2-user-cell">
              <div className="epoch2-avatar">{avatarSvg}</div>
              <div className="epoch2-username">{u.username}</div>
            </div>
            <div className="epoch2-wallet" title={u.wallet}>
              {formatShortWallet(u.wallet)}
            </div>
            <div
              className={`epoch2-sr-badge${u.srEligible ? ' epoch2-sr-badge--yes' : ' epoch2-sr-badge--no'}`}
            >
              {u.srEligible ? 'Eligible' : 'Not eligible'}
            </div>
            <div className="epoch2-post-count">{formatComma(u.postCount)}</div>
            <div className="epoch2-score">{formatComma(u.score)}</div>
          </div>
        ))}
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
  )
}
