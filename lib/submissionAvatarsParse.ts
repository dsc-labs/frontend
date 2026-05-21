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

export function normalizeSubmissionUsername(username: string): string {
  return username.trim().replace(/^@+/, '').toLowerCase()
}

/** `username` (X handle) → profile image URL from `submission-avatars.csv`. */
export function parseSubmissionAvatarsCsv(raw: string): Map<string, string> {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return new Map()

  const headers = parseCsvLine(lines[0]!)
  const usernameI = headers.findIndex((h) => h.trim().toLowerCase() === 'username')
  const avatarI = headers.findIndex((h) => h.trim().toLowerCase() === 'avatar')
  if (usernameI < 0) return new Map()

  const out = new Map<string, string>()
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line)
    const username = cells[usernameI]?.trim()
    if (!username) continue
    const avatar = avatarI >= 0 ? cells[avatarI]?.trim() : ''
    if (!avatar) continue
    out.set(normalizeSubmissionUsername(username), avatar)
  }
  return out
}
