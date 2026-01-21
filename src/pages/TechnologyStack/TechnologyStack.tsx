import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Header from '../../components/common/Header/Header'
import ConcentricCircles from '../../components/Home/ConcentricCircles/ConcentricCircles'
import './TechnologyStack.css'

const TechnologyStack = () => {
  const listRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(listRef, { once: true, margin: '-100px' })

  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI']

  const technologies = [
    {
      id: 1,
      title: 'Perception Layer',
      isActive: true, // Item đầu tiên có background đen khi hover
      image: '/tech-1.jpg', // Optional background image
    },
    {
      id: 2,
      title: 'Understanding Layer',
      isActive: false,
    },
    {
      id: 3,
      title: 'Object Metadata Layer',
      isActive: false,
    },
    {
      id: 4,
      title: 'Decision Layer - The Agentic System',
      isActive: false,
    },
    {
      id: 5,
      title: 'Planning Layer',
      isActive: false,
    },
    {
      id: 6,
      title: 'Action Layer - MMA-Inspired Action Learning',
      isActive: false,
    },
  ]

  return (
    <div className="technology-stack-page">
      <ConcentricCircles />
      <Header showSocialIcons />

      <div className="technology-stack-container">
        {/* Title Section */}
        <motion.div
          className="technology-stack-title-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="technology-stack-title">Six-Layer Architecture</h1>
          <p className="technology-stack-subtitle">The system operates through a hierarchical pipeline where each layer communicates seamlessly for real-time, intelligent behavior.
          </p>
        </motion.div>

        {/* Technology Items List */}
        <div ref={listRef} className="technology-stack-list">
          {technologies.map((tech, index) => (
            <motion.div
              key={tech.id}
              className={`tech-item ${tech.isActive ? 'tech-item-active' : ''}`}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
              transition={{ delay: index * 0.1, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="tech-item-bg">
                {tech.image && (
                  <div
                    className="tech-item-image"
                    style={{ backgroundImage: `url(${tech.image})` }}
                  />
                )}
              </div>
              <div className="tech-item-corner-cut">
                <img src="/tech_grid.png" alt="Corner Cut" />
              </div>
              <div className="tech-item-content">
                <h2 className="tech-item-title">{tech.title}</h2>
                <span className="tech-item-number">{romanNumerals[index]}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TechnologyStack

