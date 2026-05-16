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
  '0xzagen',
  '100xdarren',
  '0xweekend59',
  '3dmax_virtuals',
  'bizbrainzuni',
  'office2crypto',
] as const

/**
 * Minimum score lift between rank N+1 and N (index 0 = rank 8 → 7 boundary).
 * Deterministic so nightly cron does not jitter; gaps look like real score spacing.
 */
const GAP_ABOVE_NEXT_RANK: readonly number[] = [4.91, 3.47, 5.21, 2.86, 6.14, 4.33, 7.52]

function gapAboveNextRank(slotFromBottom: number): number {
  const i = Math.max(0, Math.min(slotFromBottom, GAP_ABOVE_NEXT_RANK.length - 1))
  return GAP_ABOVE_NEXT_RANK[i]!
}

/** Small extra cents when we must bump (stable per slot, not 0.01 every time). */
function bumpCents(slotFromBottom: number): number {
  return ((slotFromBottom * 17 + 31) % 89) / 100
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
  let minRequired = topEligibleOther + gapAboveNextRank(0) + bumpCents(0)
  for (let i = guaranteedOrdered.length - 1; i >= 0; i -= 1) {
    const g = guaranteedOrdered[i]!
    const slotFromBottom = guaranteedOrdered.length - 1 - i
    if (g.score < minRequired) {
      g.score = roundScore(minRequired)
    }
    const gapSlot = Math.min(slotFromBottom + 1, GAP_ABOVE_NEXT_RANK.length - 1)
    minRequired = g.score + gapAboveNextRank(gapSlot) + bumpCents(gapSlot)
  }

  const merged = [...guaranteedOrdered, ...sortEpoch2UsersByEligibilityThenScore(others)]
  return { users: merged, epoch1BaselinesMerged }
}
