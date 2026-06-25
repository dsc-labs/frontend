import type { NavigateFunction } from 'react-router-dom'

export const ROUTES = {
  home: '/',
  about: '/',
  agentic: '/agentic',
  srPlatform: '/sr-platform',
  simulation: '/simulation/app/',
  waitlist: '/join',
  mindshareChallenge: '/mindshare-challenge',
  mindshareSubmit: '/mindshare-submit',
} as const

export const EXTERNAL_LINKS = {
  x: 'https://x.com/StrikeRobot_ai',
  github: 'https://github.com/strikerobot',
  docs: 'https://strikerobot.gitbook.io/strikerobot',
} as const

export function scrollToHash(hash: string) {
  const id = hash.startsWith('#') ? hash.slice(1) : hash
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

/** In-app navigation: routes, same-page hashes, and cross-page `/#section` links. */
export function navigateApp(href: string, navigate: NavigateFunction, pathname: string) {
  if (href === '#') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
    window.open(href, '_blank', 'noopener,noreferrer')
    return
  }

  if (href.startsWith('/simulation/')) {
    window.location.assign(href)
    return
  }

  if (href.startsWith('/#')) {
    const hash = href.slice(1)
    const base = href.split('#')[0] || '/'
    if (pathname === base) {
      scrollToHash(hash)
      return
    }
    navigate(base)
    window.setTimeout(() => scrollToHash(hash), 120)
    return
  }

  const hashAt = href.indexOf('#')
  if (hashAt > 0 && href.startsWith('/')) {
    const base = href.slice(0, hashAt) || '/'
    const hash = href.slice(hashAt)
    if (pathname === base) {
      scrollToHash(hash)
      return
    }
    navigate(`${base}${hash}`)
    window.setTimeout(() => scrollToHash(hash), 120)
    return
  }

  if (href.startsWith('#')) {
    scrollToHash(href)
    return
  }

  if (href.startsWith('/')) {
    navigate(href)
    return
  }

  navigate(href)
}
