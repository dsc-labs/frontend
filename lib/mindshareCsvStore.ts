import { appendFile, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { mkdir } from 'node:fs/promises'

export type MindshareSubmissionRow = {
  xHandle: string
  walletAddress: string
  name: string
  postSubmitted: string
  srBalance: string
}

const CSV_HEADER_LEGACY = 'x handle,wallet,name,post submited'
const CSV_HEADER = 'x handle,wallet,name,post submited,sr balance'

function csvEscape(value: string): string {
  const normalized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}

/** Legacy CSVs: add `sr balance` column and an empty field on existing rows. */
async function migrateLegacyHeaderIfNeeded(filePath: string): Promise<void> {
  let content: string
  try {
    content = await readFile(filePath, 'utf8')
  } catch {
    return
  }
  const lines = content.split(/\r?\n/)
  const first = (lines[0] ?? '').trimEnd()
  if (first !== CSV_HEADER_LEGACY) return
  const dataLines = lines.slice(1).filter((l) => l.trim().length > 0)
  const migrated = [CSV_HEADER, ...dataLines.map((row) => `${row},`)].join('\n') + '\n'
  await writeFile(filePath, migrated, 'utf8')
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
  const fallbackPath = resolve(process.cwd(), 'mindshare_submissions.csv')
  const filePath = customPath?.trim() ? resolve(customPath) : fallbackPath
  await migrateLegacyHeaderIfNeeded(filePath)
  await ensureHeader(filePath)
  const line =
    [
      csvEscape(row.xHandle),
      csvEscape(row.walletAddress),
      csvEscape(row.name),
      csvEscape(row.postSubmitted),
      csvEscape(row.srBalance),
    ].join(',') + '\n'
  await appendFile(filePath, line, 'utf8')
  return { filePath }
}
