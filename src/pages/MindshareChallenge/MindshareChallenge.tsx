import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Header from '../../components/common/Header/Header'
import { DefaultPageSEO } from '../../components/common/PageSEO/PageSEO'
import './MindshareChallenge.css'

/** Epoch 1 ends at 17:00 UTC on April 22, 2026 (2 weeks from April 8, 2026). */
const COUNTDOWN_END = new Date('2026-04-22T17:00:00Z')

function pad2(n: number) {
  return n.toString().padStart(2, '0')
}

function getRemaining(end: Date, nowMs: number) {
  const t = end.getTime() - nowMs
  if (t <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  }
  const seconds = Math.floor(t / 1000)
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return { days, hours, minutes, seconds: secs, expired: false }
}

const MindshareCountdown = () => {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const { days, hours, minutes, seconds, expired } = getRemaining(
    COUNTDOWN_END,
    nowMs,
  )

  if (expired) {
    return (
      <p className="mindshare-countdown-expired" role="status">
        Challenge window is open.
      </p>
    )
  }

  const units = [
    { label: 'Days', value: pad2(days) },
    { label: 'Hours', value: pad2(hours) },
    { label: 'Minutes', value: pad2(minutes) },
    { label: 'Seconds', value: pad2(seconds) },
  ]

  return (
    <div className="mindshare-countdown" aria-live="polite" role="timer">
      {units.map((u) => (
        <div key={u.label} className="mindshare-countdown-unit">
          <span className="mindshare-countdown-value">{u.value}</span>
          <span className="mindshare-countdown-label">{u.label}</span>
        </div>
      ))}
    </div>
  )
}

const MindshareChallenge = () => {
  return (
    <div className="mindshare-page">
      <DefaultPageSEO path="/mindshare-challenge" />
      <Header showSocialIcons />

      <div className="mindshare-container">
        <motion.div
          className="mindshare-title-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="mindshare-title">STRIKE ROBOT MINDSHARE CHALLENGE - EPOCH 1</h1>
          <MindshareCountdown />
        </motion.div>

        <article className="mindshare-article">
          <p>
            Epoch 1 marks the beginning of the <strong>Strike Robot</strong> contributor program - an initiative
            designed to grow the ecosystem through community-driven content and shared mindshare.
          </p>
          <p>
            In this phase, contributors create and distribute content around <strong>Strike Robot</strong>, helping
            expand awareness, attract new builders, and shape the narrative of the network. In
            return, participants earn <strong>Mindshare points</strong>, reflecting the reach and
            impact of their contributions, and gain access to early-stage rewards.
          </p>
          <p>
            This is the foundation for a scalable, contributor-powered ecosystem where value is
            created not only by building, but also by sharing, educating, and amplifying.
          </p>

          <p className="mindshare-submit-row">
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSeyuBGq3qTWhUD4ikhEL4iJyyb0sy9YpSAyCOjW7r2qJie8Mw/viewform"
                target="_blank"
                rel="noopener noreferrer"
                className="mindshare-submit-link"
              >
                <strong>Submit Your Mindshare</strong>
                <span aria-hidden="true" className="mindshare-submit-arrow">
                  {' '}
                  →
                </span>
              </a>
            </p>

          <h2>EPOCH 1 BREAKDOWN</h2>
          <h3>Duration</h3>
          <p className="mindshare-duration-box">
            Epoch 1 runs for 2 weeks starting at 17:00 UTC on April 8, 2026. All
            submissions within this period will be counted.
          </p>

          <h3>Reward Pool</h3>
          <div className="mindshare-duration-box">
            <p>
              Total rewards equal to 2% of the total supply allocated across all Epochs.{' '}
              Distribution is based on Mindshare points earned during each epoch.
            </p>
          </div>

          <h3>Criteria</h3>
          <ul>
            <li>Impact - reach and influence of the content</li>
            <li>Quality - clarity, depth, and value of the writing</li>
            <li>Consistency - frequency of high-quality posts and sustained contribution over time</li>
          </ul>

          <h3>Submission Requirements</h3>
          <ul>
            <li>Deliver valuable and relevant content related to <strong>Strike Robot</strong></li>
            <li>Be written in any language, not limited to English</li>
            <li>Ensure your X account has been active for over 3 months and is verified</li>
          </ul>

          <h3>Submit your contribution via the form below</h3>
          <p className="mindshare-submit-row">
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSeyuBGq3qTWhUD4ikhEL4iJyyb0sy9YpSAyCOjW7r2qJie8Mw/viewform"
                target="_blank"
                rel="noopener noreferrer"
                className="mindshare-submit-link"
              >
                <strong>Submit Your Mindshare</strong>
                <span aria-hidden="true" className="mindshare-submit-arrow">
                  {' '}
                  →
                </span>
              </a>
            </p>
        </article>
      </div>
    </div>
  )
}

export default MindshareChallenge
