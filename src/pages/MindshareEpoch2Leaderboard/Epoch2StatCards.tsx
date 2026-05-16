import type { Epoch2StatsInput } from './mindshareEpoch2Data'
import { formatComma, formatNumber } from './mindshareEpoch2Format'

type Epoch2StatCardsProps = {
  stats: Epoch2StatsInput
}

export function Epoch2StatCards({ stats }: Epoch2StatCardsProps) {
  const totalEngagement = stats.totalLikes + stats.totalComments + stats.totalRetweets

  const row1: { label: string; value: string; highlight?: boolean }[] = [
    { label: 'Total Participants', value: formatComma(stats.totalParticipants) },
    { label: 'Total Mindshare Posts', value: formatComma(stats.totalMindsharePosts) },
    { label: 'Total Score', value: formatNumber(stats.totalScore) },
    { label: 'Days Remaining', value: `${stats.daysRemaining}d`, highlight: true },
  ]

  const row2: { label: string; value: string }[] = [
    { label: 'Total Likes', value: formatNumber(stats.totalLikes) },
    { label: 'Total Comments', value: formatComma(stats.totalComments) },
    { label: 'Total Retweets', value: formatComma(stats.totalRetweets) },
    { label: 'Total Engagement', value: formatNumber(totalEngagement) },
  ]

  const row3: { label: string; value: string }[] = [
    { label: 'SR Eligible', value: formatComma(stats.eligibleParticipants ?? 0) },
    { label: 'Not SR Eligible', value: formatComma(stats.notEligibleParticipants ?? 0) },
  ]

  return (
    <>
      <div className="epoch2-stats-grid">
        {row1.map((c) => (
          <div key={c.label} className={`epoch2-stat-card${c.highlight ? ' epoch2-stat-card--highlight' : ''}`}>
            <div className="epoch2-stat-label">{c.label}</div>
            <div className="epoch2-stat-value">{c.value}</div>
          </div>
        ))}
      </div>
      <div className="epoch2-stats-grid">
        {row2.map((c) => (
          <div key={c.label} className="epoch2-stat-card">
            <div className="epoch2-stat-label">{c.label}</div>
            <div className="epoch2-stat-value">{c.value}</div>
          </div>
        ))}
      </div>
      <div className="epoch2-stats-grid epoch2-stats-grid--sr">
        {row3.map((c) => (
          <div key={c.label} className="epoch2-stat-card">
            <div className="epoch2-stat-label">{c.label}</div>
            <div className="epoch2-stat-value">{c.value}</div>
          </div>
        ))}
      </div>
    </>
  )
}
