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
  '0xweekend59',
  '0xzagen',
  '100xdarren',
  'bizbrainzuni',
  'office2crypto',
] as const

/**
 * Fixed step between rank 8 → 7 → 6 → … → 1 (same spacing as the reference podium ladder).
 * Rank 7 = rank8Score + step, rank 6 = rank7 + step, … rank 1 = rank7 + 6×step.
 */
const TOP7_SCORE_STEP = 46.95

function firstOrganicScoreAfterTop7(others: Epoch2ApiUser[]): number {
  const sorted = sortEpoch2UsersByEligibilityThenScore(others)
  return sorted[0]?.score ?? 0
}

/** Assign an even descending ladder to ranks 1–7 (seven entries, bottom-up from rank 8). */
export function applyTop7ScoreLadder(guaranteedHead: Epoch2ApiUser[], rank8Score: number): void {
  if (guaranteedHead.length === 0) return
  let score = roundScore(rank8Score + TOP7_SCORE_STEP)
  for (let i = guaranteedHead.length - 1; i >= 0; i -= 1) {
    guaranteedHead[i]!.score = score
    score = roundScore(score + TOP7_SCORE_STEP)
  }
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
  const target = normalizeLeaderboardHandle(handle)
  if (e1 && walletKey(u.wallet) === e1.walletLower) return true
  const h = normalizeXUsername(u.xHandle ?? u.username)
  if (h && h === target) return true
  return normalizeLeaderboardHandle(u.username) === target
}

function pickGuaranteedDisplayUser(
  e1: Epoch1LeaderboardRow | undefined,
  candidates: Epoch2ApiUser[],
): Epoch2ApiUser | undefined {
  if (candidates.length === 0) return undefined
  if (e1) {
    const byE1Wallet = candidates.find((c) => walletKey(c.wallet) === e1.walletLower)
    if (byE1Wallet) return byE1Wallet
  }
  return [...candidates].sort((a, b) => b.score - a.score)[0]
}

/**
 * Re-apply ranks 1–7 order on every `/epoch2` read (snapshot file may still list an old podium order).
 * Drops duplicate rows: same @handle with a second wallet stays in the CSV but must not appear twice.
 */
export async function reorderEpoch2GuaranteedTop7ForDisplay(users: Epoch2ApiUser[]): Promise<Epoch2ApiUser[]> {
  const epoch1ByHandle = await loadGuaranteedTop7Epoch1Rows()

  const consumed = new Set<Epoch2ApiUser>()
  for (const u of users) {
    for (const handle of EPOCH2_GUARANTEED_TOP7_HANDLES) {
      const e1 = epoch1ByHandle.get(handle)
      if (userMatchesGuaranteed(u, handle, e1)) {
        consumed.add(u)
        break
      }
    }
  }

  const head: Epoch2ApiUser[] = []

  for (const handle of EPOCH2_GUARANTEED_TOP7_HANDLES) {
    const e1 = epoch1ByHandle.get(handle)
    const candidates = users.filter((c) => userMatchesGuaranteed(c, handle, e1))
    const u = pickGuaranteedDisplayUser(e1, candidates)
    if (!u) continue
    const xHandle = normalizeXUsername(handle) || normalizeXUsername(u.xHandle ?? u.username)
    head.push({
      ...u,
      srEligible: true,
      ...(xHandle ? { xHandle } : {}),
    })
  }

  const rest = users.filter((u) => !consumed.has(u))
  applyTop7ScoreLadder(head, firstOrganicScoreAfterTop7(rest))
  return [...head, ...sortEpoch2UsersByEligibilityThenScore(rest)]
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
    const candidates = users.filter((c) => userMatchesGuaranteed(c, handle, e1))
    let u = pickGuaranteedDisplayUser(e1, candidates)

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

  applyTop7ScoreLadder(guaranteedOrdered, firstOrganicScoreAfterTop7(others))

  const merged = [...guaranteedOrdered, ...sortEpoch2UsersByEligibilityThenScore(others)]
  return { users: merged, epoch1BaselinesMerged }
}
