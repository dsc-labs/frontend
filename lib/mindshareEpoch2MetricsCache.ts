import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { defaultEpoch2MetricsCachePath } from './mindshareEpoch2DataPaths'
import type { TweetMetricsSnapshot } from './xTweetMetrics'

export type Epoch2MetricsCacheFile = {
  updatedAt: string
  tweets: Record<
    string,
    {
      at: string
      snapshot: TweetMetricsSnapshot
    }
  >
  users: Record<
    string,
    {
      at: string
      followersCount: number
      /** Canonical @handle from X (lowercase). */
      username?: string
      /** Upsampled profile image URL from X. */
      profileImageUrl?: string
      /** X display name. */
      name?: string
    }
  >
}

export function resolveEpoch2MetricsCachePath(): string {
  return defaultEpoch2MetricsCachePath()
}

export async function readEpoch2MetricsCache(): Promise<Epoch2MetricsCacheFile> {
  try {
    const raw = await readFile(resolveEpoch2MetricsCachePath(), 'utf8')
    const j = JSON.parse(raw) as Epoch2MetricsCacheFile
    if (!j || typeof j !== 'object') throw new Error('invalid cache')
    j.tweets ??= {}
    j.users ??= {}
    return j
  } catch {
    return { updatedAt: new Date(0).toISOString(), tweets: {}, users: {} }
  }
}

export async function writeEpoch2MetricsCache(cache: Epoch2MetricsCacheFile): Promise<void> {
  const filePath = resolveEpoch2MetricsCachePath()
  await mkdir(dirname(filePath), { recursive: true })
  cache.updatedAt = new Date().toISOString()
  await writeFile(filePath, JSON.stringify(cache, null, 2), 'utf8')
}

export function cacheEntryFresh(atIso: string, ttlMs: number, nowMs: number): boolean {
  const t = Date.parse(atIso)
  if (!Number.isFinite(t)) return false
  return nowMs - t < ttlMs
}
