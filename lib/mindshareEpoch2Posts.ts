import { epoch2PostKey } from './mindshareEpoch2DailyState'
import {
  extractPostUrlsFromSubmissionField,
  type MindshareSubmissionRow,
} from './mindshareCsvStore'
import { postSubmittedInWindow } from './mindshareEpoch2Gmt7'
import { extractTweetIdFromStatusUrl } from './xTweetMetrics'

export type Epoch2FlattenedPost = {
  wallet: string
  walletLower: string
  xHandle: string
  name: string
  tweetId: string
  /** `null` = legacy CSV row without `submitted at` (bootstrap + first SR-eligible catch-up). */
  submittedAtMs: number | null
}

function walletKey(wallet: string): string {
  return wallet.trim().toLowerCase()
}

function parseSubmittedAtMs(raw: string | undefined): number | null {
  const t = (raw ?? '').trim()
  if (!t) return null
  const ms = Date.parse(t)
  return Number.isFinite(ms) ? ms : null
}

/** One row per tweet URL in the submissions CSV. */
export function flattenMindshareSubmissionPosts(rows: MindshareSubmissionRow[]): Epoch2FlattenedPost[] {
  const out: Epoch2FlattenedPost[] = []
  for (const row of rows) {
    const wk = walletKey(row.walletAddress)
    if (!wk.startsWith('0x') || wk.length !== 42) continue
    const submittedAtMs = parseSubmittedAtMs(row.submittedAt)
    for (const url of extractPostUrlsFromSubmissionField(row.postSubmitted)) {
      const tweetId = extractTweetIdFromStatusUrl(url)
      if (!tweetId) continue
      out.push({
        wallet: row.walletAddress.trim(),
        walletLower: wk,
        xHandle: row.xHandle.trim(),
        name: row.name.trim(),
        tweetId,
        submittedAtMs,
      })
    }
  }
  return out
}

export function walletHasCountedEpoch2Posts(walletLower: string, countedPostKeys: string[]): boolean {
  const prefix = `${walletLower}:`
  return countedPostKeys.some((k) => k.startsWith(prefix))
}

/**
 * Whether a CSV post should be scored on this daily run (SR-eligible, not already counted).
 */
export function shouldScorePostForEpoch2DailySnapshot(
  p: Epoch2FlattenedPost,
  options: {
    eligibleWallets: Set<string>
    countedKeys: Set<string>
    countedPostKeys: string[]
    postWindow: { startMs: number; endMs: number }
    isBootstrap: boolean
  },
): boolean {
  if (!options.eligibleWallets.has(p.walletLower)) return false
  if (options.countedKeys.has(epoch2PostKey(p.walletLower, p.tweetId))) return false

  if (p.submittedAtMs === null) {
    if (options.isBootstrap) {
      return postSubmittedInWindow(0, options.postWindow.startMs, options.postWindow.endMs)
    }
    return !walletHasCountedEpoch2Posts(p.walletLower, options.countedPostKeys)
  }

  return postSubmittedInWindow(p.submittedAtMs, options.postWindow.startMs, options.postWindow.endMs)
}

/** Resolve CSV posts that match `walletLower:tweetId` keys in daily state. */
export function postsMatchingCountedKeys(
  allPosts: Epoch2FlattenedPost[],
  countedKeys: string[],
): Epoch2FlattenedPost[] {
  const keySet = new Set(countedKeys)
  return allPosts.filter((p) => keySet.has(epoch2PostKey(p.walletLower, p.tweetId)))
}
