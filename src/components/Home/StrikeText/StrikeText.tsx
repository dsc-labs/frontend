import { motion } from 'framer-motion'
import './StrikeText.css'

const StrikeText = () => {
  return (
    <motion.div
      className="strike-text-svg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 0.5 }}
      style={{
        backgroundImage: 'url(/Strike.png)',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'left center',
      }}
    >
      {/* Image as background for better control */}
      
      {/* Option 2: Use SVG Vector (commented out, can be used instead) */}
      {/* <svg
        width="852"
        height="160"
        viewBox="0 0 852 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="strike-svg"
      >
        <path
          d="M13 498H258.643V612.067H13V498Z"
          fill="white"
          fillOpacity="0.03"
        />
        <path
          d="M262.03 498H376.098V657.695H262.03V498Z"
          fill="white"
          fillOpacity="0.03"
        />
        <path
          d="M388.749 498H514.223V657.695H388.749V498Z"
          fill="white"
          fillOpacity="0.03"
        />
        <path
          d="M514.582 498H537.396V612.067H514.582V498Z"
          fill="white"
          fillOpacity="0.03"
        />
        <path
          d="M562.705 498H676.772V612.067H562.705V498Z"
          fill="white"
          fillOpacity="0.03"
        />
        <path
          d="M682.119 498H864.627V612.067H682.119V498Z"
          fill="white"
          fillOpacity="0.03"
        />
      </svg> */}
    </motion.div>
  )
}

export default StrikeText
