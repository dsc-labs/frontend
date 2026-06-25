import type { ReactNode } from 'react'
import { EXTERNAL_LINKS } from './navigate'

export const BRAND_SOCIALS = [
  { label: 'X', href: EXTERNAL_LINKS.x },
  { label: 'GitHub', href: EXTERNAL_LINKS.github },
  { label: 'GitBook', href: EXTERNAL_LINKS.docs },
] as const

export const BRAND_SOCIAL_ICONS: Record<string, ReactNode> = {
  X: (
    <svg width="16" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.629L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  GitHub: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.203 22 16.447 22 12.021 22 6.484 17.522 2 12 2z"
      />
    </svg>
  ),
  GitBook: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 016.5 3H18v16.5A1.5 1.5 0 0116.5 21h-11A2.5 2.5 0 013 18.5V5.5zm2 0V18.5c0 .276.224.5.5.5H16.5V4.5H6.5a.5.5 0 00-.5.5zm3 2.25h6v1.5H9v-1.5zm0 3h6v1.5H9v-1.5z" />
    </svg>
  ),
}
