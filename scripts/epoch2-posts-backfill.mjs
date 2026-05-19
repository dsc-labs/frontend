#!/usr/bin/env node
/**
 * Replay Epoch 2 post counting (checkpoint days 15→19) and score all counted posts.
 *
 * Usage:
 *   npm run epoch2:posts-backfill -- --replace
 *   npm run epoch2:posts-backfill -- --replace --days 2026-05-15,2026-05-16,2026-05-17
 *
 * Or against a running server:
 *   curl -sS -X POST "http://127.0.0.1:4022/api/mindshare/epoch2-posts-backfill?replace=1" \
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

const args = process.argv.slice(2)
const replace = args.includes('--replace')
const daysIdx = args.indexOf('--days')
const days = daysIdx >= 0 ? args[daysIdx + 1] : ''
const runSr = args.includes('--runSr')

const port = process.env.PORT || '3000'
const qs = new URLSearchParams()
if (replace) qs.set('replace', '1')
if (days) qs.set('days', days)
if (runSr) qs.set('runSr', '1')

const apiUrl =
  process.env.EPOCH2_POSTS_BACKFILL_API_URL?.trim() ||
  `http://127.0.0.1:${port}/api/mindshare/epoch2-posts-backfill?${qs}`

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
