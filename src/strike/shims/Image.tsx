import type { ImgHTMLAttributes } from 'react'

type ImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string
  alt: string
  width?: number
  height?: number
  priority?: boolean
  fill?: boolean
  sizes?: string
  quality?: number
}

export default function Image({
  src,
  alt,
  width,
  height,
  priority,
  fill,
  className,
  style,
  ...rest
}: ImageProps) {
  const fillStyle = fill
    ? { position: 'absolute' as const, inset: 0, width: '100%', height: '100%', objectFit: 'cover' as const, ...style }
    : style

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={fillStyle}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      {...rest}
    />
  )
}
