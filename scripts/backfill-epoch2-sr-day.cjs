#!/usr/bin/env node
/**
 * Export or append a historical SR eligibility snapshot for one eligibility day
 * (for checkpoint backfill when server logs are missing a day).
 *
 * Picks the best matching line from epoch2_sr_snapshots.jsonl:
 * - Prefer explicit eligibilityDayKey === --day
 * - Else legacy: first line whose eligibility day of `at` matches --day
 *
 * Usage:
 *   node scripts/backfill-epoch2-sr-day.cjs --day 2026-05-15
 *   node scripts/backfill-epoch2-sr-day.cjs --day 2026-05-15 --write
 *   node scripts/backfill-epoch2-sr-day.cjs --day 2026-05-15 --out data/mindshare/backups/epoch2_sr_day_2026-05-15.jsonl
 *
 * Env: MINDSHARE_EPOCH2_SR_SNAPSHOT_LOG_PATH (optional)
 */

const fs = require('fs');
const path = require('path');

const GMT7_OFFSET_MS = 7 * 60 * 60 * 1000;
const DEFAULT_LOG = path.resolve(process.cwd(), 'data/mindshare/epoch2_sr_snapshots.jsonl');

function gmt7DayKeyFromMs(ms) {
  return new Date(ms + GMT7_OFFSET_MS).toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const out = { day: '', write: false, outPath: '' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--write') out.write = true;
    else if (a === '--day' && argv[i + 1]) out.day = argv[++i];
    else if ((a === '--out' || a === '-o') && argv[i + 1]) out.outPath = argv[++i];
    else if (/^\d{4}-\d{2}-\d{2}$/.test(a)) out.day = a;
  }
  if (!out.day) {
    console.error('Usage: node scripts/backfill-epoch2-sr-day.cjs --day YYYY-MM-DD [--write] [--out file]');
    process.exit(1);
  }
  return out;
}

function logPath() {
  const custom = process.env.MINDSHARE_EPOCH2_SR_SNAPSHOT_LOG_PATH?.trim();
  return custom ? path.resolve(custom) : DEFAULT_LOG;
}

function readLines(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim());
}

function pickLineForDay(lines, day) {
  const parsed = [];
  for (const line of lines) {
    try {
      parsed.push(JSON.parse(line));
    } catch {
      /* skip */
    }
  }
  parsed.sort((a, b) => Date.parse(a.at || 0) - Date.parse(b.at || 0));

  const withKey = parsed.filter((p) => p.eligibilityDayKey === day);
  if (withKey.length > 0) return withKey[withKey.length - 1];

  const byRunDay = parsed.filter((p) => {
    const t = Date.parse(p.at || '');
    return Number.isFinite(t) && gmt7DayKeyFromMs(t) === day;
  });
  if (byRunDay.length > 0) return byRunDay[0];

  return null;
}

function normalizeLine(raw, day) {
  return {
    at: raw.at || new Date(`${day}T05:00:00.000Z`).toISOString(),
    eligibilityDayKey: day,
    cronTimezoneNote: 'Daily snapshot at 17:00 UTC',
    thresholdExclusive: raw.thresholdExclusive ?? 10_000,
    totalMindshareWallets: raw.totalMindshareWallets ?? (raw.eligibleWalletsLower?.length || 0),
    eligibleCount: raw.eligibleCount ?? (raw.eligibleWalletsLower?.length || 0),
    eligibleWalletsLower: [...(raw.eligibleWalletsLower || [])].map((w) => w.toLowerCase()).sort(),
    rpcFailures: raw.rpcFailures ?? 0,
    backfillNote: `Restored checkpoint for ${day} from local snapshot history`,
  };
}

function main() {
  const args = parseArgs(process.argv);
  const file = logPath();
  const lines = readLines(file);
  const picked = pickLineForDay(lines, args.day);

  if (!picked) {
    console.error(`[backfill] No SR snapshot found for day ${args.day} in ${file}`);
    process.exit(1);
  }

  const normalized = normalizeLine(picked, args.day);
  const outLine = `${JSON.stringify(normalized)}\n`;

  console.error(`[backfill] Source at: ${picked.at}`);
  console.error(`[backfill] Eligible wallets: ${normalized.eligibleCount}`);

  if (args.outPath) {
    const dest = path.resolve(args.outPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, outLine, 'utf8');
    console.error(`[backfill] Wrote ${dest}`);
  } else {
    process.stdout.write(outLine);
  }

  if (args.write) {
    const existing = readLines(file);
    const hasDay = existing.some((l) => {
      try {
        const j = JSON.parse(l);
        return j.eligibilityDayKey === args.day;
      } catch {
        return false;
      }
    });
    if (hasDay) {
      console.error(`[backfill] ${file} already has eligibilityDayKey=${args.day}; not appending`);
    } else {
      fs.appendFileSync(file, outLine, 'utf8');
      console.error(`[backfill] Appended to ${file}`);
    }
  }
}

main();
