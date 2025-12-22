import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import './Logo.css'

const Logo = () => {
  return (
    <motion.div
      className="logo-container"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <Link to="/" className="logo-link">
        <img src="/logo.png" alt="Logo" />
      </Link>
    </motion.div>
  )
}

export default Logo

