import { motion } from 'framer-motion'
import Header from '../../components/common/Header/Header'
import './About.css'
import ConcentricCircles from '../../components/Home/ConcentricCircles/ConcentricCircles'

const About = () => {
  const capabilities = [
    {
      label: 'Emergency Intervention',
    },
    { label: 'Distance Switching' },
    {
      label: 'Safe Contact Protocol',
    },
  ]

  const trainingCards = [
    {
      id: 1,
      title: 'Style Reasoning Engine',
      description:
        'Physics-accurate modeling of Unitree G1 dynamics, actuator limits, contact forces, latency, and sensor noise',
      image: '/about-card-1.png',
      tone: 'dark',
    },
    {
      id: 2,
      title: 'Legendary Fighting Styles',
      description:
        'Industrial environments with stairs, catwalks, confined spaces, hazards (smoke, heat sources, simulated leaks)',
      image: '/about-card-2.png',
      tone: 'light',
    },
    {
      id: 3,
      title: 'Autonomous Engagement Engine',
      description:
        'Multi-robot fleet scenarios for collective intelligence testing',
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
                STRIKEROBOT.AI is a full-stack embodied intelligence platform building humanoid robots framework for Physical AI Business Process Outsourcing (BPO), focused on security and safety in high-risk environments like nuclear plants, high-voltage facilities, and radiation zones.
              </p>
            </div>

            <div className="capabilities-tags">
              <p className="capabilities-label">Core rules ensure predictability:
              </p>
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
          <h2 className="training-engine-title">TRAINING METHODOLOGY</h2>

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

