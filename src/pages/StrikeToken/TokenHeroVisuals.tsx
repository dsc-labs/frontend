import { formatCompactTokenAmount } from './tokenFormat'
import type { TokenOverviewResponse } from '../../../lib/tokenOverviewTypes'
import type { TokenLoad } from './useTokenOverview'

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
  return (
    <div className="strike-token__hero-visual strike-token__hero-visual--burn" aria-label="Token burn status">
      <div className="strike-token__hero-visual-top"><span>Burn activity</span><span>Not yet verified</span></div>
      <div className="strike-token__hero-burn-total"><span>Total burned</span><strong>—</strong><p>An official burn rule is needed before publishing a total.</p></div>
      <div className="strike-token__hero-visual-divider" />
      <div className="strike-token__hero-visual-caption strike-token__hero-visual-caption--chart"><span>On-chain burn records</span><span>Awaiting confirmation</span></div>
      <div className="strike-token__hero-history-empty strike-token__hero-history-empty--burn"><span>No verified burn history is available yet.</span></div>
      <div className="strike-token__hero-burn-latest">
        <div><span>Burn mechanism</span><strong>Not yet confirmed</strong></div>
        <div><span>Event feed</span><strong>Unavailable</strong></div>
      </div>
    </div>
  )
}
