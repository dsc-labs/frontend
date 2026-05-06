/**
 * Waitlist persistence is on disk only (JSON file). Each API handler reads the file,
 * updates in memory for that request, then writes back — there is no shared in-process
 * store as the source of truth. For serverless (e.g. Vercel), the default path is still
 * ephemeral unless you point WAITLIST_STATE_PATH at durable storage or a DB-backed layer.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

export type WaitlistUser = {
  walletAddress: string
  email: string
  createdAt: string
  updatedAt: string
  cumulativePoints: number
  lastSnapshotAt: string | null
  latestSrBalance: string
  latestVvvBalance: string
  latestMultiplier: number
  latestUsdPerMinute: number
}

export type WaitlistSnapshot = {
  id: string
  at: string
  walletAddress: string
  minutesElapsed: number
  srBalance: string
  vvvBalance: string
  /** USD price per 1 token unit used for this snapshot (SR). */
  srUsdPriceUsed: number
  /** USD price per 1 token unit used for this snapshot (VVV). */
  vvvUsdPriceUsed: number
  srPriceSource: 'dexscreener' | 'cached' | 'env'
  vvvPriceSource: 'dexscreener' | 'cached' | 'env'
  srUsdPerMinute: number
  vvvUsdPerMinute: number
  multiplier: number
  pointsAdded: number
  cumulativePoints: number
}

export type WaitlistLastUsdPrices = {
  srUsd: number
  vvvUsd: number
  updatedAt: string
}

export type WaitlistState = {
  users: Record<string, WaitlistUser>
  snapshots: WaitlistSnapshot[]
  /** Last prices successfully applied in a snapshot run (for dex fallback). */
  lastUsdPrices?: WaitlistLastUsdPrices
}

const DEFAULT_STATE: WaitlistState = { users: {}, snapshots: [] }

/** Default: repo-relative `data/waitlist/state.json`. Legacy: `./waitlist_state.json` (read fallback). */
function defaultStatePath(): string {
  // Vercel serverless filesystem is read-only except /tmp.
  if (process.env.VERCEL) {
    return resolve('/tmp', 'mma-robot', 'waitlist', 'state.json')
  }
  return resolve(process.cwd(), 'data', 'waitlist', 'state.json')
}

function legacyStatePath(): string {
  return resolve(process.cwd(), 'waitlist_state.json')
}

function storePath(customPath?: string): string {
  return customPath?.trim() ? resolve(customPath.trim()) : defaultStatePath()
}

async function readUtf8IfExists(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8')
  } catch {
    return null
  }
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

const USER_CSV_HEADERS = [
  'walletAddress',
  'email',
  'createdAt',
  'updatedAt',
  'cumulativePoints',
  'lastSnapshotAt',
  'latestSrBalance',
  'latestVvvBalance',
  'latestMultiplier',
  'latestUsdPerMinute',
] as const

const SNAPSHOT_CSV_HEADERS = [
  'id',
  'at',
  'walletAddress',
  'minutesElapsed',
  'srBalance',
  'vvvBalance',
  'srUsdPriceUsed',
  'vvvUsdPriceUsed',
  'srPriceSource',
  'vvvPriceSource',
  'srUsdPerMinute',
  'vvvUsdPerMinute',
  'multiplier',
  'pointsAdded',
  'cumulativePoints',
] as const

async function writeCsvMirrorIfConfigured(state: WaitlistState): Promise<void> {
  const dir = process.env.WAITLIST_CSV_MIRROR_DIR?.trim()
  if (!dir) return
  const base = resolve(dir)
  await mkdir(base, { recursive: true })

  const userLines = [
    USER_CSV_HEADERS.join(','),
    ...Object.values(state.users).map((u) =>
      USER_CSV_HEADERS.map((h) => csvEscape(String((u as Record<string, unknown>)[h] ?? ''))).join(','),
    ),
  ]
  await writeFile(join(base, 'waitlist_users.csv'), userLines.join('\n') + '\n', 'utf8')

  const snapLines = [
    SNAPSHOT_CSV_HEADERS.join(','),
    ...state.snapshots.map((s) =>
      SNAPSHOT_CSV_HEADERS.map((h) => csvEscape(String((s as Record<string, unknown>)[h] ?? ''))).join(','),
    ),
  ]
  await writeFile(join(base, 'waitlist_snapshots.csv'), snapLines.join('\n') + '\n', 'utf8')

  if (state.lastUsdPrices) {
    const m = state.lastUsdPrices
    const metaLines = ['key,value', `srUsd,${m.srUsd}`, `vvvUsd,${m.vvvUsd}`, `updatedAt,${csvEscape(m.updatedAt)}`]
    await writeFile(join(base, 'waitlist_last_prices.csv'), metaLines.join('\n') + '\n', 'utf8')
  }
}

function walletKey(walletAddress: string): string {
  return walletAddress.trim().toLowerCase()
}

export function isLikelyEthAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim())
}

export async function readWaitlistState(customPath?: string): Promise<{ filePath: string; state: WaitlistState }> {
  const filePath = storePath(customPath)
  let raw = await readUtf8IfExists(filePath)
  if (!raw && !customPath?.trim()) {
    raw = await readUtf8IfExists(legacyStatePath())
  }
  if (!raw) {
    return { filePath, state: { ...DEFAULT_STATE } }
  }
  try {
    const parsed = JSON.parse(raw) as Partial<WaitlistState>
    return {
      filePath,
      state: {
        users: parsed.users ?? {},
        snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
        lastUsdPrices: parsed.lastUsdPrices,
      },
    }
  } catch {
    return { filePath, state: { ...DEFAULT_STATE } }
  }
}

export async function writeWaitlistState(state: WaitlistState, customPath?: string): Promise<{ filePath: string }> {
  const filePath = storePath(customPath)
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(state, null, 2) + '\n', 'utf8')
  await writeCsvMirrorIfConfigured(state)
  return { filePath }
}

export async function upsertWaitlistUser(input: {
  walletAddress: string
  email: string
  customPath?: string
}): Promise<{ filePath: string; user: WaitlistUser }> {
  const walletAddress = input.walletAddress.trim()
  const email = input.email.trim().toLowerCase()
  if (!isLikelyEthAddress(walletAddress)) throw new Error('Invalid walletAddress')
  if (!email || !email.includes('@')) throw new Error('Invalid email')

  const { filePath, state } = await readWaitlistState(input.customPath)
  const key = walletKey(walletAddress)
  const now = new Date().toISOString()
  const existing = state.users[key]
  const user: WaitlistUser = existing
    ? { ...existing, email, updatedAt: now }
    : {
        walletAddress,
        email,
        createdAt: now,
        updatedAt: now,
        cumulativePoints: 0,
        lastSnapshotAt: null,
        latestSrBalance: '0',
        latestVvvBalance: '0',
        latestMultiplier: 1,
        latestUsdPerMinute: 0,
      }
  state.users[key] = user
  await writeWaitlistState(state, input.customPath)
  return { filePath, user }
}

export async function getWaitlistUser(walletAddress: string, customPath?: string): Promise<WaitlistUser | null> {
  if (!isLikelyEthAddress(walletAddress)) return null
  const { state } = await readWaitlistState(customPath)
  return state.users[walletKey(walletAddress)] ?? null
}
