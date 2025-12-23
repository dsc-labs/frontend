import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import './VideoCard.css'

const VideoCard = () => {
  const [isHovered, setIsHovered] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const youtubeVideoId = 'fD_hJmBtKhA'
  const youtubeEmbedUrl = `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0`
  // YouTube thumbnail - using maxresdefault for best quality, with fallback to hqdefault
  const youtubeThumbnail = `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`

  const handleClick = () => {
    setIsPlaying(true)
  }

  return (
    <motion.div
      className="video-card magnetic"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.8 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: isPlaying ? 'default' : 'pointer' }}
    >
      <div className="video-thumbnail">
        <AnimatePresence mode="wait">
          {!isPlaying ? (
            <motion.div
              key="thumbnail"
              className="video-image"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={handleClick}
            >
              <img 
                src={youtubeThumbnail} 
                alt="Video Thumbnail"
                onError={(e) => {
                  // Fallback to hqdefault if maxresdefault doesn't exist
                  const target = e.target as HTMLImageElement
                  if (target.src !== `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`) {
                    target.src = `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`
                  }
                }}
              />
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
            </motion.div>
          ) : (
            <motion.div
              key="video"
              className="video-embed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <iframe
                width="100%"
                height="100%"
                src={youtubeEmbedUrl}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="YouTube video player"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="video-info">
        <img src="/youtube-icon.png" alt="Youtube Icon" />
        <span className="video-title">Strike Robot Intro</span>
      </div>
    </motion.div>
  )
}

export default VideoCard

