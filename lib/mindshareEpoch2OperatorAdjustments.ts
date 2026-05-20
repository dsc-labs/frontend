import {
  EPOCH2_CHECKPOINT_DAY_KEYS,
  epoch2PublishedCheckpointDayKeys,
} from './mindshareEpoch2Checkpoints'
import type { Epoch2ApiUser } from './mindshareEpoch2LeaderboardBuild'
import { normalizeXUsername } from './xTweetMetrics'

function walletKey(wallet: string): string {
  return wallet.trim().toLowerCase()
}

export type Epoch2OperatorAdjustment = {
  /** X handle without `@`. */
  handle: string
  /** Canonical wallet when migrating; omit for score-only overrides. */
  wallet?: string
  /** Prior wallets whose rows should merge into this user. */
  legacyWallets?: readonly string[]
  /** Checkpoint day 15 May = 1 … 19 May = 5 (operator-verified SR). */
  checkpointSnapshots?: readonly number[]
  /** Final cumulative Epoch 2 score when set. */
  score?: number
}

function scoreOnly(handle: string, score: number): Epoch2OperatorAdjustment {
  return { handle, score }
}

/** Operator-verified wallet migrations, SR ticks, and scores (May 2026). */
export const EPOCH2_OPERATOR_ADJUSTMENTS: readonly Epoch2OperatorAdjustment[] = [
  {
    handle: 'TNr1ck',
    wallet: '0x3e33a63d7B64bCCE6bC7B0e38cbaAACfab0ca8b8',
    legacyWallets: [
      '0x88Df9f66ef65c3C1231f981c85f7B946Bf6d99EC',
      '0x214522796492859788Ffb807aF8a356672a8bB56',
    ],
    checkpointSnapshots: [1, 2, 3],
    score: 265.2,
  },
  {
    handle: 'Anh_Mot0',
    wallet: '0xD80A598A2E16145B620BfFA6fd48F00dA788eB12',
    legacyWallets: ['0xc8FAD07aa89174dE09dE18b6ddC79968204382c6'],
    checkpointSnapshots: [1, 2, 4, 5],
    score: 215.8,
  },
  {
    handle: 'Villa_PHM',
    wallet: '0xf31a42744c247cde808188d171c7E9B227022dc3',
    checkpointSnapshots: [1, 4, 5],
    score: 196.42,
  },
  {
    handle: 'phantomfills_hl',
    checkpointSnapshots: [1, 4, 5],
    score: 103.35,
  },
  // Below top 8 — operator score targets (human / bot tiers)
  scoreOnly('JokerIBlack', 426.45),
  scoreOnly('sheepmek1', 401.72),
  scoreOnly('bencryptovnn', 389.36),
  scoreOnly('tcmalpha', 361.84),
  scoreOnly('gaogaocrypto', 338.57),
  scoreOnly('Trong_Hatachi', 317.28),
  scoreOnly('hitasyurek', 296.44),
  scoreOnly('muhitonx', 271.83),
  scoreOnly('sothh84', 249.17),
  scoreOnly('LongL2282268', 223.54),
  scoreOnly('dinhturin', 181.92),
  scoreOnly('dang_duytan', 159.37),
  scoreOnly('sashinmeena', 136.84),
  scoreOnly('nguyenthambt', 114.26),
  scoreOnly('Drkhaleefah2', 97.53),
  scoreOnly('nvtshop01', 80.28),
]

function userHandle(u: Epoch2ApiUser): string {
  return normalizeXUsername(u.xHandle ?? u.username)
}

/**
 * Match one operator row to one competitor. TNr1ck and Anh_Mot0 are separate adjustments.
 * Legacy wallets only count when the X handle matches (or is missing), so a shared old
 * wallet does not merge a different person (e.g. chaselightt vs TNr1ck).
 */
function matchesAdjustment(u: Epoch2ApiUser, adj: Epoch2OperatorAdjustment): boolean {
  const h = userHandle(u)
  const target = normalizeXUsername(adj.handle)
  if (h && h === target) return true
  const wk = walletKey(u.wallet)
  if (adj.wallet?.trim() && walletKey(adj.wallet) === wk) {
    return !h || h === target
  }
  if (adj.legacyWallets?.some((w) => walletKey(w) === wk)) {
    return !h || h === target
  }
  return false
}

function checkpointsFromSnapshots(snapshots: readonly number[], nowMs: number): boolean[] {
  const published = epoch2PublishedCheckpointDayKeys(nowMs)
  return published.map((dayKey) => {
    const idx = (EPOCH2_CHECKPOINT_DAY_KEYS as readonly string[]).indexOf(dayKey) + 1
    return idx > 0 && snapshots.includes(idx)
  })
}

function isMergeAdjustment(adj: Epoch2OperatorAdjustment): boolean {
  return Boolean(adj.wallet?.trim() || adj.legacyWallets?.length || adj.checkpointSnapshots?.length)
}

function buildMergedUser(
  group: Epoch2ApiUser[],
  adj: Epoch2OperatorAdjustment,
  nowMs: number,
): Epoch2ApiUser {
  const canonicalWallet = adj.wallet?.trim() || group[0]!.wallet.trim()
  let score = 0
  let postCount = 0
  let srEligible = false
  let srBalance: number | undefined
  let username = group[0]!.username
  const xHandle = normalizeXUsername(adj.handle) || userHandle(group[0]!)
  let avatarUrl = group[0]!.avatarUrl
  let displayName = group[0]!.displayName

  for (const u of group) {
    score += u.score
    postCount += u.postCount
    srEligible = srEligible || u.srEligible
    if (typeof u.srBalance === 'number' && Number.isFinite(u.srBalance)) {
      srBalance = Math.max(srBalance ?? 0, u.srBalance)
    }
    if (u.avatarUrl) avatarUrl = u.avatarUrl
    if (u.displayName) displayName = u.displayName
    if (userHandle(u) === normalizeXUsername(adj.handle)) username = u.username
  }

  if (typeof adj.score === 'number' && Number.isFinite(adj.score)) score = adj.score

  const checkpoints = adj.checkpointSnapshots?.length
    ? checkpointsFromSnapshots(adj.checkpointSnapshots, nowMs)
    : group.find((u) => u.checkpoints)?.checkpoints

  return {
    username,
    wallet: canonicalWallet,
    postCount,
    score,
    srEligible: srEligible || Boolean(checkpoints?.some(Boolean)),
    ...(xHandle ? { xHandle } : {}),
    ...(avatarUrl ? { avatarUrl } : {}),
    ...(displayName ? { displayName } : {}),
    ...(typeof srBalance === 'number' ? { srBalance } : {}),
    ...(checkpoints ? { checkpoints } : {}),
  }
}

function applyScoreOnly(out: Epoch2ApiUser[], adj: Epoch2OperatorAdjustment): Epoch2ApiUser[] {
  if (adj.score === undefined || !Number.isFinite(adj.score)) return out
  const target = normalizeXUsername(adj.handle)
  return out.map((u) => {
    if (userHandle(u) !== target) return u
    return {
      ...u,
      score: adj.score!,
      ...(target ? { xHandle: target } : {}),
    }
  })
}

function applyMerge(out: Epoch2ApiUser[], adj: Epoch2OperatorAdjustment, nowMs: number): Epoch2ApiUser[] {
  const indices: number[] = []
  for (let i = 0; i < out.length; i += 1) {
    if (matchesAdjustment(out[i]!, adj)) indices.push(i)
  }
  if (indices.length === 0) return out

  const group = indices.map((i) => out[i]!)
  const merged = buildMergedUser(group, adj, nowMs)
  const insertAt = Math.min(...indices)
  const without = out.filter((_, i) => !indices.includes(i))
  return [...without.slice(0, insertAt), merged, ...without.slice(insertAt)]
}

/**
 * Apply operator SR ticks, wallet merges, and scores without re-sorting the list
 * (ranks 1–7 stay in API order; rank 8+ sort is done on the client).
 */
export function applyEpoch2OperatorAdjustments(users: Epoch2ApiUser[], nowMs = Date.now()): Epoch2ApiUser[] {
  let out = [...users]
  for (const adj of EPOCH2_OPERATOR_ADJUSTMENTS) {
    if (isMergeAdjustment(adj)) {
      out = applyMerge(out, adj, nowMs)
    } else {
      out = applyScoreOnly(out, adj)
    }
  }
  return out
}
