import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Header from '../../components/common/Header/Header'
import { DefaultPageSEO } from '../../components/common/PageSEO/PageSEO'
import {
  getMindshareEpochPhase,
  isEpoch2MindshareSubmissionOpen,
  mindshareArticleEpoch,
  mindshareChallengeTitle,
  mindshareCountdownEndMs,
  EPOCH_3_START_GMT7_LABEL,
  type MindshareEpochPhase,
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

function SubmitMindshareLink({ open }: { open: boolean }) {
  if (open) {
    return (
      <Link to="/mindshare-submit" className="mindshare-submit-link">
        <strong>Submit Your Mindshare</strong>
        <span aria-hidden="true" className="mindshare-submit-arrow">
          {' '}
          →
        </span>
      </Link>
    )
  }
  return (
    <span className="mindshare-submit-link mindshare-submit-link--closed" aria-disabled="true">
      <strong>Submit Your Mindshare</strong>
      <span className="mindshare-submit-closed-hint"> (closed until Epoch 3)</span>
    </span>
  )
}

function Epoch2LeaderboardButton({ live }: { live: boolean }) {
  if (live) {
    return (
      <Link
        to="/sraaaepoch2"
        className="mindshare-submit-link mindshare-leaderboard-link mindshare-epoch2-leaderboard-btn"
      >
        <strong>Epoch 2 Leaderboard</strong>
        <span aria-hidden="true" className="mindshare-submit-arrow">
          {' '}
          →
        </span>
      </Link>
    )
  }
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

function MindshareChallengeIntro({ phase }: { phase: MindshareEpochPhase }) {
  if (phase === 'epoch3_countdown' || phase === 'epoch3') {
    return (
      <>
        <p>
          Epoch 3 is part of the <strong>Strike Robot</strong> contributor program - an initiative designed to
          expand the ecosystem through community-driven content and collective mindshare.
        </p>
        <p>
          In this phase, contributors create and distribute content around <strong>Strike Robot</strong>, helping
          increase awareness, attract new builders, and shape the narrative of the network. In return, participants
          earn <strong>Mindshare points</strong> based on the reach and impact of their contributions, while gaining
          access to early-stage rewards and ecosystem opportunities.
        </p>
        <p>
          Epoch 3 continues building the foundation for a scalable, contributor-powered ecosystem where value is
          created not only through development, but also through sharing knowledge, educating the community, and
          amplifying the vision of Strike Robot.
        </p>
      </>
    )
  }

  const epoch = mindshareArticleEpoch(phase)
  return (
    <>
      <p>
        Epoch {epoch} is part of the <strong>Strike Robot</strong> contributor program - an initiative designed to
        grow the ecosystem through community-driven content and shared mindshare.
      </p>
      <p>
        In this phase, contributors create and distribute content around <strong>Strike Robot</strong>, helping expand
        awareness, attract new builders, and shape the narrative of the network. In return, participants earn{' '}
        <strong>Mindshare points</strong>, reflecting the reach and impact of their contributions, and gain access to
        early-stage rewards.
      </p>
      <p>
        This is the foundation for a scalable, contributor-powered ecosystem where value is created not only by
        building, but also by sharing, educating, and amplifying.
      </p>
    </>
  )
}

export type MindshareChallengeViewProps = {
  phase: MindshareEpochPhase
  seoPath?: string
  preview?: boolean
}

export function MindshareChallengeView({ phase, seoPath = '/mindshare-challenge', preview }: MindshareChallengeViewProps) {
  const articleEpoch = mindshareArticleEpoch(phase)
  const countdownEndMs = mindshareCountdownEndMs(phase)
  const epoch2LeaderboardLive = phase !== 'epoch1'
  const submissionsOpen = isEpoch2MindshareSubmissionOpen(phase)

  const countdownExpiredLabel =
    phase === 'epoch3_countdown'
      ? 'Epoch 3 has begun.'
      : phase === 'epoch2'
        ? 'Epoch 2 has ended.'
        : 'Epoch 1 has ended.'

  return (
    <div className="mindshare-page">
      {preview ? (
        <PageSEO
          path={seoPath}
          title="Epoch 3 Preview — Mindshare Challenge"
          metaDescription="Preview of the Epoch 3 mindshare challenge page after Epoch 2 ends: copy, countdown, and closed submissions."
          noIndex
        />
      ) : (
        <DefaultPageSEO path={seoPath} />
      )}
      <Header showSocialIcons />

      <div className="mindshare-container">
        {preview ? (
          <p className="mindshare-preview-banner" role="note">
            <strong>Preview only.</strong> This is how <code>/mindshare-challenge</code> will look after Epoch 2
            ends at midnight GMT+7. Epoch 3 goes live at {EPOCH_3_START_GMT7_LABEL}.{' '}
            <Link to="/mindshare-challenge">Back to live page</Link>
          </p>
        ) : null}
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
          <MindshareChallengeIntro phase={phase} />

          <div className="mindshare-submit-row">
            <SubmitMindshareLink open={submissionsOpen} />
            <Epoch2LeaderboardButton live={epoch2LeaderboardLive} />
          </div>

          <h2>EPOCH {articleEpoch} BREAKDOWN</h2>
          <h3>Duration</h3>
          <p className="mindshare-duration-box">
            {phase === 'epoch3_countdown'
              ? `Epoch 2 has ended. Submissions are closed during the 3-day countdown. Epoch 3 begins at ${EPOCH_3_START_GMT7_LABEL}.`
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
            <SubmitMindshareLink open={submissionsOpen} />
            <Epoch2LeaderboardButton live={epoch2LeaderboardLive} />
          </div>
        </article>
      </div>
    </div>
  )
}

const MindshareChallenge = () => {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return <MindshareChallengeView phase={getMindshareEpochPhase(nowMs)} />
}

export default MindshareChallenge
