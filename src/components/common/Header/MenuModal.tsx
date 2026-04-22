import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import './MenuModal.css'

interface MenuModalProps {
  isOpen: boolean
  onClose: () => void
}

type NavLinkItem =
  | { to: string; label: string; isFeatured?: boolean }
  | { href: string; label: string; isFeatured?: boolean }

const MenuModal = ({ isOpen, onClose }: MenuModalProps) => {
  const navLinks: NavLinkItem[] = [
    { to: '/', label: 'SR Agentic' },
    { to: '/sr-platform', label: 'SR Platform' },
    {
      href: 'https://app.virtuals.io/virtuals/70972',
      label: 'SR Token',
    },
    { to: '/about', label: 'Training Engine' },
    { to: '/technology-stack', label: 'Technology' },
    { to: '/use-cases', label: 'Use Cases' },
    {
      href: 'https://github.com/orgs/StrikeRobot/repositories',
      label: 'Public Repos',
    },
    {
      href: 'https://arxiv.org/abs/2603.25353',
      label: 'Publications',
    },
    { to: '/mindshare-challenge', label: 'Mindshare Challenge' },
    { to: '/leaderboard', label: 'Leaderboard' },
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
            <div className="menu-header">
              <button
                type="button"
                className="menu-close-button"
                onClick={onClose}
                aria-label="Close menu"
              >
                <img
                  src="/icon_header_modal.png"
                  alt=""
                  className="menu-close-icon"
                />
              </button>
            </div>
            <nav className="menu-nav">
              {navLinks.map((link, index) => (
                <motion.div
                  key={'to' in link ? link.to : link.href}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {'to' in link ? (
                    <Link
                      to={link.to}
                      className={`menu-link ${link.isFeatured ? 'menu-link-featured' : ''}`}
                      onClick={onClose}
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className={`menu-link ${link.isFeatured ? 'menu-link-featured' : ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onClose}
                    >
                      {link.label}
                    </a>
                  )}
                  {index < navLinks.length - 1 && <div className="menu-divider" />}
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

