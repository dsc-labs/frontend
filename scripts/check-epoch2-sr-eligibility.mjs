#!/usr/bin/env node
/**
 * Check Epoch 2 SR checkpoint eligibility by day for one wallet or X handle.
 *
 * Usage:
 *   npm run epoch2:check-sr -- denispodd_17
 *   npm run epoch2:check-sr -- --handle @denispodd_17
 *   npm run epoch2:check-sr -- --wallet 0xf517Cd0843aeFCa24046d0eD02D6E04393678ab8
 *   npm run epoch2:check-sr -- denispodd_17 --chain
 *   npm run epoch2:check-sr -- denispodd_17 --days 2026-05-15,2026-05-16
 *   npm run epoch2:check-sr -- denispodd_17 --json
 *
 * Sources:
 *   - snapshot: epoch2_sr_snapshots.jsonl (same as /epoch2 UI checkpoints)
 *   - chain (--chain): archive RPC balance at each day's 17:00 UTC snapshot instant
 *
 * Env:
 *   MINDSHARE_SUBMISSIONS_CSV_PATH
 *   MINDSHARE_EPOCH2_SR_SNAPSHOT_LOG_PATH
 *   BASE_ARCHIVE_RPC_URL / BASE_RPC_URL (for --chain)
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { readMindshareSubmissionsCsv } from '../lib/mindshareCsvStore.ts'
import {
  EPOCH2_CHECKPOINT_DAY_KEYS,
  loadEpoch2SrEligibilityByDay,
} from '../lib/mindshareEpoch2Checkpoints.ts'
import { isGuaranteedTop7Handle } from '../lib/mindshareEpoch2GuaranteedTop7.ts'
import { readEpoch2DailyState, readEpoch2LeaderboardSnapshot } from '../lib/mindshareEpoch2DailyState.ts'
import { fetchSrBalanceAtEligibilityDay } from '../lib/mindshareEpoch2SrBalanceAtDay.ts'
import { readEpoch2SrEligibleWalletsFromSnapshot } from '../lib/mindshareEpoch2SrSnapshot.ts'
import { getServerArchiveRpcUrl } from '../lib/serverBaseRpc.ts'
import { normalizeXUsername } from '../lib/xTweetMetrics.ts'

function loadEnv() {
  const p = resolve(process.cwd(), '.env')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (process.env[k] === undefined) process.env[k] = v
  }
}

function parseArgs(argv) {
  const out = {
    wallet: '',
    handle: '',
    chain: false,
    json: false,
    days: [...EPOCH2_CHECKPOINT_DAY_KEYS],
  }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--chain') out.chain = true
    else if (a === '--json') out.json = true
    else if (a === '--wallet' && argv[i + 1]) out.wallet = argv[++i].trim()
    else if (a === '--handle' && argv[i + 1]) out.handle = argv[++i].trim()
    else if (a === '--days' && argv[i + 1]) {
      out.days = argv[++i]
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean)
    } else if (a.startsWith('--')) {
      console.error(`Unknown flag: ${a}`)
      process.exit(1)
    } else if (!out.wallet && !out.handle) {
      const t = a.trim()
      if (t.toLowerCase().startsWith('0x')) out.wallet = t
      else out.handle = t
    }
  }
  return out
}

async function resolveWalletAndHandle(args) {
  const rows = await readMindshareSubmissionsCsv()
  const byWallet = new Map()
  const byHandle = new Map()

  for (const row of rows) {
    const wk = row.walletAddress.trim().toLowerCase()
    if (!wk.startsWith('0x') || wk.length !== 42) continue
    const h = normalizeXUsername(row.xHandle)
    if (!byWallet.has(wk)) {
      byWallet.set(wk, { wallet: row.walletAddress.trim(), handle: h, name: row.name.trim() })
    }
    if (h && !byHandle.has(h)) {
      byHandle.set(h, { wallet: row.walletAddress.trim(), handle: h, name: row.name.trim() })
    }
  }

  if (args.wallet) {
    const wk = args.wallet.trim().toLowerCase()
    const meta = byWallet.get(wk)
    return {
      walletLower: wk,
      wallet: meta?.wallet ?? args.wallet.trim(),
      handle: meta?.handle ?? '',
      name: meta?.name ?? '',
      inCsv: Boolean(meta),
    }
  }

  const h = normalizeXUsername(args.handle)
  if (!h) {
    console.error('Provide --wallet 0x... or --handle name (or positional @handle / 0x...)')
    process.exit(1)
  }
  const meta = byHandle.get(h)
  if (!meta) {
    console.error(`Handle @${h} not found in mindshare_submissions.csv`)
    process.exit(1)
  }
  return {
    walletLower: meta.wallet.toLowerCase(),
    wallet: meta.wallet,
    handle: h,
    name: meta.name,
    inCsv: true,
  }
}

loadEnv()

const args = parseArgs(process.argv)
const identity = await resolveWalletAndHandle(args)
const eligibilityByDay = await loadEpoch2SrEligibilityByDay()
const liveSnap = await readEpoch2SrEligibleWalletsFromSnapshot()
const leaderboardSnap = await readEpoch2LeaderboardSnapshot()
const dailyState = await readEpoch2DailyState()

const isGuaranteed = identity.handle ? isGuaranteedTop7Handle(identity.handle) : false
const liveBalance = liveSnap?.balancesByWallet?.[identity.walletLower]
const liveEligible = liveSnap?.walletsLower?.includes(identity.walletLower) ?? false
const lbUser = leaderboardSnap?.users.find((u) => u.wallet.toLowerCase() === identity.walletLower)
const countedPosts = dailyState.countedPostKeys.filter((k) =>
  k.startsWith(`${identity.walletLower}:`),
).length

const rpcUrl = getServerArchiveRpcUrl()
if (args.chain && !rpcUrl) {
  console.error('Missing BASE_ARCHIVE_RPC_URL or BASE_RPC_URL (required for --chain)')
  process.exit(1)
}

const dayRows = []

for (const day of args.days) {
  const inSnapshot = isGuaranteed || (eligibilityByDay.get(day)?.has(identity.walletLower) ?? false)
  const row = {
    day,
    uiCheckpoint: inSnapshot,
    snapshotSource: isGuaranteed ? 'guaranteed-top-7' : inSnapshot ? 'epoch2_sr_snapshots.jsonl' : 'not-listed',
  }

  if (args.chain) {
    try {
      const chain = await fetchSrBalanceAtEligibilityDay({
        walletLower: identity.walletLower,
        eligibilityDayKey: day,
        rpcUrl,
      })
      row.chainSrBalance = chain.srBalance
      row.chainEligible = chain.eligibleExclusive
      row.blockNumber = chain.blockNumber
      row.targetUtc = new Date(chain.targetTimestampSec * 1000).toISOString()
    } catch (e) {
      row.chainError = e instanceof Error ? e.message : String(e)
    }
  }

  dayRows.push(row)
}

const summary = {
  wallet: identity.wallet,
  walletLower: identity.walletLower,
  xHandle: identity.handle ? `@${identity.handle}` : null,
  displayName: identity.name || null,
  inMindshareCsv: identity.inCsv,
  guaranteedTop7: isGuaranteed,
  liveSrEligible: liveEligible,
  liveSrBalance: typeof liveBalance === 'number' ? liveBalance : null,
  onLeaderboardUsers: Boolean(lbUser),
  leaderboardPostCount: lbUser?.postCount ?? null,
  leaderboardScore: lbUser?.score ?? null,
  countedPostsInDailyState: countedPosts,
  thresholdExclusive: 10_000,
  days: dayRows,
}

if (args.json) {
  console.log(JSON.stringify(summary, null, 2))
  process.exit(0)
}

console.log('')
console.log('Epoch 2 SR eligibility by day')
console.log('─'.repeat(60))
console.log(`Wallet:     ${identity.wallet}`)
if (identity.handle) console.log(`X handle:   @${identity.handle}`)
if (identity.name) console.log(`Name:       ${identity.name}`)
console.log(`In CSV:     ${identity.inCsv ? 'yes' : 'no'}`)
console.log(`Top 7:      ${isGuaranteed ? 'yes (all checkpoints forced on UI)' : 'no'}`)
console.log(`Live SR:    ${typeof liveBalance === 'number' ? liveBalance.toLocaleString('en-US') : '—'}  eligible now: ${liveEligible ? 'yes' : 'no'}`)
console.log(`Leaderboard: ${lbUser ? `yes — postCount ${lbUser.postCount}, score ${lbUser.score}` : 'not in users[]'}`)
console.log(`Counted posts (daily state): ${countedPosts}`)
console.log('')
console.log('Eligibility day UI checkpoint    Snapshot log')
if (args.chain) console.log('                Chain SR (>10k)   Block @ 17:00 UTC boundary')
console.log('─'.repeat(60))

for (const row of dayRows) {
  const ui = row.uiCheckpoint ? '✓ eligible' : '✗ not eligible'
  const snap = row.snapshotSource
  let line = `${row.day}      ${ui.padEnd(16)} ${snap}`
  if (args.chain) {
    if (row.chainError) {
      line += `\n                 chain error: ${row.chainError}`
    } else {
      const ce = row.chainEligible ? '✓' : '✗'
      line += `\n                 ${ce} ${row.chainSrBalance?.toLocaleString('en-US')} SR  (block ${row.blockNumber})`
    }
  }
  console.log(line)
}

if (!args.chain) {
  console.log('')
  console.log('Tip: add --chain to compare on-chain $SR at each midnight snapshot (archive RPC).')
}

console.log('')
