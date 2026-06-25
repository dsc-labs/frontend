import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Header from '../../components/common/Header/Header'
import WaitlistPopup from '../../components/common/WaitlistPopup/WaitlistPopup'
import { isSrPlatformWaitlistLive } from '../../lib/srPlatformWaitlistLaunch'
import {
  PageSEO,
  SR_PLATFORM_SEO_DESCRIPTION,
  SR_PLATFORM_SEO_TITLE,
} from '../../components/common/PageSEO/PageSEO'
import './HomeMain.css'

const pipelineSteps = [
  {
    id: 1,
    image: '/home_main/1.png',
    title: 'User Prompt',
    text: 'Create robotics environments instantly using simple natural language.',
  },
  {
    id: 2,
    image: '/home_main/2.png',
    title: 'Text-to-CAD Generation',
    text: 'Asset-to-matter, physics-aware CAD generation ready for simulation.',
  },
  {
    id: 3,
    image: '/home_main/3.png',
    title: 'RL Training (Isaac Lab)',
    text: 'High-speed physics simulation and policy optimization in the loop.',
  },
  {
    id: 4,
    image: '/home_main/4.png',
    title: 'Sim-to-Real Scoring',
    text: 'Validate and rank behaviors for robust deployment on real hardware.',
  },
  {
    id: 5,
    image: '/home_main/5.png',
    title: 'Fleet Deployment',
    text: 'Roll out validated policies to the SafeGuard ASF humanoid fleet.',
  },
]

const capabilities = [
  {
    id: 1,
    variant: 'text',
    title: 'Generative Text-to-CAD',
    text: 'Create robotics environments instantly using natural language.',
    image: '/home_main/6-Photoroom.png',
  },
  {
    id: 2,
    variant: 'text',
    title: 'Sim-to-Real Scoring',
    text: 'Evaluate readiness for real-world deployment.',
    image: '/home_main/5-Photoroom.png',
  },
  {
    id: 3,
    variant: 'text',
    title: 'Tokenized Compute Access',
    text: 'Token-gated access for training environments and CAD generation.',
    image: '/home_main/4-Photoroom.png',
  },
  {
    id: 4,
    variant: 'bullets',
    title: 'Dual Simulation Engines',
    bullets: [
      'Isaac Lab for high-speed training',
      'MuJoCo for high-fidelity physics validation',
    ],
    image: '/home_main/3-Photoroom.png',
  },
  {
    id: 5,
    variant: 'text',
    title: 'Teleoperation Training',
    text: 'Human-in-the-loop training via VR or joystick.',
    image: '/home_main/2-Photoroom.png',
  },
  {
    id: 6,
    variant: 'text',
    title: 'GPU Training Infrastructure',
    text: '4090 / A100 cluster for large-scale RL training.',
    image: '/home_main/1-Photoroom.png',
  },
]

const userCases = [
  {
    id: 1,
    title: 'Security & Protection Robots',
    image: '/home_main/1_r.png',
  },
  {
    id: 2,
    title: 'MMA/Fighting Robots Benchmark',
    image: '/home_main/2_r.png',
  },
  {
    id: 3,
    title: 'Training & Dojo Simulations',
    image: '/home_main/3_r.png',
  },
  {
    id: 4,
    title: 'Simulation-to-Real RL Research',
    image: '/home_main/4_r.png',
  },
]

const YOUTUBE_DEMO_URL = 'https://www.youtube.com/watch?v=ML76zIddNcA'

const HomeMain = () => {
  const location = useLocation()
  const isTestRoute = location.pathname === '/test' || location.pathname === '/test/'

  const handleWatchDemoClick = () => {
    window.open(YOUTUBE_DEMO_URL, '_blank', 'noopener,noreferrer')
  }

  const [isWaitlistPopupOpen, setIsWaitlistPopupOpen] = useState(false)
  const [waitlistLive, setWaitlistLive] = useState(() => isSrPlatformWaitlistLive())
  /** Which gated JOIN WAITLIST control is hovered (label → "Coming soon"). */
  const [gatedWaitlistHover, setGatedWaitlistHover] = useState<'hero' | 'about' | null>(null)

  /** `/test` bypasses launch gate; `/join` uses fixed launch time. */
  const waitlistUnlocked = isTestRoute || waitlistLive

  useEffect(() => {
    if (isTestRoute || waitlistLive) return
    const id = window.setInterval(() => {
      if (isSrPlatformWaitlistLive()) setWaitlistLive(true)
    }, 1000)
    return () => window.clearInterval(id)
  }, [isTestRoute, waitlistLive])

  const openWaitlistPopup = () => {
    if (!waitlistUnlocked) return
    setIsWaitlistPopupOpen(true)
  }
  const closeWaitlistPopup = () => setIsWaitlistPopupOpen(false)

  return (
    <div className="home-main-page font-orbitron">
      <PageSEO
        title={SR_PLATFORM_SEO_TITLE}
        metaDescription={SR_PLATFORM_SEO_DESCRIPTION}
        path={isTestRoute ? '/test' : '/join'}
      />
      <main className="home-main-content">
        <Header showSocialIcons />
        <motion.section
          className="home-main-hero "
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.h1
            className="home-main-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          >
            AI ROBOTICS
            <br />
            TRAINING
            <br />
            PLATFORM
          </motion.h1>
          <motion.p
            className="home-main-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          >
            A Cloud platform for training, validating, and deploying humanoid robots.
          </motion.p>

          <motion.div
            className="home-main-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.button
              type="button"
              className="home-main-btn home-main-btn-light"
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
              onClick={handleWatchDemoClick}
            >
              <span>WATCH DEMO</span>
            </motion.button>

            <motion.button
              type="button"
              className={`home-main-btn home-main-btn-dark${waitlistUnlocked ? '' : ' home-main-btn-waitlist-gated'}`}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
              onClick={openWaitlistPopup}
              onMouseEnter={() => {
                if (!waitlistUnlocked) setGatedWaitlistHover('hero')
              }}
              onMouseLeave={() => setGatedWaitlistHover(null)}
              aria-disabled={!waitlistUnlocked}
            >
              <span>
                {!waitlistUnlocked && gatedWaitlistHover === 'hero' ? 'Coming soon' : 'JOIN WAITLIST'}
              </span>
            </motion.button>
          </motion.div>
        </motion.section>
      </main>

      <section className="home-main-pipeline">
        <motion.h2
          className="pipeline-title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        >
          TRAINING PIPELINE
        </motion.h2>
        <div className="pipeline-grid">
          {pipelineSteps.map((step) => (
            <motion.div
              key={step.id}
              className="pipeline-card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                delay: 0.1 * step.id,
                duration: 0.6,
                ease: [0.4, 0, 0.2, 1],
              }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <div className="pipeline-card-body">
                <div className="pipeline-card-badge">
                  <img src={step.image} alt={`Step ${step.id}`} />
                </div>
                <div className="pipeline-card-content">
                  <h3 className="pipeline-card-title">{step.title}</h3>
                  <p className="pipeline-card-text">{step.text}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="home-main-capabilities">
        <div className="capabilities-inner">
          <motion.h2
            className="capabilities-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          >
            PLATFORM CAPABILITIES
          </motion.h2>

          <div className="capabilities-grid">
            {capabilities.map((item) => (
              <motion.div
                key={item.id}
                className={`capability-card capability-card--id-${item.id} ${item.id === 2 ? 'capability-card--text-center' : ''} ${item.id === 1 || item.id === 4 ? 'capability-card--text' : ''} ${item.id === 5 ? 'capability-card--cao' : ''} ${item.id === 4 || item.id === 6 || item.id === 2 ? 'capability-card--tall' : ''}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                  delay: 0.1 * item.id,
                  duration: 0.6,
                  ease: [0.4, 0, 0.2, 1],
                }}
                whileHover={{ y: -6, scale: 1.02 }}
              >
                {item.image && (
                  <img
                    src={item.image}
                    alt=""
                    className="capability-bg"
                    loading="lazy"
                  />
                )}
                <div className="capability-card-content">
                  <h3 className="capability-title">{item.title}</h3>
                  {item.variant === 'bullets' && item.bullets ? (
                    <ul className="capability-list">
                      {item.bullets.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="capability-text">{item.text}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <section className="home-main-usercases">
        <motion.h2
          className="usercases-title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        >
          USE CASES
        </motion.h2>
        <div className="usercases-grid">
          {userCases.map((uc) => (
            <motion.article
              key={uc.id}
              className="usercase-card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                delay: 0.1 * uc.id,
                duration: 0.6,
                ease: [0.4, 0, 0.2, 1],
              }}
              whileHover={{ y: -6, scale: 1.02 }}
            >
              <img src={uc.image} alt={uc.title} className="usercase-bg" loading="lazy" />
              <div className="usercase-content">
                <h3 className="usercase-title">{uc.title}</h3>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="home-main-about">
        <motion.div
          className="about-inner"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.div
            className="about-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: 0.1, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          >
            <h2 className="about-title-line">START TRAINING</h2>
            <h2 className="about-title-line">YOUR ROBOTS TODAY</h2>
          </motion.div>
          <motion.p
            className="about-subtitle"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: 0.2, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          >
            Join leading robotics companies using RoboRL to accelerate their development cycles.
          </motion.p>

          <motion.div
            className="about-actions"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.button
              type="button"
              className="home-main-btn home-main-btn-light"
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
              onClick={handleWatchDemoClick}
            >
              <span>WATCH DEMO</span>
            </motion.button>
            <motion.button
              type="button"
              className={`home-main-btn home-main-btn-dark${waitlistUnlocked ? '' : ' home-main-btn-waitlist-gated'}`}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
              onClick={openWaitlistPopup}
              onMouseEnter={() => {
                if (!waitlistUnlocked) setGatedWaitlistHover('about')
              }}
              onMouseLeave={() => setGatedWaitlistHover(null)}
              aria-disabled={!waitlistUnlocked}
            >
              <span>
                {!waitlistUnlocked && gatedWaitlistHover === 'about' ? 'Coming soon' : 'JOIN WAITLIST'}
              </span>
            </motion.button>
          </motion.div>

          <motion.p
            className="about-footnote"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: 0.4, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          >
            Free tier includes 100 hours of GPU training • No credit card required
          </motion.p>
        </motion.div>
      </section>
      <section className="home-main-footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-col footer-brand">
              <img src="/update.png" alt="Logo" />
            </div>
          </div>

          <div className="footer-bottom">
            <p className="footer-copy">© 2026 STRIKEROBOT.AI. All rights reserved.</p>
          </div>
        </div>
      </section>

      {isWaitlistPopupOpen && waitlistUnlocked ? (
        <WaitlistPopup onClose={closeWaitlistPopup} useTestRegisterApi={isTestRoute} />
      ) : null}
    </div>
  )
}

export default HomeMain

