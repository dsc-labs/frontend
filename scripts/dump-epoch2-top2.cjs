#!/usr/bin/env node
/**
 * Dump top N wallets from mindshare_submissions.csv with post counts + simple score
 * (score.md: quality × follower multiplier; default quality, no X fetch).
 *
 * SR balance resolution (see EPOCH2_DUMP_SR_PRIORITY):
 *   - On-chain $SR on Base via JSON-RPC when BASE_RPC_URL or VITE_BASE_RPC_URL is set
 *     (same token as waitlist: lib/waitlistPricing WAITLIST_SR_TOKEN).
 *   - Else waitlist state `latestSrBalance` if that wallet is registered.
 *   - Else numeric `sr balance` column from the CSV when present.
 *   - Else "N/A".
 *
 * Mindshare wallets often are not in waitlist `state.json` — without RPC you will see N/A.
 *
 * Usage:
 *   node scripts/dump-epoch2-top2.cjs > epoch2_top2.csv
 *
 * Env (optional):
 *   MINDSHARE_SUBMISSIONS_CSV_PATH
 *   WAITLIST_STATE_PATH
 *   BASE_RPC_URL / VITE_BASE_RPC_URL — enable on-chain SR reads
 *   EPOCH2_DUMP_FETCH_SR — default 1 when RPC URL is set; set 0 to skip RPC
 *   EPOCH2_DUMP_SR_PRIORITY — `chain` (default) or `waitlist`
 *   EPOCH2_DUMP_RPC_CONCURRENCY — parallel eth_call limit (default 8)
 *   MINDSHARE_EPOCH2_DEFAULT_QUALITY (default 4)
 *   EPOCH2_DUMP_TOP_N — max rows (default: no limit / all). Use a positive number to cap (e.g. 100).
 *   EPOCH2_DUMP_TOP_N=0 — same as no limit (all wallets with ≥1 post URL).
 *   EPOCH2_DUMP_MIN_SR_TOKENS — min SR (inclusive) to include a row; unset → same as
 *     MINDSHARE_EPOCH2_MIN_SR_TOKENS if set, else 0 (include all). Set to 0 to force no SR filter.
 */

const fs = require('fs');
const path = require('path');

/** Same contract as waitlist snapshot/register (Base mainnet). */
const SR_TOKEN_ADDRESS = '0x10c56F005a379f8eAfc88ff5c3f40d30F0031AC9';
const SR_DECIMALS = 18;

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

const CSV_PATH =
  process.env.MINDSHARE_SUBMISSIONS_CSV_PATH || path.resolve(process.cwd(), 'mindshare_submissions.csv');
const WAITLIST_STATE_PATH =
  process.env.WAITLIST_STATE_PATH || path.resolve(process.cwd(), 'data/waitlist/state.json');
const TOP_N = (() => {
  const raw = process.env.EPOCH2_DUMP_TOP_N;
  if (raw === undefined || raw === '') return Infinity;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return Infinity;
  return n;
})();
const REQUIRE_WAITLIST = process.env.EPOCH2_DUMP_REQUIRE_WAITLIST === '1';

/** Inclusive minimum SR to keep a row; 0 = no filter. */
function dumpMinSrInclusive() {
  const ex = process.env.EPOCH2_DUMP_MIN_SR_TOKENS;
  if (ex !== undefined && String(ex).trim() !== '') {
    const n = Number(String(ex).replace(/,/g, '').trim());
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  const m = Number(String(process.env.MINDSHARE_EPOCH2_MIN_SR_TOKENS ?? '').replace(/,/g, '').trim());
  return Number.isFinite(m) && m >= 0 ? m : 0;
}

function resolvedSrNumeric(srDisplay) {
  if (srDisplay === 'N/A') return NaN;
  const n = Number(String(srDisplay).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : NaN;
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        const n = line[i + 1];
        if (n === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function normalizeXHandle(raw) {
  const t = String(raw || '').trim();
  if (!t) return '';
  return t.startsWith('@') ? t : `@${t}`;
}

function csvCell(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function extractPostUrls(raw) {
  const t = raw.trim();
  if (!t) return [];
  const found = t.match(/https?:\/\/(?:x\.com|twitter\.com)\/[^\s,'"]+/gi);
  if (found && found.length) return [...new Set(found.map((u) => u.replace(/[,.)]+$/, '')))];
  return t
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
}

const MAX_QUALITY = 7;

function followerMultiplier(followers) {
  const f = Math.max(0, Math.floor(followers));
  if (f < 3001) return 1.0;
  if (f < 5001) return 1.1;
  if (f < 10001) return 1.2;
  if (f < 20001) return 1.3;
  if (f < 50001) return 1.4;
  return 1.5;
}
function clampQ(q) {
  if (!Number.isFinite(q)) return 0;
  return Math.round(Math.max(0, Math.min(MAX_QUALITY, q)) * 100) / 100;
}
/** score.md: quality (0–7) × follower multiplier per post. */
function finalScore(quality, followers) {
  const q = clampQ(quality);
  const m = followerMultiplier(followers);
  return Math.round(q * m * 100) / 100;
}

function getWaitlistUser(usersRecord, walletLower) {
  const direct = usersRecord[walletLower];
  if (direct) return direct;
  return Object.values(usersRecord).find((u) => u.walletAddress.trim().toLowerCase() === walletLower);
}

function balanceOfCallData(walletAddress) {
  const normalized = walletAddress.toLowerCase().replace(/^0x/, '');
  return `0x70a08231000000000000000000000000${normalized}`;
}

function rawBalanceToTokenUnits(raw, decimals) {
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const fraction = raw % base;
  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 6);
  const value = Number(`${whole.toString()}.${fractionStr}`);
  return Number.isFinite(value) ? value : 0;
}

async function fetchErc20BalanceRaw(rpcUrl, tokenAddress, walletAddress) {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{ to: tokenAddress, data: balanceOfCallData(walletAddress) }, 'latest'],
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.result || json.error) {
    throw new Error(json.error?.message || `rpc failed (${res.status})`);
  }
  return BigInt(json.result);
}

function normalizeSrString(s) {
  if (s == null) return null;
  const t = String(s).replace(/,/g, '').trim();
  if (!t) return null;
  return t;
}

function parseCsvSrCell(raw) {
  const t = normalizeSrString(raw);
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(4);
}

async function runPool(items, concurrency, worker) {
  let i = 0;
  async function one() {
    for (;;) {
      if (i >= items.length) return;
      const idx = i;
      i += 1;
      await worker(items[idx], idx);
    }
  }
  const n = Math.min(Math.max(1, concurrency), Math.max(1, items.length));
  await Promise.all(Array.from({ length: items.length ? n : 0 }, () => one()));
}

function resolveSrForRow(row, users, chainByWallet, priority) {
  const w = row.wallet.toLowerCase();
  const wl = getWaitlistUser(users, w);
  const waitlistSr = normalizeSrString(wl?.latestSrBalance);
  const chainSr = chainByWallet.get(w);
  const csvSr = row.csvSr ? parseCsvSrCell(row.csvSr) : null;

  const pickChainFirst = () => {
    if (chainSr != null) return chainSr;
    if (waitlistSr != null) return waitlistSr;
    if (csvSr != null) return csvSr;
    return 'N/A';
  };
  const pickWaitlistFirst = () => {
    if (waitlistSr != null) return waitlistSr;
    if (chainSr != null) return chainSr;
    if (csvSr != null) return csvSr;
    return 'N/A';
  };
  return priority === 'waitlist' ? pickWaitlistFirst() : pickChainFirst();
}

async function main() {
  let users = {};
  try {
    const raw = fs.readFileSync(WAITLIST_STATE_PATH, 'utf8');
    const state = JSON.parse(raw);
    users = state.users || {};
  } catch (e) {
    console.error(`Warning: could not read waitlist state at ${WAITLIST_STATE_PATH}:`, e.message);
  }

  const waitlistKeys = new Set(Object.values(users).map((u) => u.walletAddress.trim().toLowerCase()));

  const csv = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = lines[0].trim();
  if (!/^x handle,wallet,name,post submited(,sr balance)?$/i.test(header)) {
    console.error('Unexpected CSV header:', header);
    process.exit(1);
  }

  const defaultQuality = Number(process.env.MINDSHARE_EPOCH2_DEFAULT_QUALITY || '4') || 4;
  const DEFAULT_FOLLOWERS = 0;

  const byWallet = new Map();

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const xHandle = cells[0] ?? '';
    const walletAddress = cells[1] ?? '';
    const name = cells[2] ?? '';
    const postSubmitted = cells[3] ?? '';
    const srCell = cells[4] ?? '';
    const w = walletAddress.trim().toLowerCase();
    if (!w) continue;
    if (REQUIRE_WAITLIST && !waitlistKeys.has(w)) continue;

    if (!byWallet.has(w)) {
      byWallet.set(w, {
        wallet: walletAddress.trim(),
        xHandle: normalizeXHandle(xHandle),
        displayName: (name || '').trim(),
        posts: 0,
        score: 0,
        csvSr: '',
      });
    }

    const urls = extractPostUrls(postSubmitted || '');
    const agg = byWallet.get(w);
    if (!agg.xHandle && xHandle) agg.xHandle = normalizeXHandle(xHandle);
    if (!agg.displayName && name) agg.displayName = name.trim();
    const srTrim = (srCell ?? '').trim();
    if (srTrim) agg.csvSr = srTrim.replace(/,/g, '');
    for (const _url of urls) {
      const s = finalScore(defaultQuality, DEFAULT_FOLLOWERS);
      agg.posts += 1;
      agg.score += s;
    }
  }

  const candidates = [...byWallet.values()].filter((u) => u.posts > 0);

  const rpcUrl = (process.env.BASE_RPC_URL || process.env.VITE_BASE_RPC_URL || '').trim();
  const fetchSrDefault = Boolean(rpcUrl);
  const fetchSr =
    process.env.EPOCH2_DUMP_FETCH_SR === '0'
      ? false
      : process.env.EPOCH2_DUMP_FETCH_SR === '1'
        ? true
        : fetchSrDefault;

  const priority = (process.env.EPOCH2_DUMP_SR_PRIORITY || 'chain').trim().toLowerCase();
  const srPriority = priority === 'waitlist' ? 'waitlist' : 'chain';
  const concurrency = Math.max(
    1,
    Math.min(32, Number(process.env.EPOCH2_DUMP_RPC_CONCURRENCY || '8') || 8),
  );

  const minSr = dumpMinSrInclusive();

  const chainByWallet = new Map();
  if (fetchSr && rpcUrl) {
    console.error(
      `[epoch2-dump] Fetching on-chain SR for ${candidates.length} wallets (concurrency=${concurrency})…`,
    );
    await runPool(candidates, concurrency, async (row) => {
      const w = row.wallet.toLowerCase();
      try {
        const raw = await fetchErc20BalanceRaw(rpcUrl, SR_TOKEN_ADDRESS, row.wallet);
        const units = rawBalanceToTokenUnits(raw, SR_DECIMALS);
        chainByWallet.set(w, units.toFixed(4));
      } catch (e) {
        console.error(`Warning: SR on-chain fetch failed for ${row.wallet}:`, e.message || e);
      }
    });
  } else if (!rpcUrl) {
    console.error(
      '[epoch2-dump] No BASE_RPC_URL / VITE_BASE_RPC_URL — SR column uses waitlist + CSV only (many rows may be N/A).',
    );
  }

  const withSr = candidates.map((row) => ({
    row,
    sr: resolveSrForRow(row, users, chainByWallet, srPriority),
  }));

  const kept =
    minSr <= 0
      ? withSr
      : withSr.filter(({ sr }) => {
          const n = resolvedSrNumeric(sr);
          return Number.isFinite(n) && n >= minSr;
        });

  if (minSr > 0) {
    console.error(
      `[epoch2-dump] SR floor ≥ ${minSr} tokens: ${kept.length} of ${candidates.length} wallet(s) with posts remain.`,
    );
  }

  const top = kept
    .sort((a, b) => b.row.score - a.row.score)
    .slice(0, TOP_N);

  console.log('walletAddress,xHandle,displayName,srBalance,postCount,score');
  for (const { row, sr } of top) {
    const handle = row.xHandle || '';
    const displayName = row.displayName || '';
    console.log(
      [row.wallet, handle, displayName, sr, row.posts, row.score.toFixed(2)].map(csvCell).join(','),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
