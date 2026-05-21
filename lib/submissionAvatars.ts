import { existsSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseSubmissionAvatarsCsv } from './submissionAvatarsParse'

export { normalizeSubmissionUsername, parseSubmissionAvatarsCsv } from './submissionAvatarsParse'

export function defaultSubmissionAvatarsCsvPath(): string {
  const custom = process.env.MINDSHARE_SUBMISSION_AVATARS_CSV_PATH?.trim()
  if (custom) return resolve(custom)
  return resolve(process.cwd(), 'submission-avatars.csv')
}

let cachedByUsername: Map<string, string> | null = null

export function loadSubmissionAvatarsByUsernameSync(): Map<string, string> {
  if (cachedByUsername) return cachedByUsername
  try {
    const path = defaultSubmissionAvatarsCsvPath()
    if (!existsSync(path)) {
      cachedByUsername = new Map()
      return cachedByUsername
    }
    cachedByUsername = parseSubmissionAvatarsCsv(readFileSync(path, 'utf8'))
  } catch {
    cachedByUsername = new Map()
  }
  return cachedByUsername
}

export async function loadSubmissionAvatarsByUsername(): Promise<Map<string, string>> {
  try {
    const raw = await readFile(defaultSubmissionAvatarsCsvPath(), 'utf8')
    return parseSubmissionAvatarsCsv(raw)
  } catch {
    return new Map()
  }
}
