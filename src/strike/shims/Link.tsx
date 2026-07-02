import { Link as RouterLink, useNavigate, type LinkProps as RouterLinkProps } from 'react-router-dom'
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { isProxiedAppHref, navigateApp } from '@/lib/navigate'

type LinkProps = Omit<RouterLinkProps, 'to'> & {
  href: string
  children: ReactNode
} & Pick<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'onClick' | 'aria-label' | 'aria-expanded' | 'aria-hidden'>

export default function Link({ href, children, onClick, ...rest }: LinkProps) {
  const navigate = useNavigate()

  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
    return (
      <a href={href} onClick={onClick} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    )
  }

  if (isProxiedAppHref(href)) {
    return (
      <a href={href} onClick={onClick} {...rest}>
        {children}
      </a>
    )
  }

  if (href.startsWith('/#')) {
    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e)
      e.preventDefault()
      navigateApp(href, navigate, window.location.pathname)
    }
    return (
      <a href={href} onClick={handleClick} {...rest}>
        {children}
      </a>
    )
  }

  const hashAt = href.indexOf('#')
  if (hashAt > 0 && href.startsWith('/')) {
    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e)
      e.preventDefault()
      navigateApp(href, navigate, window.location.pathname)
    }
    return (
      <a href={href} onClick={handleClick} {...rest}>
        {children}
      </a>
    )
  }

  if (href.startsWith('#')) {
    return (
      <a href={href} onClick={onClick} {...rest}>
        {children}
      </a>
    )
  }

  return (
    <RouterLink to={href} onClick={onClick} {...rest}>
      {children}
    </RouterLink>
  )
}
