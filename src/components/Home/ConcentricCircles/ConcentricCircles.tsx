import { motion } from 'framer-motion'
import './ConcentricCircles.css'

const ConcentricCircles = () => {
    return (
        <motion.div
            className="concentric-circles-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
        >
            <div className="concentric-circles-background" />
        </motion.div>
    )
}

export default ConcentricCircles
