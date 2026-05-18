import { appendFile, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { mkdir } from 'node:fs/promises'

export type MindshareSubmissionRow = {
  xHandle: string
  walletAddress: string
  name: string
  postSubmitted: string
  srBalance: string
  /** ISO-8601 at form submit; empty on legacy rows. */
  submittedAt: string
}

const CSV_HEADER_LEGACY = 'x handle,wallet,name,post submited'
const CSV_HEADER_SR = 'x handle,wallet,name,post submited,sr balance'
const CSV_HEADER = 'x handle,wallet,name,post submited,sr balance,submitted at'

function resolveMindshareCsvPath(customPath?: string): string {
  const fallbackPath = resolve(process.cwd(), 'mindshare_submissions.csv')
  return customPath?.trim() ? resolve(customPath.trim()) : fallbackPath
}

/**
 * Split file content into CSV records (RFC 4180: newlines inside quoted fields are not row breaks).
 */
export function parseCsvRecords(content: string): string[] {
  const records: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < content.length; i += 1) {
    const c = content[i]!
    if (inQuotes) {
      if (c === '"') {
        const next = content[i + 1]
        if (next === '"') {
          cur += '""'
          i += 1
        } else {
          inQuotes = false
          cur += c
        }
      } else {
        cur += c
      }
    } else if (c === '"') {
      inQuotes = true
      cur += c
    } else if (c === '\r' || c === '\n') {
      if (c === '\r' && content[i + 1] === '\n') i += 1
      if (cur.length > 0) {
        records.push(cur)
        cur = ''
      }
    } else {
      cur += c
    }
  }
  if (cur.length > 0) records.push(cur)
  return records
}

/** Parse one CSV line (RFC 4180-style quotes). */
export function parseCsvDataLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i]!
    if (inQuotes) {
      if (c === '"') {
        const next = line[i + 1]
        if (next === '"') {
          cur += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        cur += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      out.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  out.push(cur)
  return out
}

/**
 * Pull X/Twitter post URLs from the free-text field stored in CSV (`post submited`).
 * Handles multiple URLs in one cell (newline- or comma-separated lists of full URLs).
 */
export function extractPostUrlsFromSubmissionField(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []
  const found = trimmed.match(/https?:\/\/(?:x\.com|twitter\.com)\/[^\s,'"]+/gi)
  if (found && found.length > 0) {
    return [...new Set(found.map((u) => u.replace(/[,.)]+$/, '')))]
  }
  return trimmed
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s))
}

/**
 * Read all mindshare submission rows from the same CSV path used by {@link appendMindshareSubmissionCsv}
 * (`MINDSHARE_SUBMISSIONS_CSV_PATH` or repo-root `mindshare_submissions.csv`).
 */
export async function readMindshareSubmissionsCsv(customPath?: string): Promise<MindshareSubmissionRow[]> {
  const filePath = resolveMindshareCsvPath(customPath ?? process.env.MINDSHARE_SUBMISSIONS_CSV_PATH)
  await migrateLegacyHeaderIfNeeded(filePath)
  let content: string
  try {
    content = await readFile(filePath, 'utf8')
  } catch {
    return []
  }
  const records = parseCsvRecords(content).filter((r) => r.trim().length > 0)
  if (records.length === 0) return []
  const header = records[0]!.replace(/^\uFEFF/, '').trimEnd()
  if (header !== CSV_HEADER && header !== CSV_HEADER_SR && header !== CSV_HEADER_LEGACY) {
    return []
  }
  const hasSubmittedAt = header === CSV_HEADER
  const dataLines = records.slice(1)
  const rows: MindshareSubmissionRow[] = []
  for (const line of dataLines) {
    const cells = parseCsvDataLine(line)
    if (cells.length < 4) continue
    const [xHandle, walletAddress, name, postSubmitted, srBalance = '', submittedAt = ''] = cells
    rows.push({
      xHandle: (xHandle ?? '').trim(),
      walletAddress: (walletAddress ?? '').trim(),
      name: (name ?? '').trim(),
      postSubmitted: (postSubmitted ?? '').trim(),
      srBalance: (srBalance ?? '').trim(),
      submittedAt: hasSubmittedAt ? (submittedAt ?? '').trim() : '',
    })
  }
  return rows
}

function csvEscape(value: string): string {
  const normalized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}

/** Legacy CSVs: add missing columns with empty trailing fields on existing rows. */
async function migrateLegacyHeaderIfNeeded(filePath: string): Promise<void> {
  let content: string
  try {
    content = await readFile(filePath, 'utf8')
  } catch {
    return
  }
  const lines = content.split(/\r?\n/)
  const first = (lines[0] ?? '').replace(/^\uFEFF/, '').trimEnd()
  const dataLines = lines.slice(1).filter((l) => l.trim().length > 0)
  if (first === CSV_HEADER_LEGACY) {
    const migrated = [CSV_HEADER, ...dataLines.map((row) => `${row},,`)].join('\n') + '\n'
    await writeFile(filePath, migrated, 'utf8')
    return
  }
  if (first === CSV_HEADER_SR) {
    const migrated = [CSV_HEADER, ...dataLines.map((row) => `${row},`)].join('\n') + '\n'
    await writeFile(filePath, migrated, 'utf8')
  }
}

async function ensureHeader(filePath: string): Promise<void> {
  try {
    const existing = await readFile(filePath, 'utf8')
    if (existing.trim().length > 0) return
  } catch {
    await mkdir(dirname(filePath), { recursive: true })
  }
  await appendFile(filePath, `${CSV_HEADER}\n`, 'utf8')
}

export async function appendMindshareSubmissionCsv(
  row: MindshareSubmissionRow,
  customPath?: string,
): Promise<{ filePath: string }> {
  const filePath = resolveMindshareCsvPath(customPath ?? process.env.MINDSHARE_SUBMISSIONS_CSV_PATH)
  await migrateLegacyHeaderIfNeeded(filePath)
  await ensureHeader(filePath)
  const submittedAt = (row.submittedAt ?? '').trim() || new Date().toISOString()
  const line =
    [
      csvEscape(row.xHandle),
      csvEscape(row.walletAddress),
      csvEscape(row.name),
      csvEscape(row.postSubmitted),
      csvEscape(row.srBalance),
      csvEscape(submittedAt),
    ].join(',') + '\n'
  await appendFile(filePath, line, 'utf8')
  return { filePath }
}
