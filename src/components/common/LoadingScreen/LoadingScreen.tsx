import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './LoadingScreen.css'

interface LoadingScreenProps {
  onComplete: () => void
}

const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [showGlitch, setShowGlitch] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    // Start glitch effect after a short delay
    const glitchTimer = setTimeout(() => {
      setShowGlitch(true)
    }, 300)

    // Complete loading after animation
    const completeTimer = setTimeout(() => {
      setIsComplete(true)
      setTimeout(() => {
        onComplete()
      }, 500)
    }, 2500)

    return () => {
      clearTimeout(glitchTimer)
      clearTimeout(completeTimer)
    }
  }, [onComplete])

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          className="loading-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        >
          <div className="loading-content">
            <motion.div
              className="loading-logo"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className={`logo-container-loading ${showGlitch ? 'glitch' : ''}`}>
                <div className="logo-text">
                  <img src="/logo.png" alt="Strike" />
                </div>
              </div>
            </motion.div>

            <motion.div
              className="loading-progress"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 2, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default LoadingScreen

