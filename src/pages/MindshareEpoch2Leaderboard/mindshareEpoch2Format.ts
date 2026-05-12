import type { Epoch2LeaderboardUser } from './mindshareEpoch2Data'

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return n.toLocaleString('en-US')
}

export function formatComma(n: number): string {
  return n.toLocaleString('en-US')
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

export function getRankedUsers(users: Epoch2LeaderboardUser[]): Array<Epoch2LeaderboardUser & { rank: number }> {
  return [...users]
    .sort((a, b) => b.score - a.score)
    .map((u, i) => ({ ...u, rank: i + 1 }))
}
