import {
  extractPostUrlsFromSubmissionField,
  type MindshareSubmissionRow,
} from './mindshareCsvStore'
import { extractTweetIdFromStatusUrl } from './xTweetMetrics'

export type Epoch2FlattenedPost = {
  wallet: string
  walletLower: string
  xHandle: string
  name: string
  tweetId: string
  /** `null` = legacy CSV row without timestamp (bootstrap-only). */
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
