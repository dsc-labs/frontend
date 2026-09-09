import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/sections/Footer'
import {
  Archive,
  ArrowRight,
  BookOpen,
  Box,
  KeyRound,
  Radar,
  RefreshCw,
  ShieldCheck,
  SquareTerminal,
  WalletCards,
} from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { StrikeLayout } from '../../strike/StrikeLayout'
import { PageSEO } from '../../components/common/PageSEO/PageSEO'
import { fadeUp, fadeUpScale } from '../../strike/components/animations/fadeUp'
import {
  staggerContainer,
  staggerContainerFast,
  staggerItem,
} from '../../strike/components/animations/stagger'
import { EXTERNAL_LINKS } from '../../strike/lib/navigate'
import { ApiCodeTabs, CodeCopyButton } from './ApiCodeTabs'
import { SyntaxHighlightedCode } from './SyntaxHighlightedCode'
import {
  API_CAPABILITIES,
  API_ENDPOINTS,
  API_SECURITY_FEATURES,
  API_STEPS,
  HERO_QUICKSTART,
} from './apiContent'
import './StrikeApi.css'

const CAPABILITY_ICONS = {
  generate: Box,
  track: Radar,
  retrieve: Archive,
} as const

const SECURITY_ICONS = {
  auth: KeyRound,
  scope: ShieldCheck,
  retry: RefreshCw,
  credits: WalletCards,
} as const

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="strike-api__section-heading">
      <p className="strike-api__eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}

export default function StrikeApi() {
  const prefersReducedMotion = useReducedMotion()
  const reveal = prefersReducedMotion ? {} : fadeUp
  const revealScale = prefersReducedMotion ? {} : fadeUpScale
  const stagger = prefersReducedMotion ? {} : staggerContainer
  const staggerFast = prefersReducedMotion ? {} : staggerContainerFast
  const staggerCard = prefersReducedMotion ? {} : staggerItem

  return (
    <StrikeLayout>
      <PageSEO
        path="/api"
        title="SR Platform Developer API"
        metaDescription="Build physical AI workflows with the SR Platform Developer API."
      />
      <Navbar />
      <main className="strike-api">
        <section className="strike-api__hero">
          <motion.div
            className="strike-api__container strike-api__hero-grid"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            <motion.div className="strike-api__hero-copy" variants={staggerFast}>
              <motion.h1 variants={reveal}>Bring SR Platform into your own workflow.</motion.h1>
              <motion.p className="strike-api__lede" variants={reveal}>
                Developers can programmatically generate simulation environments and assets,
                track generation jobs, and retrieve outputs through the SR Platform API.
              </motion.p>
              <motion.div className="strike-api__actions" variants={reveal}>
                <a className="strike-api__button strike-api__button--primary" href="#api-preview">
                  Explore SR Platform API
                  <ArrowRight aria-hidden="true" />
                </a>
                <a className="strike-api__button strike-api__button--secondary" href="#how-it-works">
                  View Documentation
                  <BookOpen aria-hidden="true" />
                </a>
              </motion.div>
              <motion.dl className="strike-api__telemetry" variants={reveal}>
                <div>
                  <dt>LATENCY SLA</dt>
                  <dd>&lt; 140ms</dd>
                </div>
                <div>
                  <dt>COMPATIBILITY</dt>
                  <dd>USD / GLTF / URDF</dd>
                </div>
                <div>
                  <dt>AVAILABILITY</dt>
                  <dd>99.99% Core</dd>
                </div>
              </motion.dl>
            </motion.div>

            <motion.div
              className="strike-api__terminal strike-api__terminal--hero"
              variants={revealScale}
            >
              <div className="strike-api__terminal-header">
                <div className="strike-api__terminal-title">
                  <span aria-hidden="true" />
                  <span aria-hidden="true" />
                  <span aria-hidden="true" />
                  <small>cURL — Quickstart</small>
                </div>
                <CodeCopyButton value={HERO_QUICKSTART} compact />
              </div>
              <div className="strike-api__code-panel">
                <pre>
                  <SyntaxHighlightedCode code={HERO_QUICKSTART} language="curl" />
                </pre>
              </div>
            </motion.div>
          </motion.div>
        </section>

        <motion.section
          className="strike-api__section"
          variants={reveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          <div className="strike-api__container">
            <SectionHeading
              eyebrow="Capabilities"
              title="Architected for programmatic physical AI pipelines."
              description="From parametric scene generation to sensor-rigged artifact delivery, integrate high-fidelity spatial generation directly into your reinforcement learning pipelines."
            />
            <motion.div className="strike-api__capability-grid" variants={staggerFast}>
              {API_CAPABILITIES.map((capability) => {
                const Icon = CAPABILITY_ICONS[capability.id]
                return (
                  <motion.article
                    className="strike-api__capability-card"
                    key={capability.id}
                    variants={staggerCard}
                  >
                    <div>
                      <span className="strike-api__icon-box">
                        <Icon aria-hidden="true" />
                      </span>
                      <h3>{capability.title}</h3>
                      <p>{capability.description}</p>
                    </div>
                    <span className="strike-api__card-meta">{capability.meta}</span>
                  </motion.article>
                )
              })}
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          id="how-it-works"
          className="strike-api__section strike-api__section--subtle"
          variants={reveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          <div className="strike-api__container">
            <SectionHeading
              eyebrow="Integration Flow"
              title="How It Works"
              description="A predictable asynchronous operational lifecycle designed for fault-tolerant simulation pipelines."
            />
            <motion.div className="strike-api__steps" variants={staggerFast}>
              {API_STEPS.map((step) => (
                <motion.article
                  className="strike-api__step"
                  key={step.number}
                  variants={staggerCard}
                >
                  <div className="strike-api__step-topline">
                    <span>{step.number}</span>
                    <span className={'strike-api__method strike-api__method--' + step.methodTone}>
                      {step.method}
                    </span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </motion.article>
              ))}
            </motion.div>
            <motion.div variants={revealScale}>
              <ApiCodeTabs />
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          className="strike-api__section"
          variants={reveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          <div className="strike-api__container">
            <SectionHeading
              eyebrow="Security & Scale"
              title="Built for Production Workflows"
              description="Enterprise security primitives built directly into every protocol call."
            />
            <motion.div className="strike-api__security-grid" variants={staggerFast}>
              {API_SECURITY_FEATURES.map((feature) => {
                const Icon = SECURITY_ICONS[feature.id]
                return (
                  <motion.article
                    className="strike-api__security-card"
                    key={feature.id}
                    variants={staggerCard}
                  >
                    <div>
                      <Icon aria-hidden="true" />
                      <h3>{feature.title}</h3>
                    </div>
                    <p>{feature.description}</p>
                  </motion.article>
                )
              })}
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          id="api-preview"
          className="strike-api__section"
          variants={reveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          <div className="strike-api__container">
            <SectionHeading
              eyebrow="Endpoint Reference"
              title="API Preview"
              description="Deterministic REST primitives adhering strictly to OpenAPI 3.1 specifications."
            />
            <motion.div className="strike-api__endpoints" variants={staggerFast}>
              {API_ENDPOINTS.map((endpoint) => (
                <motion.div
                  className="strike-api__endpoint"
                  key={endpoint.method + '-' + endpoint.path}
                  variants={staggerCard}
                >
                  <div>
                    <span
                      className={
                        'strike-api__method strike-api__method--' +
                        endpoint.method.toLowerCase()
                      }
                    >
                      {endpoint.method}
                    </span>
                    <code>{endpoint.path}</code>
                  </div>
                  <p>{endpoint.description}</p>
                </motion.div>
              ))}
            </motion.div>
            <a
              className="strike-api__text-link"
              href={EXTERNAL_LINKS.docs}
              target="_blank"
              rel="noreferrer"
            >
              View all API endpoints
              <ArrowRight aria-hidden="true" />
            </a>
          </div>
        </motion.section>

        <motion.section
          className="strike-api__cta-section"
          variants={reveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          <div className="strike-api__container">
            <div className="strike-api__cta">
              <span className="strike-api__cta-icon">
                <SquareTerminal aria-hidden="true" />
              </span>
              <h2>Build with SR Platform</h2>
              <p>
                Connect environment and asset generation directly to your robotics, simulation,
                or Physical AI workflow.
              </p>
              <div className="strike-api__actions">
                <a className="strike-api__button strike-api__button--primary" href="#api-preview">
                  Explore SR Platform API
                </a>
                <button
                  type="button"
                  className="strike-api__button strike-api__button--secondary"
                  disabled
                  aria-disabled="true"
                  title="Contact channel coming soon"
                >
                  Contact Engineering
                </button>
              </div>
            </div>
          </div>
        </motion.section>
      </main>
      <Footer />
    </StrikeLayout>
  )
}
