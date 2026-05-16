#!/usr/bin/env node
/**
 * Query on-chain $SR balances (Base) for Epoch 2 wallets and print a table.
 *
 * Uses the same token + threshold as the daily SR snapshot (> 10,000 $SR).
 *
 * Usage:
 *   node scripts/query-epoch2-sr-balances.cjs
 *   node scripts/query-epoch2-sr-balances.cjs --source leaderboard-eligible
 *   node scripts/query-epoch2-sr-balances.cjs --source csv --min 0
 *   node scripts/query-epoch2-sr-balances.cjs --source missing
 *
 * Sources (--source or EPOCH2_SR_QUERY_SOURCE):
 *   eligible-snapshot     — wallets in data/mindshare/epoch2_sr_eligible_wallets.json (default)
 *   leaderboard-eligible  — leaderboard rows with srEligible=true
 *   leaderboard-all       — all wallets on epoch2_leaderboard_snapshot.json
 *   missing               — on-chain eligible in snapshot file but no leaderboard row
 *   csv                   — unique wallets from mindshare_submissions.csv
 *
 * Env:
 *   BASE_RPC_URL / VITE_BASE_RPC_URL — required for on-chain reads
 *   EPOCH2_SR_QUERY_RPC_CONCURRENCY — parallel eth_call limit (default 8)
 *   EPOCH2_SR_QUERY_MIN — min SR (exclusive) to mark eligible; default 10000 (product rule)
 *   EPOCH2_SR_QUERY_MIN=0 — print all queried wallets regardless of balance
 *   MINDSHARE_SUBMISSIONS_CSV_PATH, MINDSHARE_EPOCH2_LEADERBOARD_SNAPSHOT_PATH
 */

const fs = require('fs');
const path = require('path');

const SR_TOKEN_ADDRESS = '0x10c56F005a379f8eAfc88ff5c3f40d30F0031AC9';
const SR_DECIMALS = 18;
const DEFAULT_THRESHOLD_EXCLUSIVE = 10_000;

const SR_ELIGIBLE_PATH =
  process.env.MINDSHARE_EPOCH2_SR_ELIGIBLE_PATH ||
  path.resolve(process.cwd(), 'data/mindshare/epoch2_sr_eligible_wallets.json');
const LEADERBOARD_SNAPSHOT_PATH =
  process.env.MINDSHARE_EPOCH2_LEADERBOARD_SNAPSHOT_PATH ||
  path.resolve(process.cwd(), 'data/mindshare/epoch2_leaderboard_snapshot.json');
const CSV_PATH =
  process.env.MINDSHARE_SUBMISSIONS_CSV_PATH ||
  path.resolve(process.cwd(), 'mindshare_submissions.csv');

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

function parseArg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

const SOURCE =
  parseArg('--source', process.env.EPOCH2_SR_QUERY_SOURCE || 'eligible-snapshot').toLowerCase();

const THRESHOLD_EXCLUSIVE = (() => {
  const raw = process.env.EPOCH2_SR_QUERY_MIN;
  if (raw !== undefined && String(raw).trim() !== '') {
    const n = Number(String(raw).replace(/,/g, '').trim());
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_THRESHOLD_EXCLUSIVE;
  }
  return DEFAULT_THRESHOLD_EXCLUSIVE;
})();

const FILTER_ELIGIBLE_ONLY = hasFlag('--eligible-only') || process.env.EPOCH2_SR_QUERY_ELIGIBLE_ONLY === '1';
const SORT_BY_BALANCE = !hasFlag('--no-sort');

function normalizeWallet(w) {
  const t = String(w || '').trim().toLowerCase();
  if (!t.startsWith('0x') || t.length !== 42) return null;
  return t;
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readLeaderboardSnapshot() {
  const j = readJsonIfExists(LEADERBOARD_SNAPSHOT_PATH);
  if (!j || !Array.isArray(j.users)) {
    throw new Error(`Missing or invalid leaderboard snapshot: ${LEADERBOARD_SNAPSHOT_PATH}`);
  }
  return j;
}

function readSrEligibleSnapshot() {
  const j = readJsonIfExists(SR_ELIGIBLE_PATH);
  if (!j || !Array.isArray(j.walletsLower)) {
    throw new Error(`Missing or invalid SR eligible snapshot: ${SR_ELIGIBLE_PATH}`);
  }
  return j;
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
        } else inQ = false;
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

function readCsvWallets() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV not found: ${CSV_PATH}`);
  }
  const lines = fs.readFileSync(CSV_PATH, 'utf8').split(/\r?\n/).filter((l) => l.trim());
  const wallets = new Map();
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const wallet = normalizeWallet(cols[1]);
    if (!wallet) continue;
    const handle = String(cols[0] || '').trim();
    if (!wallets.has(wallet)) wallets.set(wallet, handle);
  }
  return wallets;
}

/** @returns {Map<string, { username: string, srEligible?: boolean }>} */
function collectWallets() {
  const meta = new Map();

  if (SOURCE === 'csv') {
    for (const [wallet, handle] of readCsvWallets()) {
      meta.set(wallet, { username: handle });
    }
    return meta;
  }

  let leaderboard = null;
  try {
    leaderboard = readLeaderboardSnapshot();
  } catch (e) {
    if (SOURCE !== 'eligible-snapshot') throw e;
  }

  const lbByWallet = new Map();
  if (leaderboard) {
    for (const u of leaderboard.users) {
      const w = normalizeWallet(u.wallet);
      if (!w) continue;
      lbByWallet.set(w, {
        username: String(u.username || ''),
        srEligible: Boolean(u.srEligible),
      });
    }
  }

  if (SOURCE === 'leaderboard-all') {
    for (const [w, m] of lbByWallet) meta.set(w, m);
    return meta;
  }

  if (SOURCE === 'leaderboard-eligible') {
    for (const [w, m] of lbByWallet) {
      if (m.srEligible) meta.set(w, m);
    }
    return meta;
  }

  if (SOURCE === 'eligible-snapshot' || SOURCE === 'missing') {
    const snap = readSrEligibleSnapshot();
    for (const w of snap.walletsLower) {
      const wallet = normalizeWallet(w);
      if (!wallet) continue;
      if (SOURCE === 'missing' && lbByWallet.has(wallet)) continue;
      const lb = lbByWallet.get(wallet);
      meta.set(wallet, { username: lb?.username || '', snapshotUpdatedAt: snap.updatedAt });
    }
    return meta;
  }

  throw new Error(
    `Unknown source "${SOURCE}". Use: eligible-snapshot, leaderboard-eligible, leaderboard-all, missing, csv`,
  );
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

function formatHandle(username) {
  const t = String(username || '').trim();
  if (!t) return '';
  return t.startsWith('@') ? t : `@${t}`;
}

function csvCell(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatSr(n) {
  if (!Number.isFinite(n)) return 'ERROR';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

async function main() {
  const rpcUrl = (process.env.BASE_RPC_URL || process.env.VITE_BASE_RPC_URL || '').trim();
  if (!rpcUrl) {
    console.error('Missing BASE_RPC_URL or VITE_BASE_RPC_URL (required for on-chain $SR reads).');
    process.exit(1);
  }

  const walletsMeta = collectWallets();
  if (walletsMeta.size === 0) {
    console.error(`No wallets found for source="${SOURCE}".`);
    process.exit(1);
  }

  const conc = Math.max(
    1,
    Math.min(32, Number(process.env.EPOCH2_SR_QUERY_RPC_CONCURRENCY || '8') || 8),
  );

  const entries = [];
  let rpcFailures = 0;

  const walletList = [...walletsMeta.keys()];
  await runPool(walletList, conc, async (wallet) => {
    const meta = walletsMeta.get(wallet);
    try {
      const raw = await fetchErc20BalanceRaw(rpcUrl, SR_TOKEN_ADDRESS, wallet);
      const balance = rawBalanceToTokenUnits(raw, SR_DECIMALS);
      const eligible = balance > THRESHOLD_EXCLUSIVE;
      entries.push({
        wallet,
        username: meta?.username || '',
        balance,
        eligible,
        gap: balance - THRESHOLD_EXCLUSIVE,
      });
    } catch {
      rpcFailures += 1;
      entries.push({
        wallet,
        username: meta?.username || '',
        balance: NaN,
        eligible: false,
        gap: NaN,
      });
    }
  });

  let rows = entries;
  if (FILTER_ELIGIBLE_ONLY) {
    rows = rows.filter((r) => r.eligible && Number.isFinite(r.balance));
  }
  if (SORT_BY_BALANCE) {
    rows.sort((a, b) => {
      const ba = Number.isFinite(a.balance) ? a.balance : -1;
      const bb = Number.isFinite(b.balance) ? b.balance : -1;
      return bb - ba;
    });
  }

  console.error(
    `# source=${SOURCE} wallets=${walletList.length} threshold_exclusive=${THRESHOLD_EXCLUSIVE} token=${SR_TOKEN_ADDRESS}`,
  );
  if (SOURCE === 'eligible-snapshot' || SOURCE === 'missing') {
    try {
      const snap = readSrEligibleSnapshot();
      if (snap.updatedAt) console.error(`# sr_eligible_snapshot.updatedAt=${snap.updatedAt}`);
    } catch {
      /* ignore */
    }
  }

  console.log('wallet,username,sr_balance,eligible,gap_above_threshold');
  for (const r of rows) {
    console.log(
      [
        csvCell(r.wallet),
        csvCell(formatHandle(r.username)),
        csvCell(formatSr(r.balance)),
        csvCell(r.eligible ? 'true' : 'false'),
        csvCell(Number.isFinite(r.gap) ? formatSr(r.gap) : 'ERROR'),
      ].join(','),
    );
  }

  const ok = rows.filter((r) => Number.isFinite(r.balance));
  const eligibleNow = ok.filter((r) => r.eligible).length;
  console.error(
    `# done: printed=${rows.length} eligible_now=${eligibleNow} rpc_failures=${rpcFailures}`,
  );
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
