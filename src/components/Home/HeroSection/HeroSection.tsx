import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import TextScramble from '../../common/TextScramble/TextScramble'
import './HeroSection.css'

const HeroSection = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1023)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const titleLines = [
    'EMBODIED HUMANOID',
    'COMBAT INTELLIGENCE',
    'PLATFORM',
  ]

  return (
    <motion.div
      className="hero-section"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <div className="hero-title">
        {titleLines.map((line, index) => (
          <motion.h1
            key={index}
            className="hero-line"
            initial={{ opacity: 0, x: isMobile ? 0 : -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.15, duration: 0.6 }}
          >
            <TextScramble text={line} speed={30} />
          </motion.h1>
        ))}
      </div>
    </motion.div>
  )
}

export default HeroSection
