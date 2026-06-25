import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { scrollToHash } from '@/lib/navigate'
import { SmoothScroll } from '@/components/ui/SmoothScroll'
import '@/fonts.css'
import './globals.css'

type StrikeLayoutProps = {
  children: ReactNode
}

export function StrikeLayout({ children }: StrikeLayoutProps) {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    document.body.classList.add('strike-site')
    return () => document.body.classList.remove('strike-site')
  }, [])

  useEffect(() => {
    if (!hash) return
    const id = window.setTimeout(() => scrollToHash(hash), 80)
    return () => window.clearTimeout(id)
  }, [pathname, hash])

  return <SmoothScroll>{children}</SmoothScroll>
}
