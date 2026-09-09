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
import { StrikeLayout } from '../../strike/StrikeLayout'
import { PageSEO } from '../../components/common/PageSEO/PageSEO'
import { EXTERNAL_LINKS } from '../../strike/lib/navigate'
import { ApiCodeTabs, CodeCopyButton } from './ApiCodeTabs'
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
          <div className="strike-api__container strike-api__hero-grid">
            <div className="strike-api__hero-copy">
              <div className="strike-api__version">
                <span aria-hidden="true" />
                <strong>SR PLATFORM API</strong>
                <i aria-hidden="true" />
                <small>v1.2.0</small>
              </div>
              <h1>Bring SR Platform into your own workflow.</h1>
              <p className="strike-api__lede">
                Developers can programmatically generate simulation environments and assets,
                track generation jobs, and retrieve outputs through the SR Platform API.
              </p>
              <div className="strike-api__actions">
                <a className="strike-api__button strike-api__button--primary" href="#api-preview">
                  Explore SR Platform API
                  <ArrowRight aria-hidden="true" />
                </a>
                <a className="strike-api__button strike-api__button--secondary" href="#how-it-works">
                  View Documentation
                  <BookOpen aria-hidden="true" />
                </a>
              </div>
              <dl className="strike-api__telemetry">
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
              </dl>
            </div>

            <div className="strike-api__terminal strike-api__terminal--hero">
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
                  <code>{HERO_QUICKSTART}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section className="strike-api__section">
          <div className="strike-api__container">
            <SectionHeading
              eyebrow="Capabilities"
              title="Architected for programmatic physical AI pipelines."
              description="From parametric scene generation to sensor-rigged artifact delivery, integrate high-fidelity spatial generation directly into your reinforcement learning pipelines."
            />
            <div className="strike-api__capability-grid">
              {API_CAPABILITIES.map((capability) => {
                const Icon = CAPABILITY_ICONS[capability.id]
                return (
                  <article className="strike-api__capability-card" key={capability.id}>
                    <div>
                      <span className="strike-api__icon-box">
                        <Icon aria-hidden="true" />
                      </span>
                      <h3>{capability.title}</h3>
                      <p>{capability.description}</p>
                    </div>
                    <span className="strike-api__card-meta">{capability.meta}</span>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="strike-api__section strike-api__section--subtle"
        >
          <div className="strike-api__container">
            <SectionHeading
              eyebrow="Integration Flow"
              title="How It Works"
              description="A predictable asynchronous operational lifecycle designed for fault-tolerant simulation pipelines."
            />
            <div className="strike-api__steps">
              {API_STEPS.map((step) => (
                <article className="strike-api__step" key={step.number}>
                  <div className="strike-api__step-topline">
                    <span>{step.number}</span>
                    <span className={'strike-api__method strike-api__method--' + step.methodTone}>
                      {step.method}
                    </span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
            <ApiCodeTabs />
          </div>
        </section>

        <section className="strike-api__section">
          <div className="strike-api__container">
            <SectionHeading
              eyebrow="Security & Scale"
              title="Built for Production Workflows"
              description="Enterprise security primitives built directly into every protocol call."
            />
            <div className="strike-api__security-grid">
              {API_SECURITY_FEATURES.map((feature) => {
                const Icon = SECURITY_ICONS[feature.id]
                return (
                  <article className="strike-api__security-card" key={feature.id}>
                    <div>
                      <Icon aria-hidden="true" />
                      <h3>{feature.title}</h3>
                    </div>
                    <p>{feature.description}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section id="api-preview" className="strike-api__section">
          <div className="strike-api__container">
            <SectionHeading
              eyebrow="Endpoint Reference"
              title="API Preview"
              description="Deterministic REST primitives adhering strictly to OpenAPI 3.1 specifications."
            />
            <div className="strike-api__endpoints">
              {API_ENDPOINTS.map((endpoint) => (
                <div
                  className="strike-api__endpoint"
                  key={endpoint.method + '-' + endpoint.path}
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
                </div>
              ))}
            </div>
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
        </section>

        <section className="strike-api__cta-section">
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
        </section>
      </main>
      <Footer />
    </StrikeLayout>
  )
}
