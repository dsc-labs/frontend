import type { MindshareSubmissionRow } from './mindshareCsvStore'
import type { Epoch1LeaderboardRow } from './mindshareEpoch1Carryover'
import type { Epoch2ApiUser } from './mindshareEpoch2LeaderboardBuild'
import type { Epoch2MetricsCacheFile } from './mindshareEpoch2MetricsCache'
import { loadSubmissionAvatarsByUsernameSync } from './submissionAvatars'
import { normalizeXUsername } from './xTweetMetrics'

function walletKey(wallet: string): string {
  return wallet.trim().toLowerCase()
}

function guessXHandleFromDisplayUsername(username: string): string {
  const t = username.trim()
  if (!t) return ''
  if (t.startsWith('@')) return normalizeXUsername(t)
  if (!/\s/.test(t) && /^[\w.]+$/i.test(t)) return normalizeXUsername(t)
  return ''
}

function mindshareHandleByWallet(rows: MindshareSubmissionRow[]): Map<string, string> {
  const out = new Map<string, string>()
  for (const row of rows) {
    const wk = walletKey(row.walletAddress)
    if (!wk.startsWith('0x') || wk.length !== 42) continue
    const h = normalizeXUsername(row.xHandle)
    if (h) out.set(wk, h)
  }
  return out
}

/** Attach X handle + avatar from submission-avatars.csv, X cache, or Epoch 1 export. */
export function enrichEpoch2UsersWithProfiles(
  users: Epoch2ApiUser[],
  epoch1Rows: Epoch1LeaderboardRow[],
  mindshareRows: MindshareSubmissionRow[],
  cache: Epoch2MetricsCacheFile,
): Epoch2ApiUser[] {
  const epoch1ByWallet = new Map(epoch1Rows.map((r) => [r.walletLower, r]))
  const handles = mindshareHandleByWallet(mindshareRows)
  const submissionAvatars = loadSubmissionAvatarsByUsernameSync()

  return users.map((u) => {
    const wk = walletKey(u.wallet)
    const e1 = epoch1ByWallet.get(wk)
    const fromE1 = e1?.username ? normalizeXUsername(e1.username) : ''
    const fromCsv = handles.get(wk) ?? ''
    const fromDisplay = guessXHandleFromDisplayUsername(u.username)
    const xHandle = fromE1 || fromCsv || fromDisplay || 'unknown'
    const xCached = cache.users[xHandle]
    const avatarUrl =
      submissionAvatars.get(xHandle) ||
      xCached?.profileImageUrl?.trim() ||
      e1?.avatarUrl?.trim() ||
      undefined
    const xName = xCached?.name?.trim()
    return {
      ...u,
      xHandle: xCached?.username ? normalizeXUsername(xCached.username) : xHandle,
      ...(avatarUrl ? { avatarUrl } : {}),
      ...(xName ? { displayName: xName } : {}),
    }
  })
}
