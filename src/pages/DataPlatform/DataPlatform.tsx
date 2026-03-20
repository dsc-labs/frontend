import { motion } from 'framer-motion'
import Header from '../../components/common/Header/Header'
import './DataPlatform.css'
import ConcentricCircles from '../../components/Home/ConcentricCircles/ConcentricCircles'
import { DefaultPageSEO } from '../../components/common/PageSEO/PageSEO'

const DataPlatform = () => {
  return (
    <div className="data-platform-page">
      <DefaultPageSEO path="/data-platform" />
      {/* Concentric Circles Background */}
      <ConcentricCircles />
      <Header showSocialIcons />

      <div className="dp-layout">
        <motion.div
          className="dp-visual"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          <img
            src="/robot_data.png"
            alt="Robot Data"
            className="dp-robot-image"
            loading="lazy"
          />
        </motion.div>
        <motion.div
          className="dp-panel"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.div
            className="dp-panel-inner"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Decorative rectangles */}
            <div className="dp-decorative-rect dp-rect-top">
              <img src="/data.png" alt="Decorative Rect Top" loading="lazy" />
            </div>
            <div className="dp-decorative-rect dp-rect-bottom">
              <img src="/data.png" alt="Decorative Rect Bottom" loading="lazy" />
            </div>
            <div className='dp-panel-inner-content'>
              <motion.div
                className="dp-title-wrap"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              >
                <img
                  src="/data_image_right.png"
                  className='dp-image-right'
                  alt="Decorative Rect Top"
                  loading="lazy"
                />
                <h1>Decentralized Robotics Data Marketplace</h1>
                <p className="dp-sub">
                  To scale embodied AI, STRIKEROBOT.AI includes a decentralized marketplace for motion, perception, interaction, and security data. Contributors monetize uploads (e.g., trajectories, contact events) via incentives, creating a flywheel: more data improves models, driving demand and ecosystem growth. This supports operator-signature training, where expert patterns (navigation, inspections) are distilled into personalized policies for expressive, interpretable behaviors.
                </p>
              </motion.div>

              <motion.div
                className='dp-graph-wrap'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              >
                {/* Responsive image: chỉ tải bản phù hợp màn hình */}
                <picture className="dp-graph-picture">
                  <source media="(max-width: 767px)" srcSet="/bip.png" />
                  <source media="(min-width: 768px)" srcSet="/bip_desktop.png" />
                  <img
                    src="/bip_desktop.png"
                    alt="Data Platform"
                    className="dp-bip-image"
                    loading="lazy"
                  />
                </picture>
              </motion.div>

              <motion.div
                className='dp-cta-wrap'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              >
                <a
                  href="https://strikerobot.gitbook.io/strikerobot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cta-button magnetic"
                >
                  <span>Docs</span>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.28125 2.625L17.5014 10.8451C18.0872 11.4309 18.0872 12.3807 17.5014 12.9664L9.28125 21.1866" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </a>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div >
    </div >
  )
}

export default DataPlatform

