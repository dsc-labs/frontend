import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import './MenuModal.css'

interface MenuModalProps {
  isOpen: boolean
  onClose: () => void
}

const MenuModal = ({ isOpen, onClose }: MenuModalProps) => {
  const navLinks = [
    { to: '/about', label: 'Training Engine' },
    { to: '/technology-stack', label: 'Technology' },
    { to: '/data-platform', label: 'Data Platform' },
    { to: '/use-cases', label: 'Use Cases' },
    { to: '/docs', label: 'Docs' },
    { to: '/partners', label: 'Our partners' },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="menu-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />
          <motion.div
            className="menu-modal"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <nav className="menu-nav">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.to}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={link.to}
                    className="menu-link"
                    onClick={onClose}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default MenuModal

