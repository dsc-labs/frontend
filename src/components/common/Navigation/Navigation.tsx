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
          <Link to="/about" className="nav-link magnetic">
            Training Engine
          </Link>
          <Link to="/technology-stack" className="nav-link magnetic">
            Technology
          </Link>
        </div>
        <div className="nav-column">
          <Link to="/data-platform" className="nav-link magnetic">
            Data Platform
          </Link>
          <Link to="/use-cases" className="nav-link magnetic">
            Use Cases
          </Link>
        </div>
        <div className="nav-column">
          <Link to="/docs" className="nav-link magnetic">
            Docs
          </Link>
          <Link to="/partners" className="nav-link magnetic">
            Our partners
          </Link>
        </div>
      </div>
    </motion.nav>
  )
}

export default Navigation

