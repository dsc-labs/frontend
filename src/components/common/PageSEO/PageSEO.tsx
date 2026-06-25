import { Helmet } from 'react-helmet-async'

/** Production site origin — used for canonical and Open Graph URLs */
export const SITE_ORIGIN = 'https://strikerobot.ai'

/** Shared SEO for every route except `/sr-platform` — edit here only */
export const DEFAULT_SEO_TITLE = 'STRIKE ROBOT — The 3D spatial creation platform for intelligent robots'
export const DEFAULT_SEO_DESCRIPTION =
  'SR Platform generates physics-valid simulation environments, production-grade 3D assets, and training-ready datasets — from a single natural language description.'

/** `/sr-platform` only — customize in HomeMain.tsx */
export const SR_PLATFORM_SEO_TITLE = 'SR Platform — AI Robotics Training'
export const SR_PLATFORM_SEO_DESCRIPTION =
  'SR Platform is an embodied AI training stack. It transforms real-world data into executable robot policies.'

export type PageSEOProps = {
  /** Short page title (brand suffix added automatically unless title already includes STRIKEROBOT) */
  title: string
  metaDescription: string
  /** Path only, e.g. `/about` or `/sr-platform` */
  path: string
  /** Absolute image URL or path starting with / (resolved against SITE_ORIGIN) */
  image?: string
  /** Set true to discourage indexing (e.g. staging) */
  noIndex?: boolean
}

function normalizePath(path: string) {
  if (!path || path === '/') return '/'
  return path.startsWith('/') ? path : `/${path}`
}

function resolveImage(image?: string) {
  if (!image) return `${SITE_ORIGIN}/preview.png`
  if (image.startsWith('http')) return image
  return `${SITE_ORIGIN}${image.startsWith('/') ? image : `/${image}`}`
}

/**
 * Per-route title, meta description, canonical, Open Graph, and Twitter Card tags.
 */
export function PageSEO({ title, metaDescription, path, image, noIndex }: PageSEOProps) {
  const normalizedPath = normalizePath(path)
  const url = `${SITE_ORIGIN}${normalizedPath === '/' ? '' : normalizedPath}`
  const ogImage = resolveImage(image)
  const fullTitle = /strikerobot/i.test(title) ? title : `${title} | STRIKEROBOT.AI`

  return (
    <Helmet>
      <html lang="en" />
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={url} />

      <meta property="og:site_name" content="STRIKEROBOT.AI" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:secure_url" content={ogImage} />
      <meta property="og:locale" content="en_US" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@strikerobot" />
      <meta name="twitter:creator" content="@strikerobot" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={ogImage} />

      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
    </Helmet>
  )
}

/**
 * Same title & description on all pages; only `path` (canonical + og:url) changes per route.
 * Use {@link PageSEO} on `/sr-platform` with {@link SR_PLATFORM_SEO_TITLE} / {@link SR_PLATFORM_SEO_DESCRIPTION}.
 */
export function DefaultPageSEO({
  path,
  image,
  noIndex,
}: Pick<PageSEOProps, 'path' | 'image' | 'noIndex'>) {
  return (
    <PageSEO
      title={DEFAULT_SEO_TITLE}
      metaDescription={DEFAULT_SEO_DESCRIPTION}
      path={path}
      image={image}
      noIndex={noIndex}
    />
  )
}
