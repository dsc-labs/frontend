import type { Epoch2LeaderboardUser } from './mindshareEpoch2Data'

function isRankedEligible(u: Epoch2LeaderboardUser): boolean {
  if (u.srEligible) return true
  return Boolean(u.checkpoints?.some(Boolean))
}

/** Match handle, display name, or wallet (partial, case-insensitive). */
export function filterEpoch2Users(users: Epoch2LeaderboardUser[], query: string): Epoch2LeaderboardUser[] {
  const q = query.trim().toLowerCase().replace(/^@/, '')
  if (!q) return users
  return users.filter((u) => {
    const handle = (u.xHandle ?? u.username).trim().toLowerCase().replace(/^@/, '')
    const name = (u.displayName ?? u.username).trim().toLowerCase()
    const wallet = u.wallet.trim().toLowerCase()
    return handle.includes(q) || name.includes(q) || wallet.includes(q)
  })
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return n.toLocaleString('en-US')
}

export function formatSrBalance(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return '—'
  return formatComma(Math.round(n * 10) / 10)
}

export function formatComma(n: number): string {
  return n.toLocaleString('en-US')
}

/** Leaderboard aggregate score (e.g. `1,164.24`). */
export function formatEpoch2TotalScore(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** `0x` + first `head` hex chars + `...` + last `tail` hex chars (e.g. `0x71c16...3bdb1`). */
export function formatShortWallet(wallet: string, head = 5, tail = 5): string {
  const w = wallet.trim()
  const m = /^0x([a-fA-F0-9]+)$/i.exec(w)
  if (!m) return w
  const hex = m[1]!
  if (hex.length <= head + tail) return w
  return `0x${hex.slice(0, head)}...${hex.slice(-tail)}`
}



export function formatDisplayHandle(username: string): string {
  const t = username.trim()
  if (!t) return '@unknown'
  return t.startsWith('@') ? t : `@${t}`
}

/**
 * Ranks 1–7: API order (guaranteed top 7).
 * Rank 8+: eligible by score, then not eligible by score (matches server sort).
 */
export function getRankedUsers(users: Epoch2LeaderboardUser[]): Array<Epoch2LeaderboardUser & { rank: number }> {
  const GUARANTEED_COUNT = 7
  const head = users.slice(0, GUARANTEED_COUNT)
  const tail = users.slice(GUARANTEED_COUNT)
  const eligible = tail.filter(isRankedEligible).sort((a, b) => b.score - a.score)
  const ineligible = tail.filter((u) => !isRankedEligible(u)).sort((a, b) => b.score - a.score)
  return [...head, ...eligible, ...ineligible].map((u, i) => ({ ...u, rank: i + 1 }))
}
