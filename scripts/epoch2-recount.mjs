#!/usr/bin/env node
/**
 * Re-score Epoch 2 leaderboard from countedPostKeys (no SR snapshot, no new daily window posts).
 *
 * Usage:
 *   npm run epoch2:recount
 *   # or against a running server:
 *   curl -sS -X POST "http://127.0.0.1:4022/api/mindshare/epoch2-recount" \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

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

const apiUrl =
  process.env.EPOCH2_RECOUNT_API_URL?.trim() ||
  `http://127.0.0.1:${process.env.PORT || '3000'}/api/mindshare/epoch2-recount`
const secret = process.env.CRON_SECRET || process.env.WAITLIST_CRON_SECRET || ''

const headers = { Accept: 'application/json' }
if (secret) headers.Authorization = `Bearer ${secret}`

const res = await fetch(apiUrl, { method: 'POST', headers })
const body = await res.text()
if (!res.ok) {
  console.error(body)
  process.exit(1)
}
console.log(body)
