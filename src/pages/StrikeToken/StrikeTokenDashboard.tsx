import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Check, Copy, Info, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fadeUp } from '../../strike/components/animations/fadeUp'
import { staggerContainerFast } from '../../strike/components/animations/stagger'
import { ROUTES } from '../../strike/lib/navigate'
import { TokenPageShell } from './TokenPageShell'
import { TokenSupplyHeroVisual } from './TokenHeroVisuals'
import { formatTokenAmount, formatUtcDate } from './tokenFormat'
import { useTokenOverview } from './useTokenOverview'

const CONTRACT_ADDRESS = '0x10c56F005a379f8eAfc88ff5c3f40d30F0031AC9'
const contractUrl = `https://basescan.org/token/${CONTRACT_ADDRESS}`

export default function StrikeTokenDashboard() {
  const reduceMotion = useReducedMotion()
  const [copied, setCopied] = useState(false)
  const { state, data, retry } = useTokenOverview()
  const live = state === 'live' ? data : null
  const reveal = reduceMotion ? {} : fadeUp
  const stagger = reduceMotion ? {} : staggerContainerFast
  const totalSupply = live ? formatTokenAmount(live.supply.totalSupply) : '—'
  const updatedAt = live ? formatUtcDate(live.updatedAt) : '—'

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <TokenPageShell
      activeTab="dashboard"
      hero={(
        <motion.section className="strike-token__hero" variants={reveal} initial="hidden" animate="visible">
          <div className="strike-token__hero-copy">
            <h1>Strike Robot Token</h1>
            <p>A clear view of verified token supply and contract information across the Strike Robot ecosystem.</p>
            <div className="strike-token__actions">
              <Link className="strike-token__button strike-token__button--primary" to={ROUTES.tokenBurns}>
                Explore Burn Tracker <ArrowRight aria-hidden="true" />
              </Link>
              <a className="strike-token__button strike-token__button--secondary" href={contractUrl} target="_blank" rel="noreferrer">
                View Contract <ArrowUpRight aria-hidden="true" strokeWidth={1.75} />
              </a>
            </div>
            <dl className="strike-token__hero-facts" aria-label="Token details">
              <div><dt>Network</dt><dd>Base</dd></div>
              <div><dt>Standard</dt><dd>ERC-20</dd></div>
              <div><dt>Data</dt><dd>{state === 'live' ? 'On-chain' : state === 'loading' ? 'Loading…' : 'Unavailable'}</dd></div>
            </dl>
          </div>
          <TokenSupplyHeroVisual data={live} state={state} />
        </motion.section>
      )}
    >
      <motion.div className="strike-token__container strike-token__page" variants={stagger} initial="hidden" animate="visible">
        {state === 'error' && (
          <div className="strike-token__error" role="alert">
            <span>On-chain data is temporarily unavailable.</span>
            <button type="button" onClick={retry}>Try again <ArrowRight aria-hidden="true" /></button>
          </div>
        )}

        <motion.dl className="strike-token__metrics" variants={reveal} aria-live="polite">
          <div>
            <dt>Current total supply</dt>
            <dd>{totalSupply} {live && <small>SR</small>}</dd>
            <p>{live ? `On-chain data · Block ${live.indexedBlock.toLocaleString('en-US')}` : state === 'loading' ? 'Loading on-chain data' : 'Data unavailable'}</p>
          </div>
          <div><dt>Circulating supply</dt><dd>—</dd><p>Not yet verified</p></div>
          <div><dt>Total burned</dt><dd>—</dd><p>Not yet verified</p></div>
          <div><dt>Circulating</dt><dd>—</dd><p>Not yet verified</p></div>
        </motion.dl>

        <motion.section className="strike-token__section" variants={reveal}>
          <header className="strike-token__section-heading">
            <h2>Token supply</h2>
            <p>Confirmed contract supply is shown separately from allocation figures that still require official wallet classifications.</p>
          </header>
          <div className="strike-token__supply-grid">
            <article className="strike-token__panel strike-token__distribution">
              <div className="strike-token__panel-heading"><span>Supply distribution</span><span>Awaiting classification</span></div>
              <div className="strike-token__unverified" role="status">
                <Info aria-hidden="true" />
                <div>
                  <strong>Not yet verified</strong>
                  <p>Circulating, locked and treasury wallet balances need an official classification before we can show a distribution.</p>
                </div>
              </div>
              <footer><span>No estimated allocation shown</span><span>Base Mainnet</span></footer>
            </article>

            <article className="strike-token__panel strike-token__summary">
              <div className="strike-token__panel-heading"><span>Supply summary</span><span>{live ? 'On-chain' : 'Unavailable'}</span></div>
              <dl>
                <div><dt>Initial supply</dt><dd>Not yet verified</dd></div>
                <div><dt>Current total supply</dt><dd>{totalSupply} {live && 'SR'}</dd></div>
                <div><dt>Circulating supply</dt><dd>Not yet verified</dd></div>
                <div><dt>Total burned</dt><dd>Not yet verified</dd></div>
                <div><dt>Block time</dt><dd>{updatedAt}</dd></div>
              </dl>
              <Link className="strike-token__panel-link" to={ROUTES.tokenBurns}>Burn data status <ArrowRight aria-hidden="true" /></Link>
            </article>
          </div>
        </motion.section>

        <motion.section className="strike-token__section" variants={reveal}>
          <header className="strike-token__section-heading">
            <h2>Supply over time</h2>
            <p>A historical chart will appear when verified supply snapshots are available.</p>
          </header>
          <div className="strike-token__chart-card strike-token__chart-card--unverified" role="status">
            <span>Historical supply</span>
            <div className="strike-token__unverified strike-token__unverified--plain">
              <Info aria-hidden="true" />
              <div><strong>History not yet indexed</strong><p>No preview timeline or estimated supply curve is shown as live data.</p></div>
            </div>
          </div>
        </motion.section>

        <motion.section className="strike-token__section strike-token__section--last" variants={reveal}>
          <header className="strike-token__section-heading">
            <h2>Token details</h2>
            <p>Contract information read from Base Mainnet.</p>
          </header>
          <article className="strike-token__panel strike-token__details">
            <dl className="strike-token__detail-grid">
              <div><dt>Token</dt><dd>{live?.token.name ?? '—'}</dd></div>
              <div><dt>Symbol</dt><dd>{live?.token.symbol ?? '—'}</dd></div>
              <div><dt>Network</dt><dd>Base <small>Mainnet</small></dd></div>
              <div><dt>Token standard</dt><dd>{live?.token.standard ?? '—'}</dd></div>
              <div><dt>Decimals</dt><dd>{live?.token.decimals ?? '—'}</dd></div>
              <div className="is-unconfirmed"><dt>Tokenomics</dt><dd><Info aria-hidden="true" /> Not yet verified</dd></div>
            </dl>
            <div className="strike-token__contract">
              <span>Contract address</span>
              <div>
                <code>{CONTRACT_ADDRESS}</code>
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
