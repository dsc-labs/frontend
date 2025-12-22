import { motion } from 'framer-motion'

interface MenuIconProps {
  isOpen: boolean
  onClick: () => void
}

const MenuIcon = ({ isOpen, onClick }: MenuIconProps) => {
  return (
    <motion.button
      className="menu-icon"
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      aria-label="Toggle menu"
    >
      <motion.span
        className="menu-line"
        animate={{
          rotate: isOpen ? 45 : 0,
          y: isOpen ? 8 : 0,
        }}
        transition={{ duration: 0.3 }}
      />
      <motion.span
        className="menu-line"
        animate={{
          opacity: isOpen ? 0 : 1,
        }}
        transition={{ duration: 0.3 }}
      />
      <motion.span
        className="menu-line"
        animate={{
          rotate: isOpen ? -45 : 0,
          y: isOpen ? -8 : 0,
        }}
        transition={{ duration: 0.3 }}
      />
    </motion.button>
  )
}

export default MenuIcon

