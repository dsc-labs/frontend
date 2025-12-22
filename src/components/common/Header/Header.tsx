import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Logo from '../Logo/Logo'
import Navigation from '../Navigation/Navigation'
import SocialIcons from '../../Home/SocialIcons/SocialIcons'
import MenuIcon from './MenuIcon'
import MenuModal from './MenuModal'
import './Header.css'

interface HeaderProps {
    showSocialIcons?: boolean
}

const Header = ({ showSocialIcons = true }: HeaderProps) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isScrolled, setIsScrolled] = useState(false)

    useEffect(() => {
        let ticking = false
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrollPosition = window.scrollY
                    setIsScrolled(scrollPosition > 10)
                    ticking = false
                })
                ticking = true
            }
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen)
    }

    const closeMenu = () => {
        setIsMenuOpen(false)
    }

    return (
        <>
            <header className={`page-header ${isScrolled ? 'scrolled' : ''}`}>
                {showSocialIcons ? (
                    <motion.div
                        className="social-icons-top"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                    >
                        <SocialIcons />
                    </motion.div>
                ) : (
                    <div></div>
                )}

                <Logo />

                <div className="header-right">
                    <Navigation />
                    <MenuIcon isOpen={isMenuOpen} onClick={toggleMenu} />
                </div>
            </header>
            <MenuModal isOpen={isMenuOpen} onClose={closeMenu} />
        </>
    )
}

export default Header

