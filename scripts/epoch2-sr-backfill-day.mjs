#!/usr/bin/env node
/**
 * Trigger historical SR checkpoint backfill via API.
 *
 *   npm run epoch2:sr-backfill-day -- --day 2026-05-16
 *   npm run epoch2:sr-backfill-day -- --day 2026-05-16 --replace
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

let day = ''
let replace = false
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i]
  if (a === '--replace') replace = true
  else if (a === '--day' && process.argv[i + 1]) day = process.argv[++i]
  else if (/^\d{4}-\d{2}-\d{2}$/.test(a)) day = a
}

if (!day) {
  console.error('Usage: npm run epoch2:sr-backfill-day -- --day YYYY-MM-DD [--replace]')
  process.exit(1)
}

const port = process.env.PORT || '4022'
const base =
  process.env.EPOCH2_SR_BACKFILL_API_URL?.trim() ||
  `http://127.0.0.1:${port}/api/mindshare/epoch2-sr-backfill-day`
const url = new URL(base)
url.searchParams.set('day', day)
if (replace) url.searchParams.set('replace', '1')

const secret = process.env.CRON_SECRET || process.env.WAITLIST_CRON_SECRET || ''
const headers = { Accept: 'application/json' }
if (secret) headers.Authorization = `Bearer ${secret}`

const res = await fetch(url.toString(), { method: 'POST', headers })
const text = await res.text()
if (!res.ok) {
  console.error(text)
  process.exit(1)
}
console.log(text)
