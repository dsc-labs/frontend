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

/** One row per unique `walletLower:tweetId` in the submissions CSV (duplicate CSV rows ignored). */
export function flattenMindshareSubmissionPosts(rows: MindshareSubmissionRow[]): Epoch2FlattenedPost[] {
  const out: Epoch2FlattenedPost[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    const wk = walletKey(row.walletAddress)
    if (!wk.startsWith('0x') || wk.length !== 42) continue
    const submittedAtMs = parseSubmittedAtMs(row.submittedAt)
    for (const url of extractPostUrlsFromSubmissionField(row.postSubmitted)) {
      const tweetId = extractTweetIdFromStatusUrl(url)
      if (!tweetId) continue
      const key = epoch2PostKey(wk, tweetId)
      if (seen.has(key)) continue
      seen.add(key)
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
    // Legacy row (no `submitted at`): after bootstrap, score each tweet once when SR-eligible.
    return true
  }

  return postSubmittedInWindow(p.submittedAtMs, options.postWindow.startMs, options.postWindow.endMs)
}

function dedupePostsByWalletTweet(posts: Epoch2FlattenedPost[]): Epoch2FlattenedPost[] {
  const seen = new Set<string>()
  const out: Epoch2FlattenedPost[] = []
  for (const p of posts) {
    const key = epoch2PostKey(p.walletLower, p.tweetId)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out
}

/** Resolve CSV posts that match `walletLower:tweetId` keys in daily state. */
export function postsMatchingCountedKeys(
  allPosts: Epoch2FlattenedPost[],
  countedKeys: string[],
): Epoch2FlattenedPost[] {
  const keySet = new Set(countedKeys)
  return dedupePostsByWalletTweet(
    allPosts.filter((p) => keySet.has(epoch2PostKey(p.walletLower, p.tweetId))),
  )
}

/**
 * Counted posts for daily recount: CSV matches plus synthetic posts from `wallet:tweetId` keys
 * when multiline CSV rows were not parsed (legacy server snapshots).
 */
export function postsForCountedKeys(
  allPosts: Epoch2FlattenedPost[],
  countedKeys: string[],
  rows: MindshareSubmissionRow[],
): Epoch2FlattenedPost[] {
  const matched = postsMatchingCountedKeys(allPosts, countedKeys)
  const haveKeys = new Set(matched.map((p) => epoch2PostKey(p.walletLower, p.tweetId)))

  const metaByWallet = new Map<string, { wallet: string; xHandle: string; name: string }>()
  for (const p of allPosts) {
    metaByWallet.set(p.walletLower, { wallet: p.wallet, xHandle: p.xHandle, name: p.name })
  }
  for (const row of rows) {
    const wk = walletKey(row.walletAddress)
    if (!wk.startsWith('0x') || wk.length !== 42) continue
    if (!metaByWallet.has(wk)) {
      metaByWallet.set(wk, {
        wallet: row.walletAddress.trim(),
        xHandle: row.xHandle.trim(),
        name: row.name.trim(),
      })
    }
  }

  const out = dedupePostsByWalletTweet([...matched])
  for (const key of countedKeys) {
    if (haveKeys.has(key)) continue
    const colon = key.indexOf(':')
    if (colon <= 0) continue
    const walletLower = key.slice(0, colon).toLowerCase()
    const tweetId = key.slice(colon + 1).trim()
    if (!tweetId) continue
    const meta = metaByWallet.get(walletLower)
    if (!meta) continue
    out.push({
      wallet: meta.wallet,
      walletLower,
      xHandle: meta.xHandle,
      name: meta.name,
      tweetId,
      submittedAtMs: null,
    })
    haveKeys.add(key)
  }
  return out
}
