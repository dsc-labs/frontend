/**
 * Avatar HTTP handler logic: Twitter API first, then Unavatar with
 * in-memory cache + per-minute rate limit for upstream Unavatar fetches.
 */

import { normalizeTwitterUsername, tryTwitterProfileImageUrl } from './twitterAvatar'

export type AvatarResolveResult =
  | { kind: 'redirect'; url: string }
  | { kind: 'image'; body: Uint8Array; contentType: string }
  | { kind: 'rate_limited' }

type CachedImage = {
  body: Uint8Array
  contentType: string
  expires: number
}

const unavatarCache = new Map<string, CachedImage>()
/** Timestamps (ms) of started Unavatar upstream fetches in the sliding window */
const unavatarFetchStarts: number[] = []

const WINDOW_MS = 60_000
const DEFAULT_MAX_PER_MIN = 30
const DEFAULT_CACHE_TTL_MS = 86_400_000
const MAX_CACHE_ENTRIES = 2000

function readIntEnv(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

export type ResolveAvatarOptions = {
  maxUnavatarPerMinute?: number
  cacheTtlMs?: number
}

function maxUnavatarPerMinute(opts?: ResolveAvatarOptions): number {
  if (opts?.maxUnavatarPerMinute != null && opts.maxUnavatarPerMinute > 0) {
    return Math.floor(opts.maxUnavatarPerMinute)
  }
  return readIntEnv(process.env.UNAVATAR_MAX_PER_MINUTE, DEFAULT_MAX_PER_MIN)
}

function cacheTtlMs(opts?: ResolveAvatarOptions): number {
  if (opts?.cacheTtlMs != null && opts.cacheTtlMs > 0) {
    return Math.floor(opts.cacheTtlMs)
  }
  return readIntEnv(process.env.UNAVATAR_CACHE_TTL_MS, DEFAULT_CACHE_TTL_MS)
}

function trimFetchWindow(now: number) {
  while (unavatarFetchStarts.length > 0 && unavatarFetchStarts[0]! < now - WINDOW_MS) {
    unavatarFetchStarts.shift()
  }
}

function pruneExpiredCache(now: number) {
  for (const [k, v] of unavatarCache) {
    if (v.expires < now) {
      unavatarCache.delete(k)
    }
  }
  while (unavatarCache.size > MAX_CACHE_ENTRIES) {
    const first = unavatarCache.keys().next().value
    if (first === undefined) break
    unavatarCache.delete(first)
  }
}

function unavatarUpstreamUrl(cleanUsername: string) {
  return `https://unavatar.io/twitter/${encodeURIComponent(cleanUsername)}`
}

export async function resolveAvatar(
  rawUsername: string,
  bearerToken: string | undefined,
  opts?: ResolveAvatarOptions,
): Promise<AvatarResolveResult> {
  const clean = normalizeTwitterUsername(rawUsername)
  if (!clean) {
    return { kind: 'rate_limited' }
  }

  const twitterUrl = await tryTwitterProfileImageUrl(clean, bearerToken)
  if (twitterUrl) {
    return { kind: 'redirect', url: twitterUrl }
  }

  const now = Date.now()
  const cacheKey = clean.toLowerCase()

  pruneExpiredCache(now)
  const hit = unavatarCache.get(cacheKey)
  if (hit && hit.expires > now) {
    return { kind: 'image', body: hit.body, contentType: hit.contentType }
  }

  trimFetchWindow(now)
  if (unavatarFetchStarts.length >= maxUnavatarPerMinute(opts)) {
    return { kind: 'rate_limited' }
  }

  unavatarFetchStarts.push(now)

  try {
    const resp = await fetch(unavatarUpstreamUrl(clean), { redirect: 'follow' })
    if (!resp.ok) {
      unavatarFetchStarts.pop()
      return { kind: 'rate_limited' }
    }
    const buf = new Uint8Array(await resp.arrayBuffer())
    const contentType = resp.headers.get('content-type') ?? 'image/jpeg'
    const expires = now + cacheTtlMs(opts)
    unavatarCache.set(cacheKey, { body: buf, contentType, expires })
    return { kind: 'image', body: buf, contentType }
  } catch {
    unavatarFetchStarts.pop()
    return { kind: 'rate_limited' }
  }
}
