/**
 * X API v2: tweet metrics + tweet id from status URL (Bearer token, app-only).
 */

import { upsampleTwitterProfileImage } from './twitterAvatar'

const TWEETS_URL = 'https://api.twitter.com/2/tweets'
const USERS_BY_USERNAME = 'https://api.twitter.com/2/users/by/username'
const USERS_BY_USERNAMES = 'https://api.twitter.com/2/users/by'

export type TweetMetricsSnapshot = {
  tweetId: string
  likeCount: number
  replyCount: number
  retweetCount: number
  quoteCount: number
  /** May be 0 if API tier omits impressions. */
  impressionCount: number
  authorId: string | null
}

export type XUserPublicSnapshot = {
  username: string
  followersCount: number
  /** Upsampled profile image URL from X when available. */
  profileImageUrl?: string
  /** X display name when available. */
  name?: string
}

/** Extract numeric tweet id from x.com or twitter.com status URL. */
export function extractTweetIdFromStatusUrl(url: string): string | null {
  const m = url.trim().match(/(?:x\.com|twitter\.com)\/[^/]+\/status\/(\d+)/i)
  return m?.[1] ?? null
}

export function normalizeXUsername(handle: string): string {
  return handle.trim().replace(/^@+/, '').toLowerCase()
}

type V2Tweet = {
  id: string
  author_id?: string
  public_metrics?: {
    retweet_count?: number
    reply_count?: number
    like_count?: number
    quote_count?: number
    impression_count?: number
  }
  organic_metrics?: {
    impression_count?: number
    like_count?: number
    reply_count?: number
    retweet_count?: number
  }
}

type V2User = {
  id: string
  username?: string
  name?: string
  profile_image_url?: string
  public_metrics?: { followers_count?: number }
}

function mapXUser(d: V2User, fallbackUsername: string): XUserPublicSnapshot {
  const username = normalizeXUsername(d.username ?? fallbackUsername)
  const rawProfile = d.profile_image_url?.trim()
  return {
    username,
    followersCount: d.public_metrics?.followers_count ?? 0,
    ...(rawProfile ? { profileImageUrl: upsampleTwitterProfileImage(rawProfile) } : {}),
    ...(d.name?.trim() ? { name: d.name.trim() } : {}),
  }
}

function mapTweetMetrics(t: V2Tweet): TweetMetricsSnapshot {
  const pm = t.public_metrics ?? {}
  /** `organic_metrics` requires elevated X API access; we only request `public_metrics`. */
  const om = t.organic_metrics ?? {}
  const impressionCount =
    typeof pm.impression_count === 'number'
      ? pm.impression_count
      : typeof om.impression_count === 'number'
        ? om.impression_count
        : 0
  return {
    tweetId: t.id,
    likeCount: pm.like_count ?? om.like_count ?? 0,
    replyCount: pm.reply_count ?? om.reply_count ?? 0,
    retweetCount: pm.retweet_count ?? om.retweet_count ?? 0,
    quoteCount: pm.quote_count ?? 0,
    impressionCount,
    authorId: t.author_id ?? null,
  }
}

async function twitterJson(
  bearerToken: string,
  pathWithQuery: string,
): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
  const url = pathWithQuery.startsWith('http') ? pathWithQuery : `https://api.twitter.com/2/${pathWithQuery}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  })
  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return { ok: res.ok, status: res.status, json, text }
}

/** Up to 100 tweet ids per call (X API v2 limit). */
export async function fetchTweetMetricsByIds(
  bearerToken: string,
  tweetIds: string[],
): Promise<{ byId: Map<string, TweetMetricsSnapshot>; errors: string[] }> {
  const byId = new Map<string, TweetMetricsSnapshot>()
  const errors: string[] = []
  const unique = [...new Set(tweetIds.filter(Boolean))]
  const chunkSize = 100
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const params = new URLSearchParams()
    params.set('ids', chunk.join(','))
    params.set('tweet.fields', 'public_metrics,author_id')
    params.set('expansions', 'author_id')
    params.set('user.fields', 'public_metrics,username')
    const { ok, status, json } = await twitterJson(bearerToken, `${TWEETS_URL}?${params.toString()}`)
    if (!ok) {
      errors.push(`tweets lookup ${status}: ${JSON.stringify(json)}`.slice(0, 500))
      continue
    }
    const body = json as {
      data?: V2Tweet[]
      errors?: Array<{ detail?: string }>
    }
    if (body.errors?.length) {
      for (const e of body.errors) {
        if (e.detail) errors.push(e.detail)
      }
    }
    for (const t of body.data ?? []) {
      byId.set(t.id, mapTweetMetrics(t))
    }
  }
  return { byId, errors }
}

/** Up to 100 usernames per call (X API v2 limit). */
export async function fetchUsersByUsernames(
  bearerToken: string,
  usernames: string[],
): Promise<{ byHandle: Map<string, XUserPublicSnapshot>; errors: string[] }> {
  const byHandle = new Map<string, XUserPublicSnapshot>()
  const errors: string[] = []
  const unique = [...new Set(usernames.map((h) => normalizeXUsername(h)).filter(Boolean))]
  const chunkSize = 100
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const params = new URLSearchParams()
    params.set('usernames', chunk.join(','))
    params.set('user.fields', 'public_metrics,profile_image_url,name,username')
    const { ok, status, json } = await twitterJson(bearerToken, `${USERS_BY_USERNAMES}?${params.toString()}`)
    if (!ok) {
      errors.push(`users/by ${status}: ${JSON.stringify(json)}`.slice(0, 500))
      continue
    }
    const body = json as {
      data?: V2User[]
      errors?: Array<{ detail?: string; resource_id?: string }>
    }
    if (body.errors?.length) {
      for (const e of body.errors) {
        if (e.detail) errors.push(e.detail)
      }
    }
    for (const d of body.data ?? []) {
      if (!d?.id) continue
      const handle = normalizeXUsername(d.username ?? '')
      if (!handle) continue
      byHandle.set(handle, mapXUser(d, handle))
    }
  }
  return { byHandle, errors }
}

export async function fetchUserByUsername(
  bearerToken: string,
  username: string,
): Promise<{ user: XUserPublicSnapshot | null; error: string | null }> {
  const u = normalizeXUsername(username)
  if (!u) return { user: null, error: 'empty username' }
  const { byHandle, errors } = await fetchUsersByUsernames(bearerToken, [u])
  const user = byHandle.get(u) ?? null
  if (user) return { user, error: null }
  return { user: null, error: errors[0] ?? 'no user data' }
}
