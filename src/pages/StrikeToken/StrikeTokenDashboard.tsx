import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Check, Copy, Info, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fadeUp } from '../../strike/components/animations/fadeUp'
import { staggerContainerFast } from '../../strike/components/animations/stagger'
import { ROUTES } from '../../strike/lib/navigate'
import { SupplyHistoryChart } from './TokenCharts'
import { historyWithinDays, historyWithinYear } from './tokenChartData'
import { TokenPageShell } from './TokenPageShell'
import { formatPercent, formatTokenAmount } from './tokenFormat'
import { TOKEN_OVERVIEW_PREVIEW } from './tokenPreviewData'
import type { TokenRange } from './tokenTypes'

const overview = TOKEN_OVERVIEW_PREVIEW

function historyForRange(range: TokenRange) {
  if (range === '30d') return historyWithinDays(overview.history, 30)
  if (range === '90d') return historyWithinDays(overview.history, 90)
  if (range === '1y') return historyWithinYear(overview.history)
  return [...overview.history]
}

export default function StrikeTokenDashboard() {
  const reduceMotion = useReducedMotion()
  const [range, setRange] = useState<TokenRange>('1y')
  const [copied, setCopied] = useState(false)
  const reveal = reduceMotion ? {} : fadeUp
  const stagger = reduceMotion ? {} : staggerContainerFast
  const history = useMemo(() => historyForRange(range), [range])
  const contractUrl = `https://basescan.org/token/${overview.token.contractAddress}`

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(overview.token.contractAddress)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <TokenPageShell activeTab="dashboard">
      <motion.div
        className="strike-token__container strike-token__page"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.section className="strike-token__hero" variants={reveal}>
          <div className="strike-token__eyebrow">
            <span>Token dashboard</span>
            <span aria-hidden="true">/</span>
            <strong>Base contract</strong>
          </div>
          <h1>Strike Robot Token</h1>
          <p>
            A transparent view of token supply, distribution, and on-chain activity across the
            Strike Robot ecosystem.
          </p>
          <div className="strike-token__actions">
            <a className="strike-token__button strike-token__button--primary" href={contractUrl} target="_blank" rel="noreferrer">
              View Contract
              <ArrowUpRight aria-hidden="true" strokeWidth={1.75} />
            </a>
            <Link className="strike-token__button strike-token__button--secondary" to={ROUTES.tokenBurns}>
              Open Burn Tracker
              <ArrowRight aria-hidden="true" strokeWidth={1.75} />
            </Link>
          </div>
        </motion.section>

        <motion.dl className="strike-token__metrics" variants={reveal}>
          <div>
            <dt>Current supply</dt>
            <dd>{formatTokenAmount(overview.supply.currentSupply)} <small>SR</small></dd>
            <p>Total supply after preview burns</p>
          </div>
          <div>
            <dt>Circulating supply</dt>
            <dd>{formatTokenAmount(overview.supply.circulatingSupply)} <small>SR</small></dd>
            <p>Unlocked and publicly available</p>
          </div>
          <div className="is-accent">
            <dt>Total burned</dt>
            <dd>{formatTokenAmount(overview.supply.totalBurned)} <small>SR</small></dd>
            <p>Permanently removed in preview data</p>
          </div>
          <div>
            <dt>Circulating</dt>
            <dd>{formatPercent(overview.supply.circulatingPercentage)}</dd>
            <p>Of current preview supply</p>
          </div>
        </motion.dl>

        <motion.section className="strike-token__section" variants={reveal}>
          <header className="strike-token__section-heading">
            <h2>Token supply</h2>
            <p>See how the preview supply is distributed across the Strike Robot ecosystem.</p>
          </header>
          <div className="strike-token__supply-grid">
            <article className="strike-token__panel strike-token__distribution">
              <div className="strike-token__panel-heading">
                <span>Supply distribution</span>
                <span>Preview breakdown</span>
              </div>
              <div className="strike-token__allocation" aria-label="Token supply distribution">
                {overview.distribution.map((item) => (
                  <span
                    key={item.id}
                    className={`is-${item.id}`}
                    style={{ width: `${item.percentage}%` }}
                    title={`${item.label}: ${formatPercent(item.percentage)}`}
                  />
                ))}
              </div>
              <div className="strike-token__allocation-axis"><span>0%</span><span>Supply allocation</span><span>100%</span></div>
              <div className="strike-token__distribution-grid">
                {overview.distribution.map((item) => (
                  <div key={item.id}>
                    <span className={`strike-token__swatch is-${item.id}`} aria-hidden="true" />
                    <span>{item.label}</span>
                    <small>{formatPercent(item.percentage)}</small>
                    <strong>{formatTokenAmount(item.amount)} SR</strong>
                  </div>
                ))}
              </div>
              <footer><span>Deterministic preview segments</span><span>Typed fixture</span></footer>
            </article>

            <article className="strike-token__panel strike-token__summary">
              <div className="strike-token__panel-heading"><span>Supply summary</span><span>Preview</span></div>
              <dl>
                <div><dt>Initial supply</dt><dd>{formatTokenAmount(overview.supply.initialSupply)} SR</dd></div>
                <div><dt>Current supply</dt><dd>{formatTokenAmount(overview.supply.currentSupply)} SR</dd></div>
                <div><dt>Circulating supply</dt><dd>{formatTokenAmount(overview.supply.circulatingSupply)} SR</dd></div>
                <div className="is-accent"><dt>Total burned</dt><dd>{formatTokenAmount(overview.supply.totalBurned)} SR</dd></div>
                <div><dt>Last updated</dt><dd>Preview fixture</dd></div>
              </dl>
              <Link className="strike-token__panel-link" to={ROUTES.tokenBurns}>View burn history <ArrowRight aria-hidden="true" /></Link>
            </article>
          </div>
        </motion.section>

        <motion.section className="strike-token__section" variants={reveal}>
          <header className="strike-token__section-heading">
            <h2>Supply over time</h2>
            <p>Track how the supply composition changes across the preview timeline.</p>
          </header>
          <SupplyHistoryChart points={history} range={range} onRangeChange={setRange} />
        </motion.section>

        <motion.section className="strike-token__section strike-token__section--last" variants={reveal}>
          <header className="strike-token__section-heading">
            <h2>Token details</h2>
            <p>Contract specifications and verification information.</p>
          </header>
          <article className="strike-token__panel strike-token__details">
            <dl className="strike-token__detail-grid">
              <div><dt>Token</dt><dd>{overview.token.name}</dd></div>
              <div><dt>Symbol</dt><dd>{overview.token.symbol}</dd></div>
              <div><dt>Network</dt><dd>{overview.token.network} <small>Mainnet</small></dd></div>
              <div><dt>Token standard</dt><dd>{overview.token.standard}</dd></div>
              <div><dt>Initial supply</dt><dd>{formatTokenAmount(overview.supply.initialSupply)} SR</dd></div>
              <div className="is-unconfirmed"><dt>Verification status</dt><dd><Info aria-hidden="true" /> {overview.token.verificationStatus}</dd></div>
            </dl>
            <div className="strike-token__contract">
              <span>Contract address</span>
              <div>
                <code>{overview.token.contractAddress}</code>
                <button type="button" onClick={copyAddress} aria-label="Copy contract address">
                  {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <a href={contractUrl} target="_blank" rel="noreferrer">Explorer <ArrowUpRight aria-hidden="true" /></a>
              </div>
              <span className="strike-token__copy-status" aria-live="polite">{copied ? 'Contract address copied.' : ''}</span>
            </div>
            <footer className="strike-token__details-footer">
              <p><TriangleAlert aria-hidden="true" /> Always verify the contract address through official Strike Robot channels.</p>
              <div className="strike-token__actions">
                <a className="strike-token__button strike-token__button--primary" href={contractUrl} target="_blank" rel="noreferrer">View Contract <ArrowUpRight aria-hidden="true" /></a>
                <Link className="strike-token__button strike-token__button--secondary" to={ROUTES.tokenBurns}>Open Burn Tracker <ArrowRight aria-hidden="true" /></Link>
              </div>
            </footer>
          </article>
        </motion.section>
      </motion.div>
    </TokenPageShell>
  )
}
