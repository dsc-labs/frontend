import { appendFile, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { mkdir } from 'node:fs/promises'

export type MindshareSubmissionRow = {
  xHandle: string
  walletAddress: string
  name: string
  postSubmitted: string
}

const CSV_HEADER = 'x handle,wallet,name,post submited'

function csvEscape(value: string): string {
  const normalized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
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
  await ensureHeader(filePath)
  const line =
    [
      csvEscape(row.xHandle),
      csvEscape(row.walletAddress),
      csvEscape(row.name),
      csvEscape(row.postSubmitted),
    ].join(',') + '\n'
  await appendFile(filePath, line, 'utf8')
  return { filePath }
}
