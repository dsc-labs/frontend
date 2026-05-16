import { useEffect, useMemo, useState } from 'react'
import type { Epoch2LeaderboardUser, Epoch2StatsInput } from './mindshareEpoch2Data'
import { EPOCH2_PAGE_SIZE } from './mindshareEpoch2Data'
import UserAvatar, { xProfileUrl } from '../../components/UserAvatar/UserAvatar'
import { formatComma, formatShortWallet, getRankedUsers } from './mindshareEpoch2Format'
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

function Epoch2StatusCell({ eligible }: { eligible: boolean }) {
  if (eligible) {
    return (
      <span className="epoch2-status-pill epoch2-status-pill--eligible">
        <span className="epoch2-status-dot" aria-hidden />
        Eligible
      </span>
    )
  }
  return (
    <span className="epoch2-status-pill epoch2-status-pill--ineligible">
      <span className="epoch2-status-dot" aria-hidden />
      Not eligible
    </span>
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
        <div className="epoch2-col-posts">Post Count</div>
        <div className="epoch2-col-score">Score</div>
        <div className="epoch2-col-status">Status</div>
      </div>

      <div className="epoch2-table-body">
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
              <div className="epoch2-post-count">{formatComma(u.postCount)}</div>
              <div className="epoch2-score">{formatComma(u.score)}</div>
              <div className="epoch2-status-cell">
                <Epoch2StatusCell eligible={u.srEligible} />
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
  )
}
