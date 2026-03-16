import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import './Navigation.css'

const Navigation = () => {
  return (
    <motion.nav
      className="navigation"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="nav-grid">
        <div className="nav-column">
          <Link to="/" className="nav-link magnetic">
            SR Agentic
          </Link>
          <Link to="/sr-platform" className="nav-link magnetic">
            SR Platform
          </Link>
        </div>
        <div className="nav-column">
          <Link to="/about" className="nav-link magnetic">
            Training Engine
          </Link>
          <Link to="/technology-stack" className="nav-link magnetic">
            Technology
          </Link>
        </div>
        <div className="nav-column">
          <Link to="/use-cases" className="nav-link magnetic">
            Use Cases
          </Link>
        </div>
      </div>
    </motion.nav>
  )
}

export default Navigation

