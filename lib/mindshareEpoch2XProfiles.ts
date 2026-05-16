import type { Epoch2MetricsCacheFile } from './mindshareEpoch2MetricsCache'
import { cacheEntryFresh, readEpoch2MetricsCache, writeEpoch2MetricsCache } from './mindshareEpoch2MetricsCache'
import { fetchUsersByUsernames, normalizeXUsername } from './xTweetMetrics'

function userProfileStale(
  entry: Epoch2MetricsCacheFile['users'][string] | undefined,
  ttlMs: number,
  nowMs: number,
  forceRefresh: boolean,
): boolean {
  if (forceRefresh) return true
  if (!entry) return true
  if (!cacheEntryFresh(entry.at, ttlMs, nowMs)) return true
  return !entry.profileImageUrl
}

/** Fetch missing/stale X profile fields and persist to `epoch2_metrics_cache.json`. */
export async function refreshXUserProfilesInCache(params: {
  bearerToken: string
  handles: string[]
  generatedAt: string
  ttlMs: number
  nowMs: number
  forceRefresh: boolean
}): Promise<Epoch2MetricsCacheFile> {
  const cache = await readEpoch2MetricsCache()
  const handles = [...new Set(params.handles.map((h) => normalizeXUsername(h)).filter(Boolean))]
  const toFetch = handles.filter((h) => userProfileStale(cache.users[h], params.ttlMs, params.nowMs, params.forceRefresh))

  if (toFetch.length > 0) {
    const { byHandle } = await fetchUsersByUsernames(params.bearerToken, toFetch)
    for (const h of toFetch) {
      const snap = byHandle.get(h)
      const prev = cache.users[h]
      cache.users[h] = {
        at: params.generatedAt,
        followersCount: snap?.followersCount ?? prev?.followersCount ?? 0,
        username: snap?.username ?? h,
        ...(snap?.profileImageUrl ? { profileImageUrl: snap.profileImageUrl } : {}),
        ...(snap?.name ? { name: snap.name } : {}),
      }
    }
    await writeEpoch2MetricsCache(cache)
  }

  return cache
}
