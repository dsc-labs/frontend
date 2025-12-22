import { motion } from 'framer-motion'
import Header from '../../components/common/Header/Header'
import './About.css'
import ConcentricCircles from '../../components/Home/ConcentricCircles/ConcentricCircles'

const About = () => {
  const capabilities = [
    { label: 'Martial-arts reasoning' },
    { label: 'Fighting-style emulation' },
    { label: 'Autonomous engagement' },
  ]

  const trainingCards = [
    {
      id: 1,
      title: 'Style Reasoning Engine',
      description:
        'Teach robots to reason in distinct martial arts frameworks.',
      image: '/about-card-1.png',
      tone: 'dark',
    },
    {
      id: 2,
      title: 'Legendary Fighting Styles',
      description:
        'Emulate the signature movements of iconic fighters.',
      image: '/about-card-2.png',
      tone: 'light',
    },
    {
      id: 3,
      title: 'Autonomous Engagement Engine',
      description:
        'Perceive. Decide. Act. Repeat.',
      image: '/about-card-3.png',
      tone: 'light',
    },
  ]

  return (
    <div className="about-page">
      {/* Concentric Circles Background */}
      <ConcentricCircles />
      <Header />
      <div className="about-background">
        <div className="about-overlay" />
      </div>

      <div className="about-content">
        <motion.section
          className="about-title-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="about-lead">
            <div className="about-headline">
              <h1 className="about-title">WHAT WE DO</h1>
              <p className="about-subtitle">
                STRIKEROBOT.AI trains humanoid robots through three core intelligence pillars, turning combat into a benchmark for real-world embodied AI. We do not teach robots scripted motions. We teach them how to reason, adapt, and act physically under adversarial, dynamic conditions.
              </p>
            </div>

            <div className="capabilities-tags">
              <p className="capabilities-label">Core pillars:</p>
              {capabilities.map((cap, index) => (
                <motion.div
                  key={cap.label}
                  className="capability-tag"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                >
                  <div className="tag-corner top-left" />
                  <div className="tag-corner bottom-right" />
                  <span>{cap.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          className="training-engine-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <h2 className="training-engine-title">TRAINING ENGINE</h2>

          <div className="training-cards">
            {trainingCards.map((card, index) => (
              <motion.article
                key={card.id}
                className={`training-card ${card.tone} card-${card.id}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1, duration: 0.6 }}
              >
                <div className="card-shell">
                  <div className="card-number-badge">{card.id}</div>
                  <div className="card-image-pane">
                    <img src={card.image} alt={card.title} className="card-image" />
                    <div className="neural-scan" />
                  </div>
                  <div className="card-info">
                    <div className="card-info-corner" />
                    <h3 className="card-info-title">{card.title}</h3>
                    <p className="card-info-desc">{card.description}</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  )
}

export default About

