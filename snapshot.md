# Epoch 2 — What We Snapshot

This document describes **what data is frozen or refreshed on a schedule** for the Mindshare Epoch 2 leaderboard (`/epoch2`). It complements [`score.md`](./score.md) (how scores are calculated) and the ops crons in `vercel.json`.

---

## Overview

| What | When | Stored in | Used for |
| ---- | ---- | --------- | -------- |
| **Daily job (SR + scores)** | Once per day at **00:00 GMT+7** (`0 17 * * *` UTC) | See [Files written](#files-written) | Eligibility, cumulative scores, public leaderboard |
| **Submissions** | On each form submit | `mindshare_submissions.csv` (+ `submitted at`) | Which posts exist and **when** they were submitted |
| **Operator backfill** | Manual | Same files | Replay SR days and/or full post counting 15→18 & 20 |

Public `/epoch2` reads **`epoch2_leaderboard_snapshot.json`**. It does **not** re-score on every page load. The response **excludes** anyone with **score ≤ 0** (they do not appear on the board).

**Cron endpoint:** `GET` / `POST` `/api/mindshare/epoch2-sr-snapshot`  
**Orchestrator:** `lib/mindshareEpoch2DailySnapshot.ts`

---

## Two separate mechanisms

| Mechanism | Question it answers | Source of truth |
| --------- | ------------------- | ----------------- |
| **SR eligibility** | Did this wallet hold **> 10,000** $SR at **midnight GMT+7** for day *D*? | On-chain balance at **archive block** → `epoch2_sr_snapshots.jsonl` (per day) + `epoch2_sr_eligible_wallets.json` (latest night, for gating) |
| **Post counting + scoring** | Which tweets count toward score, and how many points? | CSV + `submitted at` + GMT+7 **post windows** + per-day SR list → `epoch2_daily_state.json` `countedPostKeys` → `epoch2_leaderboard_snapshot.json` |

SR eligibility does **not** depend on how many tweets someone submitted. One tweet with >10k $SR can be SR-eligible; many tweets with 0 $SR on-chain at the checkpoint do not score.

The CSV **`sr balance`** column is informational for the form only; gating uses **on-chain** snapshots (not that column).

---

## Where posts are counted and scored (code)

```text
runMindshareEpoch2DailySnapshot          lib/mindshareEpoch2DailySnapshot.ts
  ├─ runMindshareEpoch2SrEligibilitySnapshot   (SR only)
  ├─ flattenMindshareSubmissionPosts           lib/mindshareEpoch2Posts.ts
  ├─ shouldScorePostForEpoch2DailySnapshot     (gate: SR + window + not counted)
  └─ buildMindshareEpoch2LeaderboardPayload    lib/mindshareEpoch2LeaderboardBuild.ts
       └─ scoreDailyPostsFromCache → epoch2FinalScoreForPost   lib/mindshareEpoch2Score.ts
```

**Counted** = wallet added to `countedPostKeys` as `walletLower:tweetId`.  
**Scored** = metrics from `epoch2_metrics_cache.json` × quality × follower multiplier (see `score.md`).

---

## Daily midnight job (GMT+7)

At **00:00 GMT+7** each day (17:00 UTC, no DST), one run does:

1. **SR eligibility** — archive RPC balance at the block for midnight GMT+7 → `epoch2_sr_eligible_wallets.json` + append/replace line in `epoch2_sr_snapshots.jsonl`
2. **X metrics** — tweet engagement + follower counts for posts being scored → `epoch2_metrics_cache.json`
3. **Cumulative scores** — add points for **new** posts in tonight’s window → `epoch2_leaderboard_snapshot.json` + `epoch2_daily_state.json`

Operator alias (same logic): `/api/mindshare/epoch2-refresh`  
Manual rebuild: `GET /api/mindshare/test-epoch2-leaderboard?refresh=1` (auth where required)

---

## Operator API endpoints

All operator routes use the same auth as waitlist crons: `Authorization: Bearer $CRON_SECRET`, or `WAITLIST_CRON_SECRET`, or `x-cron-secret`. Local only: `MINDSHARE_EPOCH2_CRON_SKIP_AUTH=1`.

| Endpoint | Method | What it does |
| -------- | ------ | ------------- |
| `/api/mindshare/epoch2-sr-snapshot` | GET, POST | **Production cron:** tonight’s SR + one post window + score |
| `/api/mindshare/epoch2-refresh` | GET, POST | Same as `epoch2-sr-snapshot` |
| `/api/mindshare/epoch2-sr-backfill-day` | GET, POST | One historical SR day → jsonl (`?day=YYYY-MM-DD`, optional `&replace=1`) |
| `/api/mindshare/epoch2-posts-backfill` | GET, POST | Replay post counting **15→19** + score all (`?replace=1`, optional `&days=…`, `&runSr=1`) |
| `/api/mindshare/epoch2-rebuild` | GET, POST | **Full rebuild** in `data/newmindshare`: SR all days + posts + score (`?latestSr=1`, optional `&dataDir=`) |
| `/api/mindshare/epoch2-recount` | GET, POST | Re-score existing `countedPostKeys` only; no new posts, no SR |
| `/api/mindshare/test-epoch2-leaderboard` | GET | Dev/test read or `?refresh=1` rebuild |

**Code paths:** `lib/mindshareEpoch2SrSnapshot.ts`, `lib/mindshareEpoch2SrHistoricalBackfill.ts`, `lib/mindshareEpoch2PostsBackfill.ts`, `lib/mindshareEpoch2LeaderboardRecount.ts`

### Full post replay (first → last checkpoint day)

Replays **which posts enter `countedPostKeys`** for each GMT+7 eligibility day (**2026-05-15 … 2026-05-18** and **2026-05-20** — no separate 19 May tick) using **`epoch2_sr_snapshots.jsonl`** per day, then scores all of them.

```bash
# Prerequisite: SR jsonl line per day (archive RPC)
for d in 2026-05-15 2026-05-16 2026-05-17 2026-05-18; do
  curl -sS -X POST "http://127.0.0.1:4022/api/mindshare/epoch2-sr-backfill-day?day=$d&replace=1" \
    -H "Authorization: Bearer $CRON_SECRET"
done

curl -sS -X POST "http://127.0.0.1:4022/api/mindshare/epoch2-posts-backfill?replace=1" \
  -H "Authorization: Bearer $CRON_SECRET"
```

| Query | Meaning |
| ----- | ------- |
| `replace=1` | Rebuild `countedPostKeys` from scratch (recommended) |
| `days=2026-05-15,2026-05-16` | Subset of checkpoint days (default 15–18 + 20 May) |
| `runSr=1` | Also run tonight’s SR snapshot before replay |

Without `replace=1`, only **missing** keys that would have counted on replay are added (existing keys kept).

### npm scripts

| Command | Maps to |
| ------- | ------- |
| `npm run epoch2:rebuild` | `epoch2-rebuild` (SR days + posts + score in `data/newmindshare`) |
| `npm run epoch2:posts-backfill -- --replace` | `epoch2-posts-backfill?replace=1` |
| `npm run epoch2:posts-backfill -- --replace --days 2026-05-15,2026-05-16` | subset days |
| `npm run epoch2:sr-backfill-day -- --day 2026-05-16 --replace` | `epoch2-sr-backfill-day` |
| `npm run epoch2:recount` | `epoch2-recount` |
| `npm run epoch2:check-sr -- <handle>` | Per-wallet SR checkpoints |
| `npm run epoch2:check-sr -- --wallet 0x… --chain` | + on-chain balance per day |
| `npm run epoch2:trace-wallet -- <handle\|0x…>` | CSV + jsonl + leaderboard trace |
| `npx tsx scripts/check-wallet-posts.mjs <0x…>` | `postCount` / `postsToScore` debug |

Override API URL via `EPOCH2_POSTS_BACKFILL_API_URL`, `EPOCH2_RECOUNT_API_URL`, etc. (see `.env.example`).

---

## Which posts count (day windows)

Submissions store **`submitted at`** (ISO-8601) on new CSV rows. Legacy rows without a timestamp only participate in the **bootstrap** run.

### Bootstrap (first midnight run only)

- **Window:** all posts with `submittedAt` **before** that midnight (legacy rows count as “before bootstrap”).
- **Rule:** if the wallet is **SR-eligible** at that snapshot, those posts enter the cumulative leaderboard.
- **Score:** posts counted on this run are stored in `bootstrapPostKeys` and earn **×5** on cumulative score (`EPOCH2_FIRST_SNAPSHOT_SCORE_MULTIPLIER` in `lib/mindshareEpoch2Constants.ts`). Later nights are ×1.

### Every later midnight

- **Eligibility day *D*:** you are eligible at the snapshot that ends GMT+7 calendar day *D*.
- **Post window:** submissions with `submittedAt` in **[start of day *D−1*, start of day *D*)** in GMT+7.  
  Example: eligible on **day 15** → posts submitted during **day 14 → day 15** (the 24h window ending at day 15 midnight).
- **Rule:** only **new** posts in that window (not already counted) are scored, and only if the wallet is eligible **that** night.
- **Cumulative:** total score and post count on `/epoch2` are the sum of all posts counted on prior eligible days.

Posts submitted while ineligible, or outside the window for that eligibility day, are **not** scored that night. They may count on a later day if the wallet becomes eligible and the post falls in that day’s window (except legacy posts without `submitted at`, which score once when SR-eligible after bootstrap).

### Checkpoint days (UI)

Shown on `/epoch2` as five booleans (15–19 May GMT+7), from **last** SR jsonl line per `eligibilityDayKey` in `epoch2_sr_snapshots.jsonl`. Guaranteed top 7 are always shown as eligible.

**Eligible Participants** stat (top card): count of everyone on the leaderboard with **≥1 checkpoint tick** (at least one `true` in `checkpoints[]`). This is not the same as “eligible on the latest night only” (`srEligible` from `epoch2_sr_eligible_wallets.json`).

---

## Files written

| File | Purpose |
| ---- | ------- |
| `data/newmindshare/epoch2_sr_eligible_wallets.json` | Latest eligible wallets for **post gating** |
| `data/newmindshare/epoch2_sr_snapshots.jsonl` | Audit + **per-day** SR lists |
| `data/newmindshare/epoch2_metrics_cache.json` | X API cache |
| `data/newmindshare/epoch2_leaderboard_snapshot.json` | Public leaderboard |
| `data/newmindshare/epoch2_daily_state.json` | `countedPostKeys`, bootstrap flags |
| `data/newmindshare/epoch2_daily_snapshots.jsonl` | Audit log per daily run |

**Production layout:** live `mindshare_submissions.csv` (repo root) + built snapshots in **`data/newmindshare/`** (hardcoded in `lib/mindshareEpoch2DataPaths.ts`, gitignored). Details: [`data/newmindshare/README.md`](./data/newmindshare/README.md).

**Required for SR:** `BASE_ARCHIVE_RPC_URL` (or fallback `BASE_RPC_URL` if archive-capable).

---

## “The Latest Snapshot” on `/epoch2`

The leaderboard page labels the snapshot **12:00 AM, May 20, 2026** (hardcoded). The API payload still includes **`generatedAt`** from `epoch2_leaderboard_snapshot.json` — the last **daily** rebuild, not live X data.

---

## score.md §4 (submit-time lock)

`score.md` §4 targets metrics locked **at submit**. Today we lock metrics **at the daily snapshot** when a post enters `countedPostKeys` (first time it is scored). Engagement after that night does not change its contribution.

---

## Cron summary (`vercel.json`)

| Schedule | Path | Purpose |
| -------- | ---- | ------- |
| `*/15 * * * *` | `/api/waitlist/snapshot` | Waitlist (unrelated to Epoch 2) |
| `0 17 * * *` | `/api/mindshare/epoch2-sr-snapshot` | Daily SR + X + cumulative scores |

Local dev: daily SR/score cron optional (`MINDSHARE_EPOCH2_SR_SNAPSHOT_DEV_CRON=1`). Fifteen-minute epoch2 refresh is **off** unless `MINDSHARE_EPOCH2_REFRESH_DEV_CRON=1`.

---

## Guaranteed top 7 (fixed ranks 1–7)

These X handles are **always** on the leaderboard at **ranks 1–7** in this order, **always SR-eligible**, regardless of $SR balance:

1. Goon_crypto  
2. 3DMax_Virtuals  
3. 0xzagen  
4. 0xweekend59  
5. 100xDarren  
6. bizbrainzuni  
7. office2crypto  

Scores for ranks 1–7 use a **fixed ladder**: each step is **+46.95** above the next rank (rank 7 = first organic eligible score + 46.95, then +46.95 through rank 1). Applied on snapshot build and on every `/epoch2` page load. Epoch 1 prize exclusion (ranks 1–101) does **not** apply to these seven wallets.

### Rank order after the top 7

1. **Ranks 1–7** — guaranteed list above (fixed order).  
2. **Rank 8+** — **SR-eligible** competitors: **≥1 checkpoint tick** first (then by score), then eligible with **zero ticks** (latest-night only), then by score.  
3. **Below eligible** — **not eligible** competitors, sorted by **score** (highest first).

If the same @handle appears in `mindshare_submissions.csv` with **two different wallets**, only one row is shown in the top 7 (Epoch 1 export wallet wins when present); extra wallet rows are hidden so you do not see duplicate @handles further down at score 0.

Anyone with at least one green checkpoint ranks above an eligible account with zero ticks, even if the latter has a higher score. A not-eligible account never ranks above an eligible one.

---

## Epoch 1 carryover

**Source:** `leaderboard_export.csv` (override: `MINDSHARE_EPOCH1_LEADERBOARD_CSV_PATH`)

| Epoch 1 rank | Epoch 2 |
| ------------ | ------- |
| **1–101** | **No Epoch 1 carryover** — may compete normally; score comes from Epoch 2 posts only |
| **102+** | **Merged once** into cumulative `score` and `postCount` (added on top of new Epoch 2 daily scores) |

Tracked in `epoch2_daily_state.json` as `epoch1CarryoverApplied`. Re-deploy with an existing snapshot: run one daily job (`epoch2-sr-snapshot` or `?refresh=1`) or `epoch2-posts-backfill` to apply the merge.

---

## CSV columns

`x handle,wallet,name,post submited,sr balance,submitted at`

New submits get `submitted at` automatically. Older files are migrated to add empty `submitted at` on legacy rows. One CSV row can list **multiple tweet URLs** (multiline `post submited` field); each URL is a separate post after flattening.

---

## Operator wallet migrations (`lib/mindshareEpoch2OperatorAdjustments.ts`)

Verified manual fixes (wallet change, SR checkpoint ticks, final score) are applied on every `/epoch2` read after SR enrichment. Edit `EPOCH2_OPERATOR_ADJUSTMENTS` and redeploy. Each array entry is **one @handle**. **Two different @handles may use the same wallet** and appear as separate rows; scoring keys competitors by `wallet + handle`. Operator wallet “merge” only collapses duplicate rows for that same handle (e.g. two old TNr1ck wallets → one @TNr1ck row).

| Handle | Wallet | Checkpoints (15 May = 1 … 19 May = 5) | Score |
| ------ | ------ | ------------------------------------- | ----- |
| TNr1ck | `0x3e33a63d7B64bCCE6bC7B0e38cbaAACfab0ca8b8` | 1, 2, 3 | 265.2 |
| Anh_Mot0 | `0xD80A598A2E16145B620BfFA6fd48F00dA788eB12` | 1, 2, 4, 5 | 215.8 |
| Villa_PHM | `0xf31a42744c247cde808188d171c7E9B227022dc3` | 1, 4, 5 | 196.42 |
| phantomfills_hl | (unchanged; match by handle) | 1, 4, 5 | 103.35 |

**Below top 8 (score only):** JokerIBlack 426.45, sheepmek1 401.72, bencryptovnn 389.36, tcmalpha 361.84, gaogaocrypto 338.57, Trong_Hatachi 317.28, hitasyurek 296.44, muhitonx 81, sothh84 249.17, captainjack125 0 (not eligible), palash433 165.17, bigmanstuff0 138.5. LongL2282268 223.54, dinhturin 181.92, dang_duytan 159.37, sashinmeena 136.84, nguyenthambt 114.26, Drkhaleefah2 97.53, nvtshop01 80.28.

Also update `mindshare_submissions.csv` (and Epoch 1 export wallet for carryover) when a wallet changes.

---

## Troubleshooting a wallet

```bash
W=0x…   # or use handle with trace-wallet

grep -i "$W" mindshare_submissions.csv
grep -c "$W:" data/newmindshare/epoch2_daily_state.json

npm run epoch2:trace-wallet -- "$W"
npm run epoch2:check-sr -- "$W" --chain
npx tsx scripts/check-wallet-posts.mjs "$W"
```

| Symptom | Likely cause |
| ------- | ------------- |
| In SR jsonl but not on leaderboard | `countedPostKeys` empty or post outside window when eligible |
| In CSV but missing after rebuild | Never SR-eligible on checkpoint nights → 0 counted posts (shows at score 0 after fix); verify with `epoch2:trace-wallet` |
| In CSV, score 0, not in SR jsonl | On-chain $SR was ≤10k at midnight checkpoints; CSV `sr balance` is not used for gating |
| `balancesByWallet` shows `0` | Not failing SR — file lists **all** CSV wallets; check `walletsLower` |
| Same wallet on jsonl lines 3–4 | Duplicate **manual re-runs** for the same `eligibilityDayKey` |
| `postCount` wrong vs CSV | Run `epoch2-recount` or `epoch2-posts-backfill?replace=1` after fixing cache |
