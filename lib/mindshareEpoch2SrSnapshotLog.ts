import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

export function defaultSnapshotLogPath(): string {
  const custom = process.env.MINDSHARE_EPOCH2_SR_SNAPSHOT_LOG_PATH?.trim()
  if (custom) return resolve(custom)
  if (process.env.VERCEL) {
    return resolve('/tmp', 'mma-robot', 'mindshare', 'epoch2_sr_snapshots.jsonl')
  }
  return resolve(process.cwd(), 'data', 'mindshare', 'epoch2_sr_snapshots.jsonl')
}

export async function readSnapshotLogLines(logPath = defaultSnapshotLogPath()): Promise<string[]> {
  try {
    const raw = await readFile(logPath, 'utf8')
    return raw.split(/\r?\n/).filter((l) => l.trim())
  } catch {
    return []
  }
}

/** One line per `eligibilityDayKey` (replace if the day already exists). */
export async function writeEpoch2SrSnapshotLogLine(options: {
  logPath?: string
  eligibilityDayKey: string
  line: string
}): Promise<'appended' | 'replaced'> {
  const logPath = options.logPath ?? defaultSnapshotLogPath()
  const existing = await readSnapshotLogLines(logPath)
  const hasDay = existing.some((l) => {
    try {
      return (JSON.parse(l) as { eligibilityDayKey?: string }).eligibilityDayKey === options.eligibilityDayKey
    } catch {
      return false
    }
  })

  await mkdir(dirname(logPath), { recursive: true })
  if (hasDay) {
    const kept = existing.filter((l) => {
      try {
        return (JSON.parse(l) as { eligibilityDayKey?: string }).eligibilityDayKey !== options.eligibilityDayKey
      } catch {
        return true
      }
    })
    kept.push(options.line.trim())
    await writeFile(logPath, `${kept.join('\n')}\n`, 'utf8')
    return 'replaced'
  }

  await appendFile(logPath, `${options.line}\n`, 'utf8')
  return 'appended'
}
