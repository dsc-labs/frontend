import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowRight, ArrowUpRight, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fadeUp } from '../../strike/components/animations/fadeUp'
import { staggerContainerFast, staggerItem } from '../../strike/components/animations/stagger'
import { ROUTES } from '../../strike/lib/navigate'
import { TokenPageShell } from './TokenPageShell'
import { TokenBurnHeroVisual } from './TokenHeroVisuals'

const contractUrl = 'https://basescan.org/token/0x10c56F005a379f8eAfc88ff5c3f40d30F0031AC9'

const verificationSteps = [
  {
    index: '01',
    phase: 'Define',
    title: 'Confirm the burn rule',
    description: 'The token team identifies which contract actions or destinations count as an SR burn.',
    detail: 'Official mechanism',
  },
  {
    index: '02',
    phase: 'Scope',
    title: 'Set the event coverage',
    description: 'Deployment block and accepted event types define which transactions need to be indexed.',
    detail: 'Complete range',
  },
  {
    index: '03',
    phase: 'Check',
    title: 'Verify transactions',
    description: 'Sample transactions and their supply impact are checked against Base records.',
    detail: 'On-chain evidence',
  },
  {
    index: '04',
    phase: 'Publish',
    title: 'Show confirmed burns',
    description: 'Only independently verifiable amounts, dates and transaction links will appear here.',
    detail: 'Transparent reporting',
  },
] as const

export default function StrikeTokenBurns() {
  const reduceMotion = useReducedMotion()
  const reveal = reduceMotion ? {} : fadeUp
  const stagger = reduceMotion ? {} : staggerContainerFast
  const item = reduceMotion ? {} : staggerItem

  return (
    <TokenPageShell
      activeTab="burns"
      hero={(
        <motion.section className="strike-token__hero strike-token__hero--burn" variants={reveal} initial="hidden" animate="visible">
          <div className="strike-token__hero-copy">
            <h1>Burn Tracker</h1>
            <p>SR burn activity will appear here once the official mechanism and transactions can be verified on Base.</p>
            <div className="strike-token__actions">
              <Link className="strike-token__button strike-token__button--primary" to={ROUTES.token}>
                Explore Token Dashboard <ArrowRight aria-hidden="true" />
              </Link>
              <a className="strike-token__button strike-token__button--secondary" href="#latest-burn">
                Burn data status <ArrowDown aria-hidden="true" />
              </a>
            </div>
            <dl className="strike-token__hero-facts" aria-label="Burn data status">
              <div><dt>Network</dt><dd>Base</dd></div>
              <div><dt>Events</dt><dd>Not verified</dd></div>
              <div><dt>Data</dt><dd>Pending rules</dd></div>
            </dl>
          </div>
          <TokenBurnHeroVisual />
        </motion.section>
      )}
    >
      <div className="strike-token__container strike-token__page strike-token__burn-page">
        <motion.dl className="strike-token__metrics strike-token__metrics--burn" variants={reveal} initial="hidden" animate="visible">
          <div><dt>Total burned</dt><dd>—</dd><p>Not yet verified</p></div>
          <div><dt>Supply burned</dt><dd>—</dd><p>Not yet verified</p></div>
          <div><dt>Burned last 30 days</dt><dd>—</dd><p>Not yet verified</p></div>
          <div><dt>Burn transactions</dt><dd>—</dd><p>Not yet verified</p></div>
        </motion.dl>

        <motion.section className="strike-token__section strike-token__history-section" id="latest-burn" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
          <header className="strike-token__section-heading">
            <h2>Burn history</h2>
            <p>Transactions will be listed only after the official SR burn mechanism is confirmed.</p>
          </header>
          <div className="strike-token__history-panel strike-token__history-panel--unverified" role="status" aria-label="Burn history">
            <Info aria-hidden="true" />
            <div>
              <strong>Not yet verified</strong>
              <p>We need the official burn rule and a confirmed transaction before showing burn amounts or explorer links.</p>
            </div>
            <a href={contractUrl} target="_blank" rel="noreferrer">View SR contract <ArrowUpRight aria-hidden="true" /></a>
          </div>
        </motion.section>

        <motion.section className="strike-token__section strike-token__steps-section" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
          <header className="strike-token__section-heading">
            <h2>How burns work</h2>
            <p>What must be checked before burn activity can be reported reliably.</p>
          </header>
          <motion.div className="strike-token__steps" variants={stagger}>
            {verificationSteps.map((step) => (
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
              <p>No estimated activity curve is shown while the burn feed remains unverified.</p>
            </header>
            <dl className="strike-token__activity-stats">
              <div><dt>24H</dt><dd>—</dd></div>
              <div><dt>7D</dt><dd>—</dd></div>
              <div><dt>30D</dt><dd>—</dd></div>
              <div><dt>All time</dt><dd>—</dd></div>
            </dl>
          </div>
          <div className="strike-token__chart-card strike-token__chart-card--burn strike-token__chart-card--unverified" role="status">
            <span>Burn activity</span>
            <div className="strike-token__unverified strike-token__unverified--plain">
              <Info aria-hidden="true" />
              <div><strong>Activity not yet verified</strong><p>Verified events and a cumulative chart will appear here once the burn source is documented.</p></div>
            </div>
          </div>
          <div className="strike-token__activity-caption"><span>Unverified figures are intentionally hidden.</span><span>Base Mainnet</span></div>
        </motion.section>

        <motion.aside className="strike-token__back-cta" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <div>
            <h2>Looking for the token overview?</h2>
            <p>View the verified contract supply and token information on the Token Dashboard.</p>
          </div>
          <Link className="strike-token__button strike-token__button--primary" to={ROUTES.token}>
            Back to Token Dashboard <ArrowRight aria-hidden="true" />
          </Link>
        </motion.aside>
      </div>
    </TokenPageShell>
  )
}
