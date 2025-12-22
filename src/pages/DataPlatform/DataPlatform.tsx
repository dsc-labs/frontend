import Header from '../../components/common/Header/Header'
import './DataPlatform.css'
import ConcentricCircles from '../../components/Home/ConcentricCircles/ConcentricCircles'

const DataPlatform = () => {
  return (
    <div className="data-platform-page">
      {/* Concentric Circles Background */}
      <ConcentricCircles />
      <Header showSocialIcons />

      <div className="dp-layout">
        <div className="dp-visual">
          <img
            src="/robot_data.png"
            alt="Robot Data"
            className="dp-robot-image"
          />
        </div>
        <div className="dp-panel">

          <div className="dp-panel-inner">
            {/* Decorative rectangles */}
            <div className="dp-decorative-rect dp-rect-top">
              <img src="/data.png" alt="Decorative Rect Top" />
            </div>
            <div className="dp-decorative-rect dp-rect-bottom">
              <img src="/data.png" alt="Decorative Rect Bottom" />
            </div>
            <div className='dp-panel-inner-content'>
              <div className="dp-title-wrap">
                <img src="/data_image_right.png" className='dp-image-right' alt="Decorative Rect Top" />
                <h1>Decentralized Robotics Data Platform</h1>
                <p className="dp-sub">
                  High-quality data is a critical requirement for embodied intelligence, yet robotics data is expensive and difficult to scale. STRIKEROBOT.AI addresses this challenge through a decentralized data-labeling platform tailored specifically to robotics.
                </p>
              </div>

              <div className='dp-graph-wrap'>
                {/* Desktop image */}
                <div className="dp-graph-desktop">
                  <img src="/bip_desktop.png" alt="Data Platform Desktop" className="dp-bip-image" />
                </div>
                {/* Mobile image */}
                <div className="dp-graph-mobile">
                  <img src="/bip.png" alt="Data Platform Mobile" className="dp-bip-image" />
                </div>
              </div>

              <div className='dp-cta-wrap'>
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
              </div>
            </div>
          </div>
        </div>
      </div >
    </div >
  )
}

export default DataPlatform

