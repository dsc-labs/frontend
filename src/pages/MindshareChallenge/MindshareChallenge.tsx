import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Header from '../../components/common/Header/Header'
import { DefaultPageSEO } from '../../components/common/PageSEO/PageSEO'
import {
  getMindshareEpochPhase,
  mindshareArticleEpoch,
  mindshareChallengeTitle,
  mindshareCountdownEndMs,
} from '../../lib/mindshareEpochSchedule'
import './MindshareChallenge.css'

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

type MindshareCountdownProps = {
  end: Date
  expiredLabel: string
}

const MindshareCountdown = ({ end, expiredLabel }: MindshareCountdownProps) => {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const { days, hours, minutes, seconds, expired } = getRemaining(end, nowMs)

  if (expired) {
    return (
      <p className="mindshare-countdown-expired" role="status">
        {expiredLabel}
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

function Epoch2LeaderboardComingSoonButton() {
  return (
    <button
      type="button"
      className="mindshare-submit-link mindshare-leaderboard-link mindshare-epoch2-leaderboard-btn"
      aria-label="Epoch 2 Leaderboard, coming soon"
    >
      <span className="mindshare-leaderboard-label-stack">
        <span className="mindshare-leaderboard-label-default">
          <strong>Epoch 2 Leaderboard</strong>
        </span>
        <span className="mindshare-leaderboard-label-hover">
          <strong>Coming Soon</strong>
        </span>
      </span>
      <span aria-hidden="true" className="mindshare-submit-arrow">
        {' '}
        →
      </span>
    </button>
  )
}

const MindshareChallenge = () => {
  const [activeEpoch, setActiveEpoch] = useState<1 | 2>(() =>
    Date.now() > EPOCH_1_END.getTime() ? 2 : 1,
  )

  const countdownEnd = activeEpoch === 1 ? EPOCH_1_END : EPOCH_2_END

  const handleCountdownComplete = () => {
    if (activeEpoch === 1) {
      setActiveEpoch(2)
    }
  }

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
          <h1 className="mindshare-title">{mindshareChallengeTitle(phase)}</h1>
          {countdownEndMs != null ? (
            <MindshareCountdown
              end={new Date(countdownEndMs)}
              expiredLabel={countdownExpiredLabel}
            />
          ) : (
            <p className="mindshare-countdown-expired" role="status">
              Epoch 3 is underway.
            </p>
          )}
        </motion.div>

        <article className="mindshare-article">
          <p>
            Epoch {activeEpoch} is part of the <strong>Strike Robot</strong> contributor program - an initiative
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

          <div className="mindshare-submit-row">
            <Link to="/mindshare-submit" className="mindshare-submit-link">
              <strong>Submit Your Mindshare</strong>
              <span aria-hidden="true" className="mindshare-submit-arrow">
                {' '}
                →
              </span>
            </Link>
            <Epoch2LeaderboardButton live={epoch2LeaderboardLive} />
          </div>

          <h2>EPOCH {articleEpoch} BREAKDOWN</h2>
          <h3>Duration</h3>
          <p className="mindshare-duration-box">
            {phase === 'epoch3_countdown'
              ? 'Epoch 2 has ended. Epoch 3 begins after the 3-day countdown (17:00 UTC on May 23, 2026).'
              : articleEpoch === 1
                ? 'Epoch 1 runs for 2 weeks starting at 17:00 UTC on April 8, 2026. All submissions within this period will be counted.'
                : articleEpoch === 2
                  ? 'Epoch 2 runs for 4 weeks starting at 17:00 UTC on April 22, 2026. All submissions within this period will be counted.'
                  : 'Epoch 3 is open. Submission windows and rewards will be announced on this page.'}
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
            <li>To be eligible, participants must hold at least <strong>10,000 $SR</strong> in their wallet</li>
          </ul>

          <h3>Submit your contribution via the form below</h3>
          <div className="mindshare-submit-row">
            <Link to="/mindshare-submit" className="mindshare-submit-link">
              <strong>Submit Your Mindshare</strong>
              <span aria-hidden="true" className="mindshare-submit-arrow">
                {' '}
                →
              </span>
            </Link>
            <Epoch2LeaderboardButton live={epoch2LeaderboardLive} />
          </div>
        </article>
      </div>
    </div>
  )
}

export default MindshareChallenge
