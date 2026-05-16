import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Epoch2ApiUser } from './mindshareEpoch2LeaderboardBuild'
import { sortEpoch2UsersByEligibilityThenScore } from './mindshareEpoch2LeaderboardSort'
import {
  EPOCH1_CARRYOVER_MIN_RANK,
  EPOCH1_PRIZE_WINNER_MAX_RANK,
} from './mindshareEpoch2Constants'

export type Epoch1LeaderboardRow = {
  rank: number
  username: string
  name: string
  /** Profile image URL from Epoch 1 export (`avatar` column). */
  avatarUrl?: string
  wallet: string
  walletLower: string
  postCount: number
  score: number
}

function defaultEpoch1LeaderboardCsvPath(): string {
  const custom = process.env.MINDSHARE_EPOCH1_LEADERBOARD_CSV_PATH?.trim()
  if (custom) return resolve(custom)
  return resolve(process.cwd(), 'leaderboard_export.csv')
}

/** RFC 4180-style single line parse (matches frontend Leaderboard). */
function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i]!
    if (inQuotes) {
      if (c === '"') {
        const next = line[i + 1]
        if (next === '"') {
          current += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        current += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      values.push(current)
      current = ''
    } else {
      current += c
    }
  }
  values.push(current)
  return values
}

function parseEpoch1LeaderboardCsv(raw: string): Epoch1LeaderboardRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]!)
  const idx = (name: string) => headers.indexOf(name)

  const rankI = idx('rank')
  const userI = idx('username')
  const nameI = idx('name')
  const walletI = idx('wallet')
  const avatarI = idx('avatar')
  const postsI = idx('posts') >= 0 ? idx('posts') : idx('total_posts')
  const scoreI = idx('score') >= 0 ? idx('score') : idx('total_score')

  const rows: Epoch1LeaderboardRow[] = []
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line)
    const rank = Number(cells[rankI] ?? '')
    const score = Number(cells[scoreI] ?? '')
    const posts = Number(cells[postsI] ?? '')
    const wallet = (cells[walletI] ?? '').trim()
    const walletLower = wallet.toLowerCase()
    if (!Number.isFinite(rank) || rank <= 0) continue
    if (!walletLower.startsWith('0x') || walletLower.length !== 42) continue
    if (!Number.isFinite(score) || score <= 0) continue

    const username = (cells[userI] ?? '').trim()
    const name = (cells[nameI] ?? '').trim()
    const avatarRaw = avatarI >= 0 ? (cells[avatarI] ?? '').trim() : ''
    rows.push({
      rank,
      username: username || name || wallet,
      name,
      ...(avatarRaw ? { avatarUrl: avatarRaw } : {}),
      wallet,
      walletLower,
      postCount: Number.isFinite(posts) && posts > 0 ? Math.round(posts) : 0,
      score: Math.round(score * 100) / 100,
    })
  }
  return rows
}

export async function loadEpoch1LeaderboardRows(): Promise<Epoch1LeaderboardRow[]> {
  try {
    const raw = await readFile(defaultEpoch1LeaderboardCsvPath(), 'utf8')
    return parseEpoch1LeaderboardCsv(raw)
  } catch {
    return []
  }
}

/** Wallets that already received Epoch 1 prizes (ranks 1–101). No Epoch 1 score carryover; may still compete in Epoch 2. */
export async function loadEpoch1PrizeWinnerWallets(
  exemptWalletsLower?: Set<string>,
): Promise<Set<string>> {
  const exempt = exemptWalletsLower ?? new Set<string>()
  const rows = await loadEpoch1LeaderboardRows()
  const out = new Set<string>()
  for (const r of rows) {
    if (r.rank >= 1 && r.rank <= EPOCH1_PRIZE_WINNER_MAX_RANK && !exempt.has(r.walletLower)) {
      out.add(r.walletLower)
    }
  }
  return out
}

/** Epoch 1 ranks {@link EPOCH1_CARRYOVER_MIN_RANK}+ carried into Epoch 2 cumulative scores. */
export async function loadEpoch1CarryoverRows(): Promise<Epoch1LeaderboardRow[]> {
  const rows = await loadEpoch1LeaderboardRows()
  return rows
    .filter((r) => r.rank >= EPOCH1_CARRYOVER_MIN_RANK)
    .sort((a, b) => a.rank - b.rank)
}

function displayFromEpoch1(row: Epoch1LeaderboardRow): string {
  if (row.name.trim()) return row.name.trim()
  const u = row.username.trim()
  return u.startsWith('@') ? u : `@${u}`
}

/**
 * Merge Epoch 1 carryover (rank 102+) into Epoch 2 users.
 * Epoch 1 ranks 1–101 keep Epoch 2 scores from new posts only (no carryover merge).
 */
export function mergeEpoch1CarryoverIntoUsers(
  epoch2Users: Epoch2ApiUser[],
  carryover: Epoch1LeaderboardRow[],
  prizeWinnerWallets: Set<string>,
  eligibleWalletKeys: Set<string>,
): Epoch2ApiUser[] {
  const byWallet = new Map<string, Epoch2ApiUser>()

  for (const u of epoch2Users) {
    const wk = u.wallet.trim().toLowerCase()
    if (!wk.startsWith('0x')) continue
    byWallet.set(wk, { ...u, wallet: u.wallet.trim() })
  }

  for (const e1 of carryover) {
    if (prizeWinnerWallets.has(e1.walletLower)) continue

    const existing = byWallet.get(e1.walletLower)
    if (existing) {
      existing.score = Math.round((existing.score + e1.score) * 100) / 100
      existing.postCount += e1.postCount
      if (!existing.username.trim()) existing.username = displayFromEpoch1(e1)
    } else {
      byWallet.set(e1.walletLower, {
        username: displayFromEpoch1(e1),
        wallet: e1.wallet,
        postCount: e1.postCount,
        score: e1.score,
        srEligible: eligibleWalletKeys.has(e1.walletLower),
      })
    }
  }

  return sortEpoch2UsersByEligibilityThenScore(
    Array.from(byWallet.values()).filter((u) => u.postCount > 0 || u.score > 0),
  )
}

/** Seed map for daily cumulative scoring (Epoch 1 base before tonight's new posts). */
export function epoch1CarryoverSeedEntries(
  carryover: Epoch1LeaderboardRow[],
): Map<string, { wallet: string; username: string; score: number; posts: number }> {
  const byWallet = new Map<string, { wallet: string; username: string; score: number; posts: number }>()
  for (const e1 of carryover) {
    byWallet.set(e1.walletLower, {
      wallet: e1.wallet,
      username: displayFromEpoch1(e1),
      score: e1.score,
      posts: e1.postCount,
    })
  }
  return byWallet
}
