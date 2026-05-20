import type { Epoch2ApiUser } from './mindshareEpoch2LeaderboardBuild'
import {
  type Epoch1LeaderboardRow,
  loadEpoch1LeaderboardRows,
} from './mindshareEpoch1Carryover'
import { sortEpoch2UsersByEligibilityThenScore } from './mindshareEpoch2LeaderboardSort'
import { normalizeXUsername } from './xTweetMetrics'

/** Fixed Epoch 2 podium (order = ranks 1–7). */
export const EPOCH2_GUARANTEED_TOP7_HANDLES: readonly string[] = [
  'goon_crypto',
  '3dmax_virtuals',
  '0xzagen',
  '0xweekend59',
  '100xdarren',
  'bizbrainzuni',
  'office2crypto',
] as const

/** Max score gap between rank 8 (first organic eligible) and rank 7; cascades up through ranks 1–7. */
const MAX_GAP_RANK8_TO_RANK7 = 10

/**
 * Deterministic pseudo-random gap above the next-lower rank (slot 0 = rank 7 above rank 8).
 * Stable across cron runs but irregular (≈2.2–13.1 pts) so the podium does not look evenly stepped.
 */
function gapAboveNextRank(slotFromBottom: number): number {
  let h = 0x811c9dc5
  const tag = `mma-epoch2-top7-gap:v2:${slotFromBottom}`
  for (let i = 0; i < tag.length; i += 1) {
    h ^= tag.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  const u1 = ((h >>> 0) % 10_000) / 10_000
  const u2 = ((Math.imul(h ^ 0x9e3779b9, 0x85ebca6b) >>> 0) % 100) / 100
  const gap = 2.18 + u1 * 10.62 + u2 * 0.94
  return Math.round(gap * 100) / 100
}

export function normalizeLeaderboardHandle(raw: string): string {
  return normalizeXUsername(raw)
}

export function isGuaranteedTop7Handle(handle: string): boolean {
  return (EPOCH2_GUARANTEED_TOP7_HANDLES as readonly string[]).includes(
    normalizeLeaderboardHandle(handle),
  )
}

export async function loadGuaranteedTop7Epoch1Rows(): Promise<Map<string, Epoch1LeaderboardRow>> {
  const all = await loadEpoch1LeaderboardRows()
  const out = new Map<string, Epoch1LeaderboardRow>()
  for (const handle of EPOCH2_GUARANTEED_TOP7_HANDLES) {
    const row = all.find((r) => normalizeLeaderboardHandle(r.username) === handle)
    if (row) out.set(handle, row)
  }
  return out
}

export async function loadGuaranteedTop7Wallets(): Promise<Set<string>> {
  const rows = await loadGuaranteedTop7Epoch1Rows()
  return new Set(Array.from(rows.values()).map((r) => r.walletLower))
}

function displayFromEpoch1(row: Epoch1LeaderboardRow): string {
  if (row.name.trim()) return row.name.trim()
  const u = row.username.trim()
  return u.startsWith('@') ? u : `@${u}`
}

function walletKey(wallet: string): string {
  return wallet.trim().toLowerCase()
}

function userMatchesGuaranteed(
  u: Epoch2ApiUser,
  handle: string,
  e1: Epoch1LeaderboardRow | undefined,
): boolean {
  if (e1 && walletKey(u.wallet) === e1.walletLower) return true
  return normalizeLeaderboardHandle(u.username) === handle
}

function roundScore(n: number): number {
  return Math.round(n * 100) / 100
}

export type ApplyGuaranteedTop7Result = {
  users: Epoch2ApiUser[]
  /** Wallets that received a one-time Epoch 1 score baseline this run. */
  epoch1BaselinesMerged: string[]
}

/**
 * Ensures the seven named accounts are always SR-eligible, ranked 1–7 in order,
 * and scored high enough to stay above everyone else (only bumps scores when needed).
 */
export function applyGuaranteedTop7(
  users: Epoch2ApiUser[],
  epoch1ByHandle: Map<string, Epoch1LeaderboardRow>,
  epoch1BaselinesAlreadyMerged: Set<string>,
): ApplyGuaranteedTop7Result {
  const guaranteedWallets = new Set(
    Array.from(epoch1ByHandle.values()).map((r) => r.walletLower),
  )
  const others: Epoch2ApiUser[] = []
  const epoch1BaselinesMerged: string[] = []

  for (const u of users) {
    const wk = walletKey(u.wallet)
    let isGuaranteed = guaranteedWallets.has(wk)
    if (!isGuaranteed) {
      for (const handle of EPOCH2_GUARANTEED_TOP7_HANDLES) {
        if (userMatchesGuaranteed(u, handle, epoch1ByHandle.get(handle))) {
          isGuaranteed = true
          break
        }
      }
    }
    if (!isGuaranteed) {
      others.push({ ...u })
    }
  }

  const guaranteedOrdered: Epoch2ApiUser[] = []

  for (const handle of EPOCH2_GUARANTEED_TOP7_HANDLES) {
    const e1 = epoch1ByHandle.get(handle)
    let u = users.find((c) => userMatchesGuaranteed(c, handle, e1))

    if (!u && e1) {
      u = {
        username: displayFromEpoch1(e1),
        wallet: e1.wallet,
        postCount: e1.postCount,
        score: e1.score,
        srEligible: true,
      }
    } else if (u) {
      u = { ...u, srEligible: true }
      if (e1) {
        const wk = walletKey(u.wallet)
        if (!epoch1BaselinesAlreadyMerged.has(wk)) {
          u.score = roundScore(u.score + e1.score)
          u.postCount = Math.max(u.postCount, e1.postCount)
          epoch1BaselinesMerged.push(wk)
        }
        if (!u.username.trim()) u.username = displayFromEpoch1(e1)
      }
    } else {
      u = {
        username: `@${handle}`,
        wallet: '',
        postCount: 0,
        score: 0,
        srEligible: true,
      }
    }

    guaranteedOrdered.push(u)
  }

  const topEligibleOther = others.filter((u) => u.srEligible).sort((a, b) => b.score - a.score)[0]?.score ?? 0

  // Rank 7 → 1: enforce order with varied gaps only when a score is too low (keep real scores when already high enough).
  let minRequired = topEligibleOther + gapAboveNextRank(0)
  for (let i = guaranteedOrdered.length - 1; i >= 0; i -= 1) {
    const g = guaranteedOrdered[i]!
    const slotFromBottom = guaranteedOrdered.length - 1 - i
    if (g.score < minRequired) {
      g.score = roundScore(minRequired)
    }
    minRequired = g.score + gapAboveNextRank(slotFromBottom + 1)
  }

  // Rank 7 → 1: cap scores when the podium sits far above rank 8+ (e.g. 199 vs 68); keep irregular gaps within top 7.
  let maxAllowedFromRank8 = topEligibleOther + MAX_GAP_RANK8_TO_RANK7
  for (let i = guaranteedOrdered.length - 1; i >= 0; i -= 1) {
    const g = guaranteedOrdered[i]!
    if (g.score > maxAllowedFromRank8) {
      g.score = roundScore(maxAllowedFromRank8)
    }
    const slotFromBottom = guaranteedOrdered.length - 1 - i
    maxAllowedFromRank8 = g.score + gapAboveNextRank(slotFromBottom + 1)
  }

  const merged = [...guaranteedOrdered, ...sortEpoch2UsersByEligibilityThenScore(others)]
  return { users: merged, epoch1BaselinesMerged }
}
