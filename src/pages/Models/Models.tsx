import { motion } from 'framer-motion'
import Header from '../../components/common/Header/Header'
import ConcentricCircles from '../../components/Home/ConcentricCircles/ConcentricCircles'
import './Models.css'

interface ModelCard {
  id: number
  title: string
  metric: string
  metric2?: string
  description: string
  image: string
  imageBg?: string
}

const Models = () => {
  const modelCards: ModelCard[] = [
    {
      id: 1,
      title: "Hệ thống tay máy Cường lực 'Titan-Grip'",
      metric: 'LỰC NẮM >100KG',
      description: 'Tích hợp khóa siết & tước vũ khí.',
      image: '/models/tay 1.png',
      imageBg: '/models/tay 1.png',
    },
    {
      id: 2,
      title: 'Kích thước',
      metric: 'TRỌNG LƯỢNG <span>~95KG</span>',
      metric2: 'CHIỀU CAO <span>~185CM</span>',
      description: 'Giáp hợp kim Titan chống đạn/dao',
      image: '/models/sdf 1.png',
    },
    {
      id: 3,
      title: 'Linh hoạt',
      metric: '≥ 50 KHỚP',
      description: 'Mở rộng biên độ cho kỹ thuật MMA.',
      image: '/models/Ladsfdsfyer 2 1.png',
      imageBg: '/models/Ladsfdsfyer 2 2.png',
    },
    {
      id: 4,
      title: 'Momen xoắn',
      metric: '360 N.M',
      description: 'Sức mạnh trấn áp tức thì.',
      image: '/models/Layer 1 3.png',
    },
    {
      id: 5,
      title: 'Pin',
      metric: '~6-8H',
      description: 'Tuần tra. Pin thể rắn chống cháy nổ',
      image: '/models/Laydfsfer 2 1.png',
    },
    {
      id: 6,
      title: 'Giác quan',
      metric: '360° THREAT DETECTION',
      description: 'LiDAR + Camera nhiệt + AI Phân tích hành vi.',
      image: '/models/dfsfdfe 1.png',
    },
  ]

  return (
    <div className="models-page">
      <ConcentricCircles />
      <Header showSocialIcons />

      <div className="models-container">
        {/* Title Section */}
        <motion.div
          className="models-title-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="models-title">THE MODELS WE ARE BUILDING</h1>
          <p className="models-subtitle">
            StrikeRobot.AI huấn luyện robot theo 3 năng lực cốt lõi:
          </p>
        </motion.div>

        {/* Cards Grid */}
        <div className="models-grid">
          {modelCards.map((card, index) => (
            <motion.div
              key={card.id}
              className="model-card"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1, duration: 0.6 }}
            >
              {/* Content */}
              <div className="model-card-content">
                {/* Text Content Wrapper */}
                <div className="model-card-text-wrapper">
                  {/* Title Box */}
                  <div>
                    <div className="model-card-title-box">
                      <span className="model-card-title-text">{card.title}</span>
                    </div>
                  </div>

                  {/* Text Content */}
                  {card.id === 2 ? (
                    <>
                      <div className="model-card-text">
                        <div className="model-card-metric">
                          <div
                            className="model-metric-primary"
                            dangerouslySetInnerHTML={{ __html: card.metric }}
                          />
                          {card.metric2 && (
                            <div
                              className="model-metric-secondary"
                              dangerouslySetInnerHTML={{ __html: card.metric2 }}
                            />
                          )}
                        </div>
                      </div>
                      <p className="model-card-description">{card.description}</p>
                    </>
                  ) : (
                    <div className="model-card-text">
                      <div className="model-card-metric">
                        <div className="model-metric-primary">{card.metric}</div>
                        {card.metric2 && (
                          <div className="model-metric-secondary">{card.metric2}</div>
                        )}
                      </div>
                      <p className="model-card-description">{card.description}</p>
                    </div>
                  )}
                </div>

                {/* Image */}
                <div className="model-card-image-wrapper">
                  {card.imageBg && (
                    <div
                      className="model-card-image-bg"
                      style={{
                        backgroundImage: `url("${encodeURI(card.imageBg)}")`
                      }}
                    />
                  )}
                  {card.id === 3 ? (
                    <>
                      <div
                        className="model-card-image model-card-image-1"
                        style={{
                          backgroundImage: `url("${encodeURI(card.image)}")`
                        }}
                      />
                      <div
                        className="model-card-image model-card-image-2"
                        style={{
                          backgroundImage: `url("${encodeURI(card.imageBg || '')}")`
                        }}
                      />
                    </>
                  ) : (
                    <div
                      className="model-card-image"
                      style={{
                        backgroundImage: `url("${encodeURI(card.image)}")`
                      }}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Models
