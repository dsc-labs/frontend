import { BURN_PAGE_PREVIEW } from './tokenPreviewData'
import { formatCompactTokenAmount, formatPercent, formatTokenAmount, formatUtcDate } from './tokenFormat'
import type { TokenOverviewResponse } from '../../../lib/tokenOverviewTypes'
import type { TokenLoad } from './useTokenOverview'

function PreviewLine({ points: data, variant }: { points: { timestamp: string; value: string }[]; variant: 'supply' | 'burn' }) {
  const numbers = data.map((point) => Number(point.value))
  const times = data.map((point) => Date.parse(point.timestamp))
  const low = Math.min(...numbers)
  const high = Math.max(...numbers)
  const spread = high - low || 1
  const timeSpan = times[times.length - 1] - times[0] || 1
  const points = numbers.map((value, index) => {
    const x = 6 + ((times[index] - times[0]) / timeSpan) * 508
    const y = 116 - ((value - low) / spread) * 92
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const lastY = 116 - ((numbers[numbers.length - 1] - low) / spread) * 92

  return (
    <svg className={`strike-token__hero-chart is-${variant}`} viewBox="0 0 520 140" preserveAspectRatio="none" role="img" aria-label={variant === 'supply' ? 'Current supply decreases across preview history' : 'Cumulative burned supply increases across preview history'}>
      <line x1="6" y1="24" x2="514" y2="24" />
      <line x1="6" y1="70" x2="514" y2="70" />
      <line x1="6" y1="116" x2="514" y2="116" />
      <polyline points={points} />
      <circle cx="514" cy={lastY} r="4" />
    </svg>
  )
}

export function TokenSupplyHeroVisual({ data, state }: { data: TokenOverviewResponse | null; state: TokenLoad['state'] }) {
  const live = state === 'live' && data !== null ? data : null

  return (
    <div className={`strike-token__hero-visual${state === 'loading' ? ' strike-token__loading' : ''}`} aria-label="Token supply" aria-live="polite">
      <div className="strike-token__hero-visual-top"><span>Token supply</span><span>{live ? 'On-chain data' : state === 'loading' ? 'Loading…' : 'Unavailable'}</span></div>
      <div className="strike-token__hero-visual-main">
        <div><strong>{live ? formatCompactTokenAmount(live.supply.totalSupply) : '—'} {live && <small>SR</small>}</strong><span>Current total supply</span></div>
        <dl>
          <div><dt>Initial supply</dt><dd>—</dd></div>
          <div><dt>Circulating</dt><dd>—</dd></div>
          <div><dt>Total burned</dt><dd>—</dd></div>
        </dl>
      </div>
      <div className="strike-token__hero-visual-divider" />
      <div className="strike-token__hero-visual-caption"><span>Supply allocation</span><span>Not yet verified</span></div>
      <div className="strike-token__hero-unverified">
        <span>—</span><p>Official wallet classification is needed to show allocation.</p>
      </div>
      <div className="strike-token__hero-visual-caption strike-token__hero-visual-caption--chart"><span>Supply history</span><span>Not yet indexed</span></div>
      <div className="strike-token__hero-history-empty">
        <span>Historical snapshots are not available yet.</span>
      </div>
      <div className="strike-token__hero-chart-axis"><span>{live ? `Block ${live.indexedBlock.toLocaleString('en-US')}` : 'Base Mainnet'}</span><span>{live ? 'Latest verified read' : 'No snapshot'}</span></div>
    </div>
  )
}

export function TokenBurnHeroVisual() {
  const { summary, activity, events } = BURN_PAGE_PREVIEW
  const latest = events[0]

  return (
    <div className="strike-token__hero-visual strike-token__hero-visual--burn" aria-label="Token burn preview">
      <div className="strike-token__hero-visual-top"><span>Burn activity</span><span>Preview data</span></div>
      <div className="strike-token__hero-burn-total"><span>Total burned</span><strong>{formatCompactTokenAmount(summary.totalBurned)} <small>SR</small></strong><p>{formatPercent(summary.burnedPercentage)} of initial preview supply</p></div>
      <div className="strike-token__hero-visual-divider" />
      <div className="strike-token__hero-visual-caption strike-token__hero-visual-caption--chart"><span>Cumulative burns</span><span>Preview history</span></div>
      <PreviewLine points={activity.map((point) => ({ timestamp: point.timestamp, value: point.cumulativeBurned }))} variant="burn" />
      <div className="strike-token__hero-chart-axis"><span>{activity[0].label}</span><span>{activity[activity.length - 1].label}</span></div>
      <div className="strike-token__hero-burn-latest">
        <div><span>Latest preview event</span><strong>{formatUtcDate(latest.timestamp)}</strong></div>
        <div><span>Amount</span><strong>{formatTokenAmount(latest.amount)} SR</strong></div>
      </div>
    </div>
  )
}
