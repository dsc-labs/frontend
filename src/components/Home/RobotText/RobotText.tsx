import { motion } from 'framer-motion'
import './RobotText.css'

const RobotText = () => {
  return (
    <motion.div
      className="robot-text-svg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 0.7 }}
      style={{
        backgroundImage: 'url(/Robot_text.png)',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right center',
      }}
    >
      {/* Image as background for better control */}
      
      {/* Option 2: Use SVG Vector (commented out, can be used instead) */}
      {/* <svg
        width="765"
        height="205"
        viewBox="0 0 765 205"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="robot-svg"
      >
        <path
          d="M0 0H146.168V146.168H0V0Z"
          fill="white"
          fillOpacity="0.03"
        />
        <path
          d="M155.528 0H301.696V146.168H155.528V0Z"
          fill="white"
          fillOpacity="0.03"
        />
        <path
          d="M318.599 0H464.767V146.168H318.599V0Z"
          fill="white"
          fillOpacity="0.03"
        />
        <path
          d="M478.928 0H625.096V146.168H478.928V0Z"
          fill="white"
          fillOpacity="0.03"
        />
        <path
          d="M618.929 0H765.097V204.635H618.929V0Z"
          fill="white"
          fillOpacity="0.03"
        />
      </svg> */}
    </motion.div>
  )
}

export default RobotText
