/**
 * X API v2: tweet metrics + tweet id from status URL (Bearer token, app-only).
 */

const TWEETS_URL = 'https://api.twitter.com/2/tweets'
const USERS_BY_USERNAME = 'https://api.twitter.com/2/users/by/username'

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
  public_metrics?: { followers_count?: number }
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

export async function fetchUserByUsername(
  bearerToken: string,
  username: string,
): Promise<{ user: XUserPublicSnapshot | null; error: string | null }> {
  const u = normalizeXUsername(username)
  if (!u) return { user: null, error: 'empty username' }
  const params = new URLSearchParams()
  params.set('user.fields', 'public_metrics')
  const { ok, status, json } = await twitterJson(
    bearerToken,
    `${USERS_BY_USERNAME}/${encodeURIComponent(u)}?${params.toString()}`,
  )
  if (!ok) {
    return { user: null, error: `users/by/username ${status}: ${JSON.stringify(json)}`.slice(0, 400) }
  }
  const body = json as { data?: V2User; errors?: Array<{ detail?: string }> }
  const d = body.data
  if (!d?.id) return { user: null, error: body.errors?.[0]?.detail ?? 'no user data' }
  return {
    user: {
      username: d.username ?? u,
      followersCount: d.public_metrics?.followers_count ?? 0,
    },
    error: null,
  }
}
