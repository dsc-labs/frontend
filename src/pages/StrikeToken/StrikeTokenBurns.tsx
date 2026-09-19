import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fadeUp } from '../../strike/components/animations/fadeUp'
import { staggerContainerFast, staggerItem } from '../../strike/components/animations/stagger'
import { ROUTES } from '../../strike/lib/navigate'
import { BurnActivityChart } from './TokenCharts'
import { filterBurnEvents, historyWithinDays, historyWithinYear } from './tokenChartData'
import { TokenPageShell } from './TokenPageShell'
import { formatCompactTokenAmount, formatPercent, formatTokenAmount, formatUtcDate, shortenHex } from './tokenFormat'
import { BURN_PAGE_PREVIEW } from './tokenPreviewData'
import type { BurnRange, BurnType } from './tokenTypes'

const preview = BURN_PAGE_PREVIEW

const burnTypeLabels: Record<BurnType, string> = {
  'protocol-buyback': 'Protocol Buyback',
  'scheduled-reduction': 'Scheduled Supply Reduction',
}

const filters: readonly { value: 'all' | BurnType; label: string }[] = [
  { value: 'all', label: 'All Burns' },
  { value: 'protocol-buyback', label: 'Protocol Buyback' },
  { value: 'scheduled-reduction', label: 'Scheduled Supply Reduction' },
]

const burnSteps = [
  {
    index: '01',
    phase: 'Trigger',
    title: 'A burn event is initiated',
    description: 'A token holder or authorized protocol action initiates a burn transaction.',
    detail: 'On-chain action',
  },
  {
    index: '02',
    phase: 'Execute',
    title: 'The amount is validated',
    description: 'The transaction is checked against the token contract and the sender balance.',
    detail: 'Transaction check',
  },
  {
    index: '03',
    phase: 'Burn',
    title: 'Tokens reach a burn destination',
    description: 'Tokens are removed from usable supply according to the confirmed contract rules.',
    detail: 'Supply impact',
  },
  {
    index: '04',
    phase: 'Verify',
    title: 'The transfer is recorded on-chain',
    description: 'A confirmed transaction and block record allow independent verification.',
    detail: 'Public record',
  },
] as const

function activityForRange(range: BurnRange) {
  if (range === '7d') return historyWithinDays(preview.activity, 7)
  if (range === '30d') return historyWithinDays(preview.activity, 30)
  if (range === '90d') return historyWithinDays(preview.activity, 90)
  if (range === '1y') return historyWithinYear(preview.activity)
  return [...preview.activity]
}

export default function StrikeTokenBurns() {
  const reduceMotion = useReducedMotion()
  const reveal = reduceMotion ? {} : fadeUp
  const stagger = reduceMotion ? {} : staggerContainerFast
  const item = reduceMotion ? {} : staggerItem
  const [activeFilter, setActiveFilter] = useState<'all' | BurnType>('all')
  const [range, setRange] = useState<BurnRange>('30d')
  const visibleEvents = useMemo(() => filterBurnEvents(preview.events, activeFilter), [activeFilter])
  const activity = useMemo(() => activityForRange(range), [range])

  return (
    <TokenPageShell activeTab="burns">
      <div className="strike-token__container strike-token__page strike-token__burn-page">
        <motion.section className="strike-token__hero strike-token__hero--burn" variants={reveal} initial="hidden" animate="visible">
          <div className="strike-token__eyebrow strike-token__eyebrow--plain">Burn Tracker / Preview activity</div>
          <h1>Track every token burn.</h1>
          <p>Monitor tokens removed from supply and verify each confirmed burn directly on-chain.</p>
          <div className="strike-token__actions">
            <a className="strike-token__button strike-token__button--primary" href="#latest-burn">
              View Latest Burn <ArrowDown aria-hidden="true" />
            </a>
          </div>
        </motion.section>

        <motion.dl className="strike-token__metrics strike-token__metrics--burn" variants={reveal} initial="hidden" animate="visible">
          <div>
            <dt>Total burned</dt>
            <dd>{formatTokenAmount(preview.summary.totalBurned)} <small>SR</small></dd>
            <p>Removed in preview data</p>
          </div>
          <div>
            <dt>Supply burned</dt>
            <dd>{formatPercent(preview.summary.burnedPercentage)}</dd>
            <p>Of initial preview supply</p>
          </div>
          <div>
            <dt>Burned last 30 days</dt>
            <dd>{formatTokenAmount(preview.summary.burned30Days)} <small>SR</small></dd>
            <p>Preview trailing 30-day window</p>
          </div>
          <div>
            <dt>Burn transactions</dt>
            <dd>{preview.summary.transactionCount}</dd>
            <p>Example event count</p>
          </div>
        </motion.dl>

        <motion.section className="strike-token__section strike-token__history-section" id="latest-burn" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
          <div className="strike-token__section-row">
            <header className="strike-token__section-heading">
              <h2>Burn history</h2>
              <p>Example events for layout preview. Live transactions will be verifiable.</p>
            </header>
            <div className="strike-token__filters" role="group" aria-label="Burn type filter">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className={activeFilter === filter.value ? 'is-active' : undefined}
                  aria-pressed={activeFilter === filter.value}
                  onClick={() => setActiveFilter(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          <div className="strike-token__history-panel">
            <div className="strike-token__table-scroll" role="region" aria-label="Burn history" tabIndex={0}>
              <table className="strike-token__table">
                <thead>
                  <tr>
                    <th scope="col">Date &amp; UTC time</th>
                    <th scope="col">Amount burned</th>
                    <th scope="col">Burn type</th>
                    <th scope="col">Transaction hash</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEvents.map((event) => (
                    <tr key={event.id}>
                      <td><time dateTime={event.timestamp}>{formatUtcDate(event.timestamp)}</time></td>
                      <td className="strike-token__table-amount">{formatTokenAmount(event.amount)} SR</td>
                      <td><span className={`strike-token__type is-${event.type}`}>{burnTypeLabels[event.type]}</span></td>
                      <td>
                        {event.transactionUrl ? (
                          <a href={event.transactionUrl} target="_blank" rel="noreferrer" aria-label={`View transaction ${event.transactionHash} on BaseScan (opens in a new tab)`}>
                            {shortenHex(event.transactionHash)} <ArrowUpRight aria-hidden="true" />
                          </a>
                        ) : (
                          <span title="Example transaction, no on-chain link">{shortenHex(event.transactionHash)} <small>Preview</small></span>
                        )}
                      </td>
                      <td><span className="strike-token__status-text">Preview</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visibleEvents.length === 0 && <p className="strike-token__empty">No burns match this filter in the preview.</p>}
            <div className="strike-token__table-footer">
              <span>Showing {visibleEvents.length} of {preview.events.length} example events</span>
              <span>Live explorer links arrive with verified data</span>
            </div>
          </div>
        </motion.section>

        <motion.section className="strike-token__section strike-token__steps-section" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
          <header className="strike-token__section-heading">
            <h2>How burns work</h2>
            <p>Burns are recorded on-chain and can be independently verified after confirmation.</p>
          </header>
          <motion.div className="strike-token__steps" variants={stagger}>
            {burnSteps.map((step) => (
              <motion.article key={step.index} variants={item}>
                <div className="strike-token__step-top"><span>{step.index}</span><span>{step.phase}</span></div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                <div className="strike-token__step-detail">{step.detail}</div>
              </motion.article>
            ))}
          </motion.div>
        </motion.section>

        <motion.section className="strike-token__section strike-token__activity-section" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
          <div className="strike-token__section-row">
            <header className="strike-token__section-heading">
              <h2>Burn activity</h2>
              <p>See how tokens are removed from the preview supply over time.</p>
            </header>
            <dl className="strike-token__activity-stats">
              <div><dt>24H</dt><dd>{formatCompactTokenAmount(preview.summary.burned24Hours)}</dd></div>
              <div><dt>7D</dt><dd>{formatCompactTokenAmount(preview.summary.burned7Days)}</dd></div>
              <div><dt>30D</dt><dd>{formatCompactTokenAmount(preview.summary.burned30Days)}</dd></div>
              <div><dt>All time</dt><dd>{formatCompactTokenAmount(preview.summary.totalBurned)}</dd></div>
            </dl>
          </div>
          <BurnActivityChart points={activity} range={range} onRangeChange={setRange} />
          <div className="strike-token__activity-caption">
            <span>Example burn events, not indexed chain records.</span>
            <span>Last block update: unavailable in preview</span>
          </div>
        </motion.section>

        <motion.aside className="strike-token__back-cta" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <div>
            <h2>Looking for the full token overview?</h2>
            <p>View supply, circulating supply, distribution, and token information on the Token Dashboard.</p>
          </div>
          <Link className="strike-token__button strike-token__button--primary" to={ROUTES.token}>
            Back to Token Dashboard <ArrowRight aria-hidden="true" />
          </Link>
        </motion.aside>
      </div>
    </TokenPageShell>
  )
}
