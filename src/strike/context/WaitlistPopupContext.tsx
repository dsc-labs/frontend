import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import WaitlistPopup from '../../components/common/WaitlistPopup/WaitlistPopup'
import { isSrPlatformWaitlistLive } from '../../lib/srPlatformWaitlistLaunch'
import { ROUTES } from '@/lib/navigate'

type WaitlistPopupContextValue = {
  openWaitlistPopup: () => void
}

const WaitlistPopupContext = createContext<WaitlistPopupContextValue | null>(null)

export function WaitlistPopupProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const isTestRoute = pathname === '/test' || pathname === '/test/'
  const [isOpen, setIsOpen] = useState(false)
  const [waitlistLive, setWaitlistLive] = useState(() => isSrPlatformWaitlistLive())
  const waitlistUnlocked = isTestRoute || waitlistLive

  useEffect(() => {
    if (isTestRoute || waitlistLive) return
    const id = window.setInterval(() => {
      if (isSrPlatformWaitlistLive()) setWaitlistLive(true)
    }, 1000)
    return () => window.clearInterval(id)
  }, [isTestRoute, waitlistLive])

  const openWaitlistPopup = useCallback(() => {
    if (!waitlistUnlocked) return
    setIsOpen(true)
  }, [waitlistUnlocked])

  const closeWaitlistPopup = useCallback(() => setIsOpen(false), [])

  const value = useMemo(() => ({ openWaitlistPopup }), [openWaitlistPopup])

  return (
    <WaitlistPopupContext.Provider value={value}>
      {children}
      {isOpen && waitlistUnlocked ? (
        <WaitlistPopup onClose={closeWaitlistPopup} useTestRegisterApi={isTestRoute} />
      ) : null}
    </WaitlistPopupContext.Provider>
  )
}

export function useWaitlistPopup() {
  return useContext(WaitlistPopupContext)
}

export function isWaitlistHref(href?: string) {
  return href === ROUTES.waitlist
}
