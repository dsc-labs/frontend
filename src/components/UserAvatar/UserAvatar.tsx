import { useState } from 'react'
import type { CSSProperties } from 'react'
import './UserAvatar.css'

type AvatarLoadMode = 'csv' | 'api' | 'fallback'

function avatarSeed(name: string) {
  return Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0)
}

export function avatarProxyUrl(username: string) {
  const handle = username.startsWith('@') ? username.slice(1) : username
  return `/api/avatar?username=${encodeURIComponent(handle)}`
}

export function xProfileUrl(username: string) {
  const handle = username.startsWith('@') ? username.slice(1) : username
  return `https://x.com/${encodeURIComponent(handle)}`
}

type UserAvatarProps = {
  username: string
  csvAvatarUrl?: string
  size?: number
  className?: string
}

export default function UserAvatar({ username, csvAvatarUrl, size = 30, className }: UserAvatarProps) {
  const trimmedCsv = csvAvatarUrl?.trim() ?? ''
  const [mode, setMode] = useState<AvatarLoadMode>(() => (trimmedCsv ? 'csv' : 'api'))

  const sizeStyle = { width: size, height: size } as CSSProperties

  if (mode === 'fallback') {
    return (
      <span
        className={['user-avatar', 'user-avatar--fallback', className].filter(Boolean).join(' ')}
        style={{ ...sizeStyle, '--avatar-seed': avatarSeed(username) } as CSSProperties}
        aria-hidden="true"
      >
        {username[0]?.toUpperCase() ?? 'U'}
      </span>
    )
  }

  const src = mode === 'csv' && trimmedCsv ? trimmedCsv : avatarProxyUrl(username)

  return (
    <img
      key={src}
      src={src}
      alt=""
      className={['user-avatar', 'user-avatar-img', className].filter(Boolean).join(' ')}
      style={sizeStyle}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (mode === 'csv' && trimmedCsv) {
          setMode('api')
        } else {
          setMode('fallback')
        }
      }}
    />
  )
}
