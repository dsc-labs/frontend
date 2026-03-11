import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import './VideoCard.css'

const YOUTUBE_VIDEO_ID = 'ML76zIddNcA'

const VideoCard = () => {
  const [isHovered, setIsHovered] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoTitle, setVideoTitle] = useState<string>('')
  const youtubeEmbedUrl = `https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1`
  const youtubeThumbnail = `https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/maxresdefault.jpg`

  useEffect(() => {
    fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${YOUTUBE_VIDEO_ID}&format=json`
    )
      .then((res) => res.json())
      .then((data) => setVideoTitle(data.title))
      .catch(() => setVideoTitle('Video'))
  }, [])

  return (
    <>
    <motion.div
      className="video-card magnetic"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.8 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsPlaying(true)}
      style={{ cursor: 'pointer' }}
    >
      <div className="video-thumbnail">
        <motion.div
          className="video-image"
          initial={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <img 
            src={youtubeThumbnail} 
            alt="Video Thumbnail"
            onError={(e) => {
              // Fallback to hqdefault if maxresdefault doesn't exist
              const target = e.target as HTMLImageElement
              if (target.src !== `https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/hqdefault.jpg`) {
                target.src = `https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/hqdefault.jpg`
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
      </div>
      <div className="video-info">
        <img src="/youtube-icon.png" alt="Youtube Icon" />
        <span className="video-title">{videoTitle || 'Video'}</span>
      </div>
    </motion.div>

    <AnimatePresence>
    {isPlaying && (
      <motion.div
        className="video-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsPlaying(false)}
      >
        <motion.div
          className="video-modal"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="video-modal-close"
            onClick={() => setIsPlaying(false)}
            aria-label="Close video"
          >
            ×
          </button>
          <div className="video-embed">
            <iframe
              src={youtubeEmbedUrl}
              title={videoTitle || 'Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </motion.div>
      </motion.div>
    )}
    </AnimatePresence>
    </>
  )
}

export default VideoCard

