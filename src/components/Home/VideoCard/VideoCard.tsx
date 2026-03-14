import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import './VideoCard.css'

const YOUTUBE_VIDEO_ID = 'ML76zIddNcA'
const YOUTUBE_EMBED_URL = `https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1`
const YOUTUBE_THUMBNAIL = `https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/hqdefault.jpg`
const YOUTUBE_OEMBED_URL = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${YOUTUBE_VIDEO_ID}&format=json`

const VideoCard = () => {
  const [isHovered, setIsHovered] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoTitle, setVideoTitle] = useState<string>('')

  useEffect(() => {
    fetch(YOUTUBE_OEMBED_URL)
      .then((res) => res.json())
      .then((data: { title?: string }) => setVideoTitle(data.title ?? ''))
      .catch(() => setVideoTitle(''))
  }, [])

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
        <AnimatePresence mode="wait">
          {isPlaying ? (
            <motion.div
              key="embed"
              className="video-embed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <iframe
                src={YOUTUBE_EMBED_URL}
                title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
              <button
                type="button"
                className="video-embed-close"
                onClick={() => setIsPlaying(false)}
                aria-label="Close video"
              >
                ×
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="thumbnail"
              className="video-image"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <img src={YOUTUBE_THUMBNAIL} alt="Video Thumbnail" />
              <motion.div
                className="play-button-container"
                animate={{ scale: isHovered ? 1.1 : 1 }}
                transition={{ duration: 0.3 }}
                onClick={() => setIsPlaying(true)}
                onKeyDown={(e) => e.key === 'Enter' && setIsPlaying(true)}
                role="button"
                tabIndex={0}
                aria-label="Play video"
              >
                <div className="play-button-circle">
                  <div className="pulse-ring pulse-ring-1" />
                  <div className="pulse-ring pulse-ring-2" />
                  <div className="pulse-ring pulse-ring-3" />
                  <motion.div
                    className="play-icon"
                    animate={{ x: isHovered ? 2 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <svg
                      width="46"
                      height="46"
                      viewBox="0 0 46 46"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <polygon points="18,14 18,32 32,23" fill="white" />
                    </svg>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="video-info">
        <img src="/youtube-icon.png" alt="YouTube" />
        <span className="video-title">{videoTitle}</span>
      </div>
    </motion.div>
  )
}

export default VideoCard

