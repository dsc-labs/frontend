#!/usr/bin/env node
/**
 * Trace a wallet across CSV, SR jsonl, eligible file, leaderboard snapshot, daily state.
 *
 * Usage:
 *   npx tsx scripts/trace-wallet-snapshots.mjs 0x746eea3cac38e2446f0b6b3a2d7af8d90b9dbb80
 *   npx tsx scripts/trace-wallet-snapshots.mjs davidbaseeth
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { readMindshareSubmissionsCsv, parseCsvRecords, parseCsvDataLine } from '../lib/mindshareCsvStore.ts'
import { normalizeXUsername } from '../lib/xTweetMetrics.ts'
import { loadEpoch2SrEligibilityByDay } from '../lib/mindshareEpoch2Checkpoints.ts'
import { readEpoch2DailyState, readEpoch2LeaderboardSnapshot } from '../lib/mindshareEpoch2DailyState.ts'
import { readEpoch2SrEligibleWalletsFromSnapshot } from '../lib/mindshareEpoch2SrSnapshot.ts'

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

function resolveWallet(input) {
  const t = input.trim()
  if (t.toLowerCase().startsWith('0x') && t.length === 42) {
    return t.toLowerCase()
  }
  const h = normalizeXUsername(t)
  return { handle: h, wallet: null }
}

async function grepCsvRaw(wallet, handle) {
  const csvPath =
    process.env.MINDSHARE_SUBMISSIONS_CSV_PATH?.trim() ||
    resolve(process.cwd(), 'mindshare_submissions.csv')
  if (!existsSync(csvPath)) return { path: csvPath, exists: false, rawMatches: 0, parsedRows: 0 }

  const raw = readFileSync(csvPath, 'utf8')
  const w = wallet.toLowerCase()
  const rawMatches =
    (w ? (raw.toLowerCase().match(new RegExp(w.slice(2), 'g'))?.length ?? 0) : 0) +
    (handle ? (raw.toLowerCase().includes(handle) ? 1 : 0) : 0)

  const rows = await readMindshareSubmissionsCsv(csvPath)
  const parsed = rows.filter((r) => {
    const wk = r.walletAddress.trim().toLowerCase()
    const h = normalizeXUsername(r.xHandle)
    return (wallet && wk === wallet) || (handle && h === handle)
  })

  return {
    path: csvPath,
    exists: true,
    rawMatches,
    parsedRows: parsed.length,
    samples: parsed.slice(0, 3).map((r) => ({
      xHandle: r.xHandle,
      wallet: r.walletAddress,
      postSubmitted: r.postSubmitted.slice(0, 80),
      submittedAt: r.submittedAt || '(empty)',
    })),
  }
}

async function main() {
  loadEnv()
  const arg = process.argv[2]
  if (!arg) {
    console.error('Usage: npx tsx scripts/trace-wallet-snapshots.mjs <0x...|handle>')
    process.exit(1)
  }

  let wallet = ''
  let handle = ''
  if (arg.trim().toLowerCase().startsWith('0x')) {
    wallet = arg.trim().toLowerCase()
  } else {
    handle = normalizeXUsername(arg)
  }

  if (!wallet && handle) {
    const rows = await readMindshareSubmissionsCsv()
    const row = rows.find((r) => normalizeXUsername(r.xHandle) === handle)
    if (row) wallet = row.walletAddress.trim().toLowerCase()
  }

  const srLogPath =
    process.env.MINDSHARE_EPOCH2_SR_SNAPSHOT_LOG_PATH?.trim() ||
    resolve(process.cwd(), 'data/mindshare/epoch2_sr_snapshots.jsonl')

  const srLines = existsSync(srLogPath)
    ? readFileSync(srLogPath, 'utf8').split(/\r?\n/).filter((l) => l.trim())
    : []

  const srSnapshots = []
  srLines.forEach((line, index) => {
    try {
      const j = JSON.parse(line)
      const list = j.eligibleWalletsLower ?? []
      const inList = wallet ? list.includes(wallet) : false
      srSnapshots.push({
        line: index + 1,
        at: j.at,
        eligibilityDayKey: j.eligibilityDayKey,
        eligibleCount: j.eligibleCount,
        inList,
        balanceSource: j.balanceSource,
        blockNumber: j.blockNumber,
      })
    } catch {
      srSnapshots.push({ line: index + 1, parseError: true })
    }
  })

  const eligibleSnap = await readEpoch2SrEligibleWalletsFromSnapshot()
  const lb = await readEpoch2LeaderboardSnapshot()
  const daily = await readEpoch2DailyState()
  const byDay = await loadEpoch2SrEligibilityByDay()

  const lbUser = lb?.users.find((u) => u.wallet.toLowerCase() === wallet)
  const inEligibleAddresses = lb?.eligibleAddresses?.includes(wallet) ?? false
  const countedKeys = daily.countedPostKeys.filter((k) => k.startsWith(`${wallet}:`))

  const csv = await grepCsvRaw(wallet, handle)

  const report = {
    query: { wallet: wallet || null, handle: handle ? `@${handle}` : null },
    mindshareCsv: csv,
    srSnapshotsJsonl: {
      path: srLogPath,
      lineCount: srLines.length,
      appearances: srSnapshots.filter((s) => s.inList),
      allLines: srSnapshots,
    },
    epoch2_sr_eligible_wallets: {
      inList: eligibleSnap?.walletsLower?.includes(wallet) ?? false,
      balance: eligibleSnap?.balancesByWallet?.[wallet],
      eligibilityDayKey: eligibleSnap?.eligibilityDayKey,
    },
    leaderboard: {
      inUsersArray: Boolean(lbUser),
      inEligibleAddressesOnly: !lbUser && inEligibleAddresses,
      user: lbUser
        ? {
            username: lbUser.username,
            xHandle: lbUser.xHandle,
            postCount: lbUser.postCount,
            score: lbUser.score,
            srEligible: lbUser.srEligible,
          }
        : null,
    },
    dailyState: { countedPostKeys: countedKeys.length, keys: countedKeys.slice(0, 5) },
    checkpointsByDay: {},
  }

  for (const [day, set] of byDay) {
    report.checkpointsByDay[day] = wallet ? set.has(wallet) : false
  }

  console.log(JSON.stringify(report, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
