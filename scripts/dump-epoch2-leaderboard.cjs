#!/usr/bin/env node
/**
 * Dump the public /epoch2 leaderboard (same data as GET /api/mindshare/test-epoch2-leaderboard).
 *
 * Source order:
 *   1. data/mindshare/epoch2_leaderboard_snapshot.json (or MINDSHARE_EPOCH2_LEADERBOARD_SNAPSHOT_PATH)
 *   2. HTTP fetch from EPOCH2_DUMP_API_URL (default http://127.0.0.1:3000/api/mindshare/test-epoch2-leaderboard)
 *
 * Row order matches the live page (guaranteed top 7, then eligible by score, then not eligible).
 *
 * Usage:
 *   node scripts/dump-epoch2-leaderboard.cjs > epoch2_leaderboard.csv
 *   node scripts/dump-epoch2-leaderboard.cjs --stats   # print summary to stderr
 *
 * Env:
 *   MINDSHARE_EPOCH2_LEADERBOARD_SNAPSHOT_PATH
 *   EPOCH2_DUMP_API_URL — fallback when snapshot file is missing
 *   EPOCH2_DUMP_TOP_N — max rows (default: all). 0 = all.
 *   EPOCH2_DUMP_ELIGIBLE_ONLY=1 — only srEligible rows
 *   EPOCH2_DUMP_INELIGIBLE_ONLY=1 — only not eligible rows
 */

const fs = require('fs');
const path = require('path');

function loadEnvFromDotenvFile() {
  const p = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(p)) return;
  const text = fs.readFileSync(p, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFromDotenvFile();

const SNAPSHOT_PATH =
  process.env.MINDSHARE_EPOCH2_LEADERBOARD_SNAPSHOT_PATH ||
  path.resolve(process.cwd(), 'data/mindshare/epoch2_leaderboard_snapshot.json');

const API_URL =
  process.env.EPOCH2_DUMP_API_URL ||
  'http://127.0.0.1:3000/api/mindshare/test-epoch2-leaderboard';

const TOP_N = (() => {
  const raw = process.env.EPOCH2_DUMP_TOP_N;
  if (raw === undefined || raw === '') return Infinity;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return Infinity;
  return n;
})();

const ELIGIBLE_ONLY = process.env.EPOCH2_DUMP_ELIGIBLE_ONLY === '1';
const INELIGIBLE_ONLY = process.env.EPOCH2_DUMP_INELIGIBLE_ONLY === '1';
const WANT_STATS = process.argv.includes('--stats');

function csvCell(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatHandle(username) {
  const t = String(username || '').trim();
  if (!t) return '';
  return t.startsWith('@') ? t : `@${t}`;
}

function readSnapshotFromDisk() {
  if (!fs.existsSync(SNAPSHOT_PATH)) return null;
  const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
  const j = JSON.parse(raw);
  if (!j || j.ok !== true || !Array.isArray(j.users)) {
    throw new Error(`Invalid snapshot at ${SNAPSHOT_PATH}`);
  }
  return j;
}

async function fetchSnapshotFromApi() {
  let res;
  try {
    res = await fetch(API_URL, { headers: { Accept: 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Could not reach ${API_URL} (${msg}). Start \`npm run dev\`, run the daily snapshot, or set MINDSHARE_EPOCH2_LEADERBOARD_SNAPSHOT_PATH.`,
    );
  }
  const text = await res.text();
  let j;
  try {
    j = JSON.parse(text);
  } catch {
    throw new Error(`API returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(`API HTTP ${res.status}: ${j?.error || text.slice(0, 200)}`);
  }
  if (!j || j.ok !== true || !Array.isArray(j.users)) {
    throw new Error('API response is not a valid epoch2 leaderboard payload');
  }
  return j;
}

async function loadPayload() {
  const disk = readSnapshotFromDisk();
  if (disk) {
    console.error(`[epoch2-dump] Using snapshot file: ${SNAPSHOT_PATH}`);
    return disk;
  }
  console.error(`[epoch2-dump] No snapshot at ${SNAPSHOT_PATH}; fetching ${API_URL}`);
  return fetchSnapshotFromApi();
}

function filterUsers(users) {
  if (ELIGIBLE_ONLY && INELIGIBLE_ONLY) {
    console.error('[epoch2-dump] Both EPOCH2_DUMP_ELIGIBLE_ONLY and EPOCH2_DUMP_INELIGIBLE_ONLY set; no rows.');
    return [];
  }
  if (ELIGIBLE_ONLY) return users.filter((u) => u.srEligible === true);
  if (INELIGIBLE_ONLY) return users.filter((u) => !u.srEligible);
  return users;
}

function printStats(payload, rows) {
  const s = payload.stats || {};
  console.error('[epoch2-dump] generatedAt:', payload.generatedAt || '—');
  console.error('[epoch2-dump] snapshot stats:', {
    totalParticipants: s.totalParticipants,
    eligibleParticipants: s.eligibleParticipants,
    notEligibleParticipants: s.notEligibleParticipants,
    totalMindsharePosts: s.totalMindsharePosts,
    totalScore: s.totalScore,
    daysRemaining: s.daysRemaining,
    totalLikes: s.totalLikes,
    totalComments: s.totalComments,
    totalRetweets: s.totalRetweets,
  });
  console.error(`[epoch2-dump] exported rows: ${rows.length}`);
}

async function main() {
  const payload = await loadPayload();
  let users = filterUsers(payload.users);
  users = users.slice(0, TOP_N);

  if (WANT_STATS) printStats(payload, users);

  console.log('rank,username,wallet,postCount,score,srEligible,status');
  users.forEach((u, i) => {
    const rank = i + 1;
    const status = u.srEligible ? 'Eligible' : 'Not eligible';
    const score = Number(u.score);
    const scoreStr = Number.isFinite(score) ? score.toFixed(2) : '0.00';
    console.log(
      [
        rank,
        formatHandle(u.username),
        u.wallet,
        u.postCount ?? 0,
        scoreStr,
        u.srEligible ? 'true' : 'false',
        status,
      ]
        .map(csvCell)
        .join(','),
    );
  });
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
