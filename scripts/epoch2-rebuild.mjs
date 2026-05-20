#!/usr/bin/env node
/**
 * Full Epoch 2 rebuild: SR eligibility (days 15→18 & 20) + post counting + scores.
 *
 * - Reads live mindshare_submissions.csv (repo root by default)
 * - Writes snapshots to data/newmindshare/ (or MINDSHARE_EPOCH2_DATA_DIR)
 *
 * Usage:
 *   npm run epoch2:rebuild
 *   npm run epoch2:rebuild -- --latest-sr
 *
 * Full sandbox (CSV copied under data dir): npm run epoch2:rebuild -- --sandbox
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { runEpoch2FullRebuild } from '../lib/mindshareEpoch2FullRebuild.ts'
import {
  applyEpoch2DataDirToProcessEnv,
  applyEpoch2SnapshotDirToProcessEnv,
  defaultMindshareSubmissionsCsvPath,
} from '../lib/mindshareEpoch2DataPaths.ts'

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

loadEnv()

const args = process.argv.slice(2)
const latestSr = args.includes('--latest-sr')
const sandbox = args.includes('--sandbox')
const dirIdx = args.indexOf('--data-dir')
const snapshotDir = dirIdx >= 0 ? args[dirIdx + 1] : undefined

if (sandbox) {
  applyEpoch2DataDirToProcessEnv(snapshotDir)
} else {
  applyEpoch2SnapshotDirToProcessEnv(snapshotDir)
}

const csv = defaultMindshareSubmissionsCsvPath()
const snapRoot = process.env.MINDSHARE_EPOCH2_DATA_DIR

if (!existsSync(csv)) {
  console.error(`Missing live submissions CSV: ${csv}`)
  process.exit(1)
}

if (!process.env.BASE_ARCHIVE_RPC_URL?.trim() && !process.env.BASE_RPC_URL?.trim()) {
  console.error('Set BASE_ARCHIVE_RPC_URL in .env for SR eligibility backfill.')
  process.exit(1)
}

console.error(`[epoch2:rebuild] submissions (read): ${csv}`)
console.error(`[epoch2:rebuild] snapshots (write): ${snapRoot}`)

const result = await runEpoch2FullRebuild({
  bearerToken: process.env.TWITTER_BEARER_TOKEN,
  dataDir: snapRoot,
  replacePosts: true,
  runLatestSrSnapshot: latestSr,
})

console.log(JSON.stringify(result, null, 2))
if (!result.ok) process.exit(1)
