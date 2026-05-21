import { parseSubmissionAvatarsCsv } from '../../../lib/submissionAvatarsParse'
import type { Epoch2LeaderboardUser } from './mindshareEpoch2Data'
import leaderboardCsv from '../../../leaderboard_export.csv?raw'
import submissionAvatarsCsv from '../../../submission-avatars.csv?raw'

type Epoch1CsvRow = {
  username: string
  wallet?: string
  avatar?: string
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (const c of line) {
    if (inQ) {
      if (c === '"') inQ = false
      else cur += c
    } else if (c === '"') inQ = true
    else if (c === ',') {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out
}

function parseEpoch1Csv(raw: string): Epoch1CsvRow[] {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = parseCsvLine(lines[0]!)
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line)
    const row = Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']))
    return row as Epoch1CsvRow
  })
}

const EPOCH1_BY_WALLET = (() => {
  const byWallet = new Map<string, { xHandle: string; avatarUrl?: string }>()
  for (const row of parseEpoch1Csv(leaderboardCsv)) {
    const wallet = row.wallet?.trim().toLowerCase() ?? ''
    const handle = row.username?.trim()
    if (!wallet.startsWith('0x') || !handle) continue
    const avatar = row.avatar?.trim()
    byWallet.set(wallet, { xHandle: handle, ...(avatar ? { avatarUrl: avatar } : {}) })
  }
  return byWallet
})()

const SUBMISSION_AVATARS_BY_USERNAME = parseSubmissionAvatarsCsv(submissionAvatarsCsv)

function resolveXHandle(u: Epoch2LeaderboardUser, e1?: { xHandle: string }): string {
  const existing = u.xHandle?.trim().replace(/^@/, '')
  if (existing) return existing
  if (e1?.xHandle) return e1.xHandle.replace(/^@/, '')
  const fromDisplay = u.username.trim().replace(/^@/, '')
  if (fromDisplay && !/\s/.test(fromDisplay)) return fromDisplay
  return 'unknown'
}

/** Backfill profile fields when reading an older snapshot JSON (pre-xHandle). */
export function enrichEpoch2UsersForDisplay(users: Epoch2LeaderboardUser[]): Epoch2LeaderboardUser[] {
  return users
    .map((u) => {
      const wk = u.wallet.trim().toLowerCase()
      const e1 = EPOCH1_BY_WALLET.get(wk)
      const xHandle = resolveXHandle(u, e1)
      const handleKey = xHandle.toLowerCase()
      const avatarUrl =
        SUBMISSION_AVATARS_BY_USERNAME.get(handleKey) || u.avatarUrl || e1?.avatarUrl
      return {
        ...u,
        xHandle,
        ...(avatarUrl ? { avatarUrl } : {}),
      }
    })
    .filter((u) => Number(u.score) > 0)
}
