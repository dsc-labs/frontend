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
          <h1 className="mindshare-title">Mindshare Challenge</h1>
          <MindshareCountdown />
        </motion.div>

        <article className="mindshare-article">
          <h2>STRIKE ROBOT MINDSHARE CAMPAIGN - EPOCH 1</h2>
          <p>
            Epoch 1 marks the beginning of the Strikerobot contributor program - an initiative
            designed to grow the ecosystem through community-driven content and shared mindshare.
          </p>
          <p>
            In this phase, contributors create and distribute content around Strikerobot, helping
            expand awareness, attract new builders, and shape the narrative of the network. In
            return, participants earn <strong>Mindshare points</strong>, reflecting the reach and
            impact of their contributions, and gain access to early-stage rewards.
          </p>
          <p>
            This is the foundation for a scalable, contributor-powered ecosystem where value is
            created not only by building, but also by sharing, educating, and amplifying.
          </p>

          <h3>EPOCH 1 BREAKDOWN</h3>
          <h4>Duration</h4>
          <p>
            Epoch 1 runs for <strong>2 weeks</strong> starting at 17:00 UTC on April 8, 2026. All
            submissions within this period will be counted.
          </p>

          <h4>Reward Pool</h4>
          <p>
            Total rewards equal to <strong>2% of total supply.</strong> Distribution is based on{' '}
            <strong>Mindshare points earned during the epoch.</strong>
          </p>

          <h4>Criteria</h4>
          <p>Mindshare is evaluated based on:</p>
          <ul>
            <li>Impact - reach and influence of the content</li>
            <li>Quality - clarity, depth, and value of the writing</li>
            <li>
              Consistency - frequency of high-quality posts and sustained contribution over time
            </li>
          </ul>

          <h4>Submission Requirements</h4>
          <p>All submissions must include:</p>
          <ul>
            <li>Deliver valuable and relevant content related to Strikerobot</li>
            <li>Be written in any language, not limited to English</li>
            <li>Ensure your X account has been active for over 3 months and is verified</li>
          </ul>
          <p>Submit your contribution via the form below:</p>
          <p>
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSeyuBGq3qTWhUD4ikhEL4iJyyb0sy9YpSAyCOjW7r2qJie8Mw/viewform"
              target="_blank"
              rel="noopener noreferrer"
              className="mindshare-submit-link"
            >
              <strong>Submit your Mindshare</strong>
            </a>
          </p>

          <p>
            Epoch 1 is your opportunity to be part of Strikerobot from the very beginning - to
            contribute, shape the narrative, and earn from the network's early growth.
          </p>
          <p>
            Start creating, contribute to real-world robotics, and become part of the Strikerobot
            ecosystem.
          </p>
        </article>
      </div>
    </div>
  )
}

export default MindshareChallenge
