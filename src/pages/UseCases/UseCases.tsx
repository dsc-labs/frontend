import { motion } from 'framer-motion'
import { useRef } from 'react'
import Header from '../../components/common/Header/Header'
import ConcentricCircles from '../../components/Home/ConcentricCircles/ConcentricCircles'
import './UseCases.css'

interface UseCaseCardProps {
  useCase: {
    id: number
    title: string
    image: string
    video?: string
    position: string
    background?: string
  }
  index: number
}

const UseCaseCard = ({ useCase, index }: UseCaseCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Ignore autoplay errors
      })
    }
  }

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }

  return (
    <motion.div
      className={`use-case-card use-case-card-${useCase.position}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.1, duration: 0.6 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="use-case-card-bg">
        {/* Background Image - Base layer */}
        {useCase.background && (
          <div
            className="use-case-background"
            style={{ backgroundImage: `url(${useCase.background})` }}
          />
        )}
        {/* Static Image - Grayscale when not hovered */}
        <div
          className="use-case-image use-case-image-static"
          style={{ backgroundImage: `url(${useCase.image})` }}
        />
        {/* Video Background - Shows on hover (optional) */}
        {useCase.video && (
          <video
            ref={videoRef}
            className="use-case-video"
            src={useCase.video}
            loop
            muted
            playsInline
            preload="metadata"
          />
        )}
        {/* Color Image Overlay - Shows on hover if no video */}
        {!useCase.video && (
          <div
            className="use-case-image use-case-image-color"
            style={{ backgroundImage: `url(${useCase.image})` }}
          />
        )}
        <div className="use-case-gradient" />
      </div>
      <div className="use-case-corner-cut">
        <img src="/image_grid_use_case.png" alt="Corner Cut" />
      </div>
      <h2 className="use-case-title">{useCase.title}</h2>
    </motion.div>
  )
}

const UseCases = () => {
  const useCases = [
    {
      id: 1,
      title: 'Security & Protection Robots',
      image: '/robot_1.png', // Background image
      video: '/use-case-1-video.mp4', // Optional video for hover
      position: 'top-left',
      background: '/background_1.jpg',
    },
    {
      id: 2,
      title: 'MMA/Fighting Robots Benchmark',
      image: '/robot_2.png',
      video: '/use-case-2-video.mp4',
      position: 'top-right',
      background: '/background_2.jpg',
    },
    {
      id: 3,
      title: 'Training & Dojo Simulations',
      image: '/robot_3.png',
      video: '/use-case-3-video.mp4',
      position: 'bottom-left',
      background: '/background_3.jpg',
    },
    {
      id: 4,
      title: 'Simulation-to-Real RL Research',
      image: '/robot_4.png',
      video: '/use-case-4-video.mp4',
      position: 'bottom-right',
      background: '/background_4.jpg',
    },
  ]

  return (
    <div className="use-cases-page">
      <ConcentricCircles />
      <Header showSocialIcons />

      <div className="use-cases-container">
        {/* Title Section */}
        <motion.div
          className="use-cases-title-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="use-cases-title">USE CASES</h1>
          <p className="use-cases-subtitle">The combat-data layer for robotics.</p>
        </motion.div>

        {/* Cards Grid */}
        <div className="use-cases-grid">
          {useCases.map((useCase, index) => (
            <UseCaseCard key={useCase.id} useCase={useCase} index={index} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default UseCases

