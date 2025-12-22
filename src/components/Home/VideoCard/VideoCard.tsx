import { motion } from 'framer-motion'
import { useState } from 'react'
import './VideoCard.css'

const VideoCard = () => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      className="video-card magnetic"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.8 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="video-thumbnail">
        <div className="video-image">
          <img src="/video-thumbnail.png" alt="Video Thumbnail" />
        </div>
        <motion.div
          className="play-button-container"
          animate={{
            scale: isHovered ? 1.1 : 1,
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="play-button-circle">
            <div className="pulse-ring pulse-ring-1"></div>
            <div className="pulse-ring pulse-ring-2"></div>
            <div className="pulse-ring pulse-ring-3"></div>
            <motion.div
              className="play-icon"
              animate={{
                x: isHovered ? 2 : 0,
              }}
              transition={{ duration: 0.3 }}
            >
              <svg
                width="46"
                height="46"
                viewBox="0 0 46 46"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <polygon
                  points="18,14 18,32 32,23"
                  fill="white"
                />
              </svg>
            </motion.div>
          </div>
        </motion.div>
      </div>
      <div className="video-info">
        <img src="/youtube-icon.png" alt="Youtube Icon" />
        <span className="video-title">Unitree G1 Kungfu Kid V6.0</span>
      </div>
    </motion.div>
  )
}

export default VideoCard

