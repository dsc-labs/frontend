import { useRef } from 'react'
import { motion } from 'framer-motion'
import Header from '../../components/common/Header/Header'
import HeroSection from '../../components/Home/HeroSection/HeroSection'
import VideoCard from '../../components/Home/VideoCard/VideoCard'
import StrikeText from '../../components/Home/StrikeText/StrikeText'
import RobotText from '../../components/Home/RobotText/RobotText'
import ConcentricCircles from '../../components/Home/ConcentricCircles/ConcentricCircles'
import './Home.css'

const Home = () => {
  const backgroundRef = useRef<HTMLDivElement>(null)

  return (
    <div className="home-page">
      {/* Concentric Circles Background */}
      <ConcentricCircles />

      {/* Background with ROBOT text */}
      <motion.div
        ref={backgroundRef}
        className="home-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <RobotText />
      </motion.div>

      {/* STRIKE text - above robot image */}
      <StrikeText />

      {/* Header */}
      <Header showSocialIcons={true} />

      {/* Hero Section */}
      <HeroSection />

      {/* Robot Image */}
      <div className="robot-container">
        <div className="robot-image">
          <img src="/robot.png" alt="Robot" />
        </div>
      </div>

      {/* CTA Section */}
      <motion.div
        className="cta-section"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <p className="cta-description">
          Train robots to fight, protect, and reason through martial arts — from
          simulation to real-world autonomy.
        </p>
        <motion.button
          className="cta-button magnetic"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span>Early Access (Coming Soon)</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9.28125 2.625L17.5014 10.8451C18.0872 11.4309 18.0872 12.3807 17.5014 12.9664L9.28125 21.1866" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </motion.button>
      </motion.div>

      {/* Video Card */}
      <VideoCard />
    </div>
  )
}

export default Home
