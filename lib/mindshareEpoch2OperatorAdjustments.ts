import { EPOCH2_CHECKPOINT_DAY_KEYS } from './mindshareEpoch2Checkpoints'
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
  /** Prior X handles (e.g. rename @punisher3505 → @0xFrankEth). */
  legacyHandles?: readonly string[]
  /** Checkpoint day 15 May = 1 … 20 May = 5 (operator-verified SR). */
  checkpointSnapshots?: readonly number[]
  /** Final cumulative Epoch 2 score when set. */
  score?: number
  /** Clear SR eligibility and checkpoint ticks (e.g. 0 score, not on leaderboard as eligible). */
  forceNotEligible?: boolean
}

function scoreOnly(handle: string, score: number): Epoch2OperatorAdjustment {
  return { handle, score }
}

function notEligibleZero(handle: string): Epoch2OperatorAdjustment {
  return { handle, score: 0, forceNotEligible: true }
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
  // Below top 8 — operator score targets (human / bot tiers)
  scoreOnly('JokerIBlack', 426.45),
  scoreOnly('sheepmek1', 235.28),
  scoreOnly('bencryptovnn', 201.6),
  scoreOnly('tcmalpha', 361.84),
  scoreOnly('gaogaocrypto', 338.57),
  scoreOnly('trong_hatachi', 296.45),
  scoreOnly('hitasyurek', 401.75),
  { handle: '0xFrankEth', legacyHandles: ['punisher3505'] },
  scoreOnly('muhitonx', 81),
  notEligibleZero('captainjack125'),
  scoreOnly('sothh84', 149.5),
  scoreOnly('LongL2282268', 223.54),
  scoreOnly('dinhturin', 181.92),
  scoreOnly('dang_duytan', 159.37),
  scoreOnly('sashinmeena', 136.84),
  scoreOnly('nguyenthambt', 114.26),
  scoreOnly('Drkhaleefah2', 97.53),
  scoreOnly('nvtshop01', 80.28),
  scoreOnly('palash433', 165.17),
  scoreOnly('bigmanstuff0', 138.5),
  // Snap 1 only (15 May checkpoint); scores ~190 → 150
  {
    handle: '0xGreenWick',
    wallet: '0xb332b0dbbf44000a2b619467e7221c5120e87a9a',
    checkpointSnapshots: [1],
    score: 190.45,
  },
  {
    handle: 'phantomfills_hl',
    checkpointSnapshots: [1],
    score: 186.32,
  },
  {
    handle: 'moonrotation9',
    wallet: '0xaf9e75c43c63992b95dfb9bdda109bded9f2f8fb',
    checkpointSnapshots: [1],
    score: 182.18,
  },
  {
    handle: 'jakedegenx',
    wallet: '0xcba94ea8c65cf10e098a30f9a3db4b1d54a6a4be',
    checkpointSnapshots: [1],
    score: 178.54,
  },
  {
    handle: 'willockfi_base',
    wallet: '0x9628740ffa271955a1542443391a3f6a14122302',
    checkpointSnapshots: [1],
    score: 174.41,
  },
  {
    handle: 'valri_eth',
    checkpointSnapshots: [1],
    score: 170.27,
  },
  {
    handle: 'Saintman_xyz',
    wallet: '0xecf2a55ca101733ce0d5a89655b1520f58006adf',
    checkpointSnapshots: [1],
    score: 166.13,
  },
  {
    handle: 'WenIampoor',
    wallet: '0xd49194ca1533a302867012ff95d76cdbdf5ed327',
    checkpointSnapshots: [1],
    score: 162.88,
  },
  {
    handle: 'Bussybee_',
    wallet: '0xd899321c67123b204bbb0c2dbd93c1c895b84e01',
    checkpointSnapshots: [1],
    score: 158.74,
  },
  {
    handle: '1409_th',
    wallet: '0xa8762714F07f6c42D8265b9598e579F7bF9133ed',
    checkpointSnapshots: [1],
    score: 154.6,
  },
  {
    handle: 'QuentinShu023',
    wallet: '0x83421e3a5F84C744bbC39133Fa5BFb5705dd90a4',
    checkpointSnapshots: [1],
    score: 150.46,
  },
]

function userHandle(u: Epoch2ApiUser): string {
  return normalizeXUsername(u.xHandle ?? u.username)
}

/**
 * Match one operator adjustment to one competitor (@handle). Multiple accounts may share
 * a wallet on the leaderboard; legacy-wallet merge only applies to the named handle.
 */
function matchesAdjustment(u: Epoch2ApiUser, adj: Epoch2OperatorAdjustment): boolean {
  const h = userHandle(u)
  const target = normalizeXUsername(adj.handle)
  if (h && h === target) return true
  if (adj.legacyHandles?.some((lh) => normalizeXUsername(lh) === h)) return true
  const wk = walletKey(u.wallet)
  if (adj.wallet?.trim() && walletKey(adj.wallet) === wk) {
    return !h || h === target
  }
  if (adj.legacyWallets?.some((w) => walletKey(w) === wk)) {
    return !h || h === target
  }
  return false
}

function checkpointsFromSnapshots(snapshots: readonly number[]): boolean[] {
  return EPOCH2_CHECKPOINT_DAY_KEYS.map((dayKey) => {
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
  const xHandle = normalizeXUsername(adj.handle) || (group[0] ? userHandle(group[0]) : '')
  const canonicalWallet = adj.wallet?.trim() || group[0]?.wallet.trim() || ''
  if (!canonicalWallet) {
    throw new Error(`Operator adjustment for @${adj.handle} requires wallet`)
  }

  if (group.length === 0) {
    const checkpoints = adj.checkpointSnapshots?.length
      ? checkpointsFromSnapshots(adj.checkpointSnapshots)
      : undefined
    const score = typeof adj.score === 'number' && Number.isFinite(adj.score) ? adj.score : 0
    return {
      username: xHandle ? `@${xHandle}` : adj.handle,
      wallet: canonicalWallet,
      postCount: 0,
      score,
      srEligible: adj.forceNotEligible ? false : Boolean(checkpoints?.some(Boolean)),
      ...(xHandle ? { xHandle } : {}),
      ...(checkpoints ? { checkpoints } : {}),
    }
  }

  let score = 0
  let postCount = 0
  let srEligible = false
  let srBalance: number | undefined
  let username = group[0]!.username
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

  let checkpoints = adj.checkpointSnapshots?.length
    ? checkpointsFromSnapshots(adj.checkpointSnapshots)
    : group.find((u) => u.checkpoints)?.checkpoints

  if (adj.forceNotEligible) {
    checkpoints = checkpoints?.map(() => false)
    srEligible = false
  }

  return {
    username,
    wallet: canonicalWallet,
    postCount,
    score,
    srEligible: adj.forceNotEligible ? false : srEligible || Boolean(checkpoints?.some(Boolean)),
    ...(xHandle ? { xHandle } : {}),
    ...(avatarUrl ? { avatarUrl } : {}),
    ...(displayName ? { displayName } : {}),
    ...(typeof srBalance === 'number' ? { srBalance } : {}),
    ...(checkpoints ? { checkpoints } : {}),
  }
}

function applyScoreOnly(out: Epoch2ApiUser[], adj: Epoch2OperatorAdjustment): Epoch2ApiUser[] {
  const hasScore = typeof adj.score === 'number' && Number.isFinite(adj.score)
  const hasRename = Boolean(adj.legacyHandles?.length)
  if (!hasScore && !adj.forceNotEligible && !hasRename) return out
  const target = normalizeXUsername(adj.handle)
  return out.map((u) => {
    if (!matchesAdjustment(u, adj)) return u
    const renamed = adj.legacyHandles?.some((lh) => normalizeXUsername(lh) === userHandle(u))
    const checkpoints = adj.forceNotEligible ? u.checkpoints?.map(() => false) : u.checkpoints
    return {
      ...u,
      ...(typeof adj.score === 'number' && Number.isFinite(adj.score) ? { score: adj.score } : {}),
      ...(adj.forceNotEligible ? { srEligible: false, checkpoints } : {}),
      ...(target ? { xHandle: target } : {}),
      ...(renamed && target ? { username: `@${target}` } : {}),
    }
  })
}

function applyMerge(out: Epoch2ApiUser[], adj: Epoch2OperatorAdjustment, nowMs: number): Epoch2ApiUser[] {
  const indices: number[] = []
  for (let i = 0; i < out.length; i += 1) {
    if (matchesAdjustment(out[i]!, adj)) indices.push(i)
  }
  if (indices.length === 0) {
    if (adj.wallet?.trim() && normalizeXUsername(adj.handle)) {
      return [...out, buildMergedUser([], adj, nowMs)]
    }
    return out
  }

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
