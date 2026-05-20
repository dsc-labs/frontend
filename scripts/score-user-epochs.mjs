#!/usr/bin/env node
/**
 * Epoch 1 score (if in export) + Epoch 2 score by GMT+7 checkpoint day for one user.
 *
 * Sources: `mindshare_submissions.csv`, `leaderboard_export.csv`, SR jsonl, metrics cache, daily state.
 *
 * Usage:
 *   npx tsx scripts/score-user-epochs.mjs denispodd_17
 *   npx tsx scripts/score-user-epochs.mjs 0xf517cd0843aefca24046d0ed02d6e04393678ab8
 *   npm run epoch2:score-user -- @denispodd_17 --json
 *
 * Options:
 *   --chain         SR eligibility from archive RPC per day (not epoch2_sr_snapshots.jsonl)
 *   --json          JSON output
 *   --use-state     Score `countedPostKeys` from daily state (skip day replay)
 *
 * Env (--chain): BASE_ARCHIVE_RPC_URL or BASE_RPC_URL
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { readMindshareSubmissionsCsv } from '../lib/mindshareCsvStore.ts'
import {
  loadEpoch1LeaderboardRows,
  loadEpoch1PrizeWinnerWallets,
} from '../lib/mindshareEpoch1Carryover.ts'
import {
  EPOCH1_CARRYOVER_MIN_RANK,
  EPOCH1_PRIZE_WINNER_MAX_RANK,
  EPOCH2_FIRST_SNAPSHOT_SCORE_MULTIPLIER,
} from '../lib/mindshareEpoch2Constants.ts'
import { EPOCH2_CHECKPOINT_DAY_KEYS, loadEpoch2SrEligibilityByDay } from '../lib/mindshareEpoch2Checkpoints.ts'
import {
  bootstrapPostKeySet,
  epoch2PostKey,
  readEpoch2DailyState,
  readEpoch2LeaderboardSnapshot,
} from '../lib/mindshareEpoch2DailyState.ts'
import {
  isGuaranteedTop7Handle,
  normalizeLeaderboardHandle,
} from '../lib/mindshareEpoch2GuaranteedTop7.ts'
import {
  gmt7PostCountWindowForSnapshot,
  gmt7SrEligibilitySnapshotInstantMs,
} from '../lib/mindshareEpoch2Gmt7.ts'
import { defaultEpoch2SrSnapshotLogPath } from '../lib/mindshareEpoch2DataPaths.ts'
import { readEpoch2MetricsCache } from '../lib/mindshareEpoch2MetricsCache.ts'
import {
  flattenMindshareSubmissionPosts,
  postsForCountedKeys,
  shouldScorePostForEpoch2DailySnapshot,
} from '../lib/mindshareEpoch2Posts.ts'
import { fetchSrBalanceAtEligibilityDay } from '../lib/mindshareEpoch2SrBalanceAtDay.ts'
import { epoch2FinalScoreForPost } from '../lib/mindshareEpoch2Score.ts'
import { getServerArchiveRpcUrl } from '../lib/serverBaseRpc.ts'
import { normalizeXUsername } from '../lib/xTweetMetrics.ts'

function ensureDataPaths() {
  if (process.env.MINDSHARE_EPOCH2_SR_SNAPSHOT_LOG_PATH?.trim()) return
  const primary = defaultEpoch2SrSnapshotLogPath()
  if (existsSync(primary)) return
  const legacy = resolve(process.cwd(), 'data/mindshare/epoch2_sr_snapshots.jsonl')
  if (existsSync(legacy)) {
    process.env.MINDSHARE_EPOCH2_SR_SNAPSHOT_LOG_PATH = legacy
  }
}

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

function defaultQualityScore() {
  const raw = Number(process.env.MINDSHARE_EPOCH2_DEFAULT_QUALITY ?? '4')
  if (!Number.isFinite(raw)) return 4
  return Math.max(0, Math.min(7, raw))
}

function formatGmt7Instant(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '(before epoch / no submitted at)'
  const d = new Date(ms + 7 * 60 * 60 * 1000)
  return `${d.toISOString().slice(0, 19).replace('T', ' ')} GMT+7`
}

function formatPostWindow(postWindow, isBootstrap) {
  if (isBootstrap) {
    return `submitted before ${formatGmt7Instant(postWindow.endMs)} (bootstrap)`
  }
  return `${formatGmt7Instant(postWindow.startMs)} → ${formatGmt7Instant(postWindow.endMs)}`
}

function scorePost(post, cache, defaultQ, multiplier) {
  const h = normalizeXUsername(post.xHandle)
  const followers = h ? (cache.users[h]?.followersCount ?? 0) : 0
  const snap = cache.tweets[post.tweetId]?.snapshot
  const base = epoch2FinalScoreForPost(
    {
      qualityScore: defaultQ,
      views: snap?.impressionCount ?? 0,
      comments: snap?.replyCount ?? 0,
      retweets: (snap?.retweetCount ?? 0) + (snap?.quoteCount ?? 0),
    },
    followers,
  )
  return {
    tweetId: post.tweetId,
    baseScore: base,
    score: Math.round(base * multiplier * 100) / 100,
    multiplier,
    hasMetrics: Boolean(snap),
    submittedAt: post.submittedAtMs ? new Date(post.submittedAtMs).toISOString() : null,
  }
}

async function resolveUser(input) {
  const t = input.trim()
  let wallet = ''
  let handle = ''

  if (t.toLowerCase().startsWith('0x') && t.length === 42) {
    wallet = t.toLowerCase()
  } else {
    handle = normalizeXUsername(t)
  }

  const rows = await readMindshareSubmissionsCsv()
  if (!wallet && handle) {
    const row = rows.find((r) => normalizeXUsername(r.xHandle) === handle)
    if (row) wallet = row.walletAddress.trim().toLowerCase()
  }
  if (wallet && !handle) {
    const row = rows.find((r) => r.walletAddress.trim().toLowerCase() === wallet)
    if (row) handle = normalizeXUsername(row.xHandle)
  }

  const csvPosts = wallet ? flattenMindshareSubmissionPosts(rows).filter((p) => p.walletLower === wallet) : []

  return {
    wallet,
    handle,
    csvRowCount: rows.filter((r) => r.walletAddress.trim().toLowerCase() === wallet).length,
    uniqueTweetsInCsv: [...new Set(csvPosts.map((p) => p.tweetId))].length,
    displayName: csvPosts[0]?.name || handle || wallet,
  }
}

function findEpoch1Row(epoch1Rows, wallet, handle) {
  const h = handle ? normalizeLeaderboardHandle(handle) : ''
  return epoch1Rows.find(
    (r) =>
      r.walletLower === wallet ||
      (h && normalizeLeaderboardHandle(r.username) === h),
  )
}

/** Archive RPC: $SR at each checkpoint midnight (17:00 UTC boundary). */
async function buildChainEligibilityByDay(walletLower, dayKeys, rpcUrl, guaranteed) {
  const eligibilityByDay = new Map()
  const chainByDay = new Map()

  for (const eligibilityDayKey of dayKeys) {
    if (guaranteed) {
      eligibilityByDay.set(eligibilityDayKey, new Set([walletLower]))
      chainByDay.set(eligibilityDayKey, {
        source: 'guaranteed-top-7',
        srBalance: null,
        eligible: true,
      })
      continue
    }
    try {
      const chain = await fetchSrBalanceAtEligibilityDay({
        walletLower,
        eligibilityDayKey,
        rpcUrl,
      })
      eligibilityByDay.set(
        eligibilityDayKey,
        chain.eligibleExclusive ? new Set([walletLower]) : new Set(),
      )
      chainByDay.set(eligibilityDayKey, {
        source: 'archive-rpc',
        srBalance: chain.srBalance,
        eligible: chain.eligibleExclusive,
        thresholdExclusive: chain.thresholdExclusive,
        blockNumber: chain.blockNumber,
        targetUtc: new Date(chain.targetTimestampSec * 1000).toISOString(),
      })
    } catch (e) {
      eligibilityByDay.set(eligibilityDayKey, new Set())
      chainByDay.set(eligibilityDayKey, {
        source: 'archive-rpc',
        error: e instanceof Error ? e.message : String(e),
        eligible: false,
      })
    }
  }

  return { eligibilityByDay, chainByDay }
}

/**
 * Replay counting 15→18 & 20; return which of this wallet's posts were first counted each day.
 * @param {{ useChain?: boolean, chainByDay?: Map<string, object> }} options
 */
function replayWalletByDay(walletLower, allPosts, eligibilityByDay, dayKeys, options = {}) {
  const counted = new Set()
  const days = []
  let isBootstrap = true
  const useChain = options.useChain === true

  for (const eligibilityDayKey of dayKeys) {
    const eligibleWallets = useChain
      ? (eligibilityByDay.get(eligibilityDayKey) ?? new Set())
      : eligibilityByDay.get(eligibilityDayKey)

    if (!useChain && (!eligibleWallets || eligibleWallets.size === 0)) {
      days.push({
        eligibilityDayKey,
        skipped: true,
        skipReason: 'no-sr-snapshot-for-day',
      })
      continue
    }

    const snapshotMs = gmt7SrEligibilitySnapshotInstantMs(eligibilityDayKey)
    const postWindow = gmt7PostCountWindowForSnapshot(snapshotMs, isBootstrap)
    const srEligible = eligibleWallets.has(walletLower)
    const chainMeta = options.chainByDay?.get(eligibilityDayKey)
    const postsAdded = []

    for (const p of allPosts) {
      if (p.walletLower !== walletLower) continue
      if (
        shouldScorePostForEpoch2DailySnapshot(p, {
          eligibleWallets,
          countedKeys: counted,
          countedPostKeys: [...counted],
          postWindow,
          isBootstrap,
        })
      ) {
        const key = epoch2PostKey(p.walletLower, p.tweetId)
        if (!counted.has(key)) {
          counted.add(key)
          postsAdded.push(p)
        }
      }
    }

    days.push({
      eligibilityDayKey,
      skipped: false,
      isBootstrap,
      srEligible,
      chainMeta,
      postWindow,
      postWindowLabel: formatPostWindow(postWindow, isBootstrap),
      postsAdded,
    })
    isBootstrap = false
  }

  return { days, countedKeys: [...counted] }
}

function scoreEpoch2Days(days, cache, defaultQ, bootstrapKeys, { useBootstrapKeysFromState = false } = {}) {
  let total = 0
  let totalPosts = 0
  const byDay = []

  for (const day of days) {
    if (day.skipped) {
      byDay.push({
        eligibilityDayKey: day.eligibilityDayKey,
        skipped: true,
        skipReason: day.skipReason,
        srEligible: false,
        points: 0,
        posts: [],
      })
      continue
    }

    const posts = []
    let dayPoints = 0
    for (const p of day.postsAdded) {
      const key = epoch2PostKey(p.walletLower, p.tweetId)
      const mult =
        day.isBootstrap &&
        (useBootstrapKeysFromState ? bootstrapKeys.has(key) : true)
          ? EPOCH2_FIRST_SNAPSHOT_SCORE_MULTIPLIER
          : 1
      const scored = scorePost(p, cache, defaultQ, mult)
      dayPoints += scored.score
      posts.push(scored)
    }
    dayPoints = Math.round(dayPoints * 100) / 100
    total += dayPoints
    totalPosts += posts.length

    byDay.push({
      eligibilityDayKey: day.eligibilityDayKey,
      skipped: false,
      isBootstrap: day.isBootstrap,
      srEligible: day.srEligible,
      chain: day.chainMeta ?? undefined,
      postWindowLabel: day.postWindowLabel,
      points: dayPoints,
      posts,
    })
  }

  return {
    byDay,
    totalPoints: Math.round(total * 100) / 100,
    totalPosts,
  }
}

function scoreFromDailyState(walletLower, rows, allPosts, dailyState, cache, defaultQ) {
  const keys = dailyState.countedPostKeys.filter((k) => k.startsWith(`${walletLower}:`))
  const bootstrapKeys = bootstrapPostKeySet(dailyState.bootstrapPostKeys)
  const posts = postsForCountedKeys(allPosts, keys, rows)
  const scoredPosts = []
  let total = 0
  for (const p of posts) {
    const key = epoch2PostKey(p.walletLower, p.tweetId)
    const mult = bootstrapKeys.has(key) ? EPOCH2_FIRST_SNAPSHOT_SCORE_MULTIPLIER : 1
    const s = scorePost(p, cache, defaultQ, mult)
    total += s.score
    scoredPosts.push(s)
  }
  return {
    mode: 'daily-state',
    countedKeys: keys.length,
    totalPoints: Math.round(total * 100) / 100,
    totalPosts: scoredPosts.length,
    posts: scoredPosts,
  }
}

async function main() {
  loadEnv()
  ensureDataPaths()
  const argv = process.argv.slice(2).filter((a) => a !== '--json' && a !== '--use-state' && a !== '--chain')
  const jsonOut = process.argv.includes('--json')
  const useState = process.argv.includes('--use-state')
  const useChain = process.argv.includes('--chain')
  const arg = argv[0]

  if (!arg) {
    console.error(
      'Usage: npx tsx scripts/score-user-epochs.mjs <@handle|0x wallet> [--chain] [--json] [--use-state]',
    )
    process.exit(1)
  }

  if (useChain) {
    const rpcUrl = getServerArchiveRpcUrl()
    if (!rpcUrl) {
      console.error('Missing BASE_ARCHIVE_RPC_URL or BASE_RPC_URL (required for --chain)')
      process.exit(1)
    }
  }

  const user = await resolveUser(arg)
  if (!user.wallet) {
    console.error(`No wallet found for "${arg}" in mindshare_submissions.csv`)
    process.exit(1)
  }

  const defaultQ = defaultQualityScore()
  const epoch1Rows = await loadEpoch1LeaderboardRows()
  const epoch1 = findEpoch1Row(epoch1Rows, user.wallet, user.handle)
  const prizeWinners = await loadEpoch1PrizeWinnerWallets()
  const guaranteed = user.handle ? isGuaranteedTop7Handle(user.handle) : false

  const rows = await readMindshareSubmissionsCsv()
  const allPosts = flattenMindshareSubmissionPosts(rows)
  const cache = await readEpoch2MetricsCache()
  const dailyState = await readEpoch2DailyState()
  const lb = await readEpoch2LeaderboardSnapshot()
  const snapshotEligibilityByDay = await loadEpoch2SrEligibilityByDay()
  const bootstrapKeys = bootstrapPostKeySet(dailyState.bootstrapPostKeys)
  const dayKeys = [...EPOCH2_CHECKPOINT_DAY_KEYS]

  let chainByDay = new Map()
  let replayEligibilityByDay = snapshotEligibilityByDay
  if (useChain) {
    const rpcUrl = getServerArchiveRpcUrl()
    const built = await buildChainEligibilityByDay(user.wallet, dayKeys, rpcUrl, guaranteed)
    replayEligibilityByDay = built.eligibilityByDay
    chainByDay = built.chainByDay
  }

  let epoch2Scoring
  if (useState) {
    epoch2Scoring = scoreFromDailyState(user.wallet, rows, allPosts, dailyState, cache, defaultQ)
  } else {
    const replay = replayWalletByDay(user.wallet, allPosts, replayEligibilityByDay, dayKeys, {
      useChain,
      chainByDay,
    })
    const scored = scoreEpoch2Days(replay.days, cache, defaultQ, bootstrapKeys, {
      useBootstrapKeysFromState: false,
    })
    epoch2Scoring = {
      mode: useChain ? 'replay-chain' : 'replay-snapshot',
      srSource: useChain ? 'archive-rpc' : 'epoch2_sr_snapshots.jsonl',
      ...scored,
      countedKeys: replay.countedKeys.length,
      notCountedTweetIds: [...new Set(allPosts.filter((p) => p.walletLower === user.wallet).map((p) => p.tweetId))].filter(
        (id) => !replay.countedKeys.some((k) => k.endsWith(`:${id}`)),
      ),
    }
  }

  const lbUser = lb?.users.find((u) => u.wallet.toLowerCase() === user.wallet)

  const epoch1Block = epoch1
    ? {
        rank: epoch1.rank,
        username: epoch1.username,
        name: epoch1.name,
        score: epoch1.score,
        postCount: epoch1.postCount,
        prizeWinner: epoch1.rank >= 1 && epoch1.rank <= EPOCH1_PRIZE_WINNER_MAX_RANK,
        carryoverApplies: epoch1.rank >= EPOCH1_CARRYOVER_MIN_RANK,
        carryoverPoints: epoch1.rank >= EPOCH1_CARRYOVER_MIN_RANK ? epoch1.score : 0,
        note:
          epoch1.rank >= 1 && epoch1.rank <= EPOCH1_PRIZE_WINNER_MAX_RANK
            ? `Rank ${epoch1.rank} (1–${EPOCH1_PRIZE_WINNER_MAX_RANK}): Epoch 1 score is not merged into Epoch 2.`
            : epoch1.rank >= EPOCH1_CARRYOVER_MIN_RANK
              ? `Rank ${epoch1.rank}: +${epoch1.score} carryover merged once into Epoch 2 total (if not yet applied).`
              : null,
      }
    : {
        found: false,
        note: 'Not in leaderboard_export.csv',
      }

  const report = {
    query: {
      input: arg,
      wallet: user.wallet,
      handle: user.handle ? `@${user.handle}` : null,
      displayName: user.displayName,
    },
    csv: {
      submissionRows: user.csvRowCount,
      uniqueTweetIds: user.uniqueTweetsInCsv,
    },
    epoch1: epoch1Block,
    epoch2: {
      scoringMode: epoch2Scoring.mode,
      defaultQuality: defaultQ,
      guaranteedTop7: guaranteed,
      computedFromPosts: {
        points: epoch2Scoring.totalPoints,
        postCount: epoch2Scoring.totalPosts,
      },
      byDay: epoch2Scoring.byDay ?? undefined,
      fromDailyState: epoch2Scoring.mode === 'daily-state' ? epoch2Scoring : undefined,
      replayExtras:
        epoch2Scoring.mode === 'replay'
          ? {
              countedKeys: epoch2Scoring.countedKeys,
              notCountedTweetIds: epoch2Scoring.notCountedTweetIds,
            }
          : undefined,
    },
    leaderboardSnapshot: lbUser
      ? {
          score: lbUser.score,
          postCount: lbUser.postCount,
          srEligible: lbUser.srEligible,
          generatedAt: lb?.generatedAt,
        }
      : null,
    checkpointsSnapshot: Object.fromEntries(
      [...snapshotEligibilityByDay.entries()].map(([day, set]) => [day, set.has(user.wallet)]),
    ),
    checkpointsChain: useChain
      ? Object.fromEntries(
          [...chainByDay.entries()].map(([day, m]) => [
            day,
            m.error ? { error: m.error } : { eligible: m.eligible, srBalance: m.srBalance, blockNumber: m.blockNumber },
          ]),
        )
      : undefined,
    dataPaths: {
      srSnapshotsJsonl:
        process.env.MINDSHARE_EPOCH2_SR_SNAPSHOT_LOG_PATH?.trim() || defaultEpoch2SrSnapshotLogPath(),
    },
  }

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  console.log('')
  console.log(`User: ${report.query.displayName} (${report.query.handle ?? 'no handle'})`)
  console.log(`Wallet: ${report.query.wallet}`)
  console.log(`CSV: ${report.csv.submissionRows} rows, ${report.csv.uniqueTweetIds} unique tweets`)
  console.log('')

  console.log('── Epoch 1 (leaderboard_export.csv) ──')
  if (epoch1) {
    console.log(`  Rank: ${epoch1.rank}  Score: ${epoch1.score}  Posts: ${epoch1.postCount}`)
    if (epoch1Block.note) console.log(`  ${epoch1Block.note}`)
    if (guaranteed) console.log('  (Guaranteed top 7 — separate Epoch 1 baseline may apply on leaderboard.)')
  } else {
    console.log('  Not found in Epoch 1 export.')
  }
  console.log('')

  console.log(`── Epoch 2 by day (${epoch2Scoring.mode}) ──`)
  console.log(
    `  SR source: ${useChain ? 'archive RPC (per-day balance at 17:00 UTC boundary)' : report.dataPaths.srSnapshotsJsonl}`,
  )
  console.log(`  Default quality: ${defaultQ}  Bootstrap ×${EPOCH2_FIRST_SNAPSHOT_SCORE_MULTIPLIER} on first snapshot posts`)
  if (useChain) {
    console.log('  SR checkpoints (archive RPC, >10,000 $SR):')
    for (const [day, info] of Object.entries(report.checkpointsChain ?? {})) {
      if (info.error) {
        console.log(`    ${day}: error — ${info.error}`)
      } else {
        const bal = info.srBalance != null ? info.srBalance.toLocaleString('en-US') : '—'
        console.log(`    ${day}: ${info.eligible ? 'eligible' : 'not eligible'}  (${bal} SR, block ${info.blockNumber ?? '—'})`)
      }
    }
  } else {
    console.log('  SR checkpoints (jsonl snapshot):')
    for (const [day, ok] of Object.entries(report.checkpointsSnapshot)) {
      console.log(`    ${day}: ${ok ? 'eligible' : 'not eligible'}`)
    }
    console.log('  Tip: add --chain to use archive RPC instead of jsonl.')
  }
  console.log('')

  if (epoch2Scoring.byDay) {
    for (const day of epoch2Scoring.byDay) {
      if (day.skipped) {
        console.log(`  ${day.eligibilityDayKey}: skipped (${day.skipReason})`)
        continue
      }
      const chainLine =
        day.chain?.srBalance != null
          ? `  chain SR ${day.chain.srBalance.toLocaleString('en-US')}`
          : day.chain?.error
            ? `  chain error: ${day.chain.error}`
            : ''
      console.log(
        `  ${day.eligibilityDayKey}${day.isBootstrap ? ' [bootstrap]' : ''}: SR ${day.srEligible ? 'yes' : 'no'}${chainLine}  +${day.points} pts (${day.posts.length} posts)`,
      )
      console.log(`    window: ${day.postWindowLabel}`)
      for (const p of day.posts) {
        const m = p.multiplier > 1 ? ` ×${p.multiplier}` : ''
        const met = p.hasMetrics ? '' : ' (no X cache — scored as 0 engagement)'
        console.log(`    • ${p.tweetId}  +${p.score}${m}${met}`)
      }
    }
  } else if (epoch2Scoring.posts) {
    console.log(`  ${epoch2Scoring.countedKeys} counted keys → ${epoch2Scoring.totalPosts} posts, ${epoch2Scoring.totalPoints} pts`)
    for (const p of epoch2Scoring.posts) {
      const m = p.multiplier > 1 ? ` ×${p.multiplier}` : ''
      console.log(`    • ${p.tweetId}  +${p.score}${m}`)
    }
  }

  console.log('')
  console.log(`  Epoch 2 computed total: ${epoch2Scoring.totalPoints} (${epoch2Scoring.totalPosts} posts)`)
  if (epoch1Block.carryoverApplies) {
    console.log(`  + Epoch 1 carryover (if merged on server): ${epoch1Block.carryoverPoints}`)
  }
  if (lbUser) {
    console.log(`  Leaderboard snapshot: ${lbUser.score} (${lbUser.postCount} posts, eligible=${lbUser.srEligible})`)
  } else {
    console.log('  Leaderboard snapshot: not listed')
  }
  console.log('')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
