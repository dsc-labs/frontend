# Epoch 2 — What We Snapshot

This document describes **what data is frozen or refreshed on a schedule** for the Mindshare Epoch 2 leaderboard (`/epoch2`). It complements `score.md` (how scores are calculated) and the ops crons in `vercel.json`.

---

## Overview

| What | When | Stored in | Used for |
| ---- | ---- | --------- | -------- |
| **Daily job (SR + scores)** | Once per day at **00:00 GMT+7** (`0 17 * * *` UTC) | See below | Eligibility, cumulative scores, public leaderboard |
| **Submissions** | On each form submit | `mindshare_submissions.csv` (+ `submitted at` column) | Which posts exist and **when** they were submitted |

Public `/epoch2` reads **`epoch2_leaderboard_snapshot.json`** written by the daily job. It does **not** re-score on every page load.

**Endpoint:** `GET` / `POST` `/api/mindshare/epoch2-sr-snapshot` (cron)  
**Code:** `lib/mindshareEpoch2DailySnapshot.ts` (orchestrates SR + X + scoring)

---

## Daily midnight job (GMT+7)

At **00:00 GMT+7** each day (17:00 UTC, no DST), one run does:

1. **SR eligibility** — on-chain $SR for every wallet in the CSV; eligible if balance **> 10,000** → `epoch2_sr_eligible_wallets.json`
2. **X metrics** — tweet engagement + follower counts for posts being scored → `epoch2_metrics_cache.json`
3. **Cumulative scores** — add points for newly counted posts → `epoch2_leaderboard_snapshot.json` + `epoch2_daily_state.json`

Operator alias (same logic): `/api/mindshare/epoch2-refresh`  
Manual rebuild: `GET /api/mindshare/test-epoch2-leaderboard?refresh=1` (auth where required)

---

## Which posts count (day windows)

Submissions store **`submitted at`** (ISO-8601) on new CSV rows. Legacy rows without a timestamp only participate in the **bootstrap** run.

### Bootstrap (first midnight run only)

- **Window:** all posts with `submittedAt` **before** that midnight (legacy rows count as “before bootstrap”).
- **Rule:** if the wallet is **SR-eligible** at that snapshot, those posts enter the cumulative leaderboard.

### Every later midnight

- **Eligibility day *D*:** you are eligible at the snapshot that ends GMT+7 calendar day *D*.
- **Post window:** submissions with `submittedAt` in **[start of day *D−1*, start of day *D*)** in GMT+7.  
  Example: eligible on **day 15** → posts submitted during **day 14 → day 15** (the 24h window ending at day 15 midnight).
- **Rule:** only **new** posts in that window (not already counted) are scored, and only if the wallet is eligible **that** night.
- **Cumulative:** total score and post count on `/epoch2` are the sum of all posts counted on prior eligible days.

Posts submitted while ineligible, or outside the window for that eligibility day, are **not** scored that night. They may count on a later day if the wallet becomes eligible and the post falls in that day’s window (except legacy posts, which only count on bootstrap).

---

## Files written

| File | Purpose |
| ---- | ------- |
| `epoch2_sr_eligible_wallets.json` | Latest eligible wallets (`updatedAt`, `walletsLower`) |
| `epoch2_sr_snapshots.jsonl` | Audit log per SR run |
| `epoch2_metrics_cache.json` | X API cache (tweet + follower snapshots at daily run) |
| `epoch2_leaderboard_snapshot.json` | Public leaderboard payload (`generatedAt`, `users`, `stats`, …) |
| `epoch2_daily_state.json` | `countedPostKeys`, `bootstrapCompleted`, last run metadata |
| `epoch2_daily_snapshots.jsonl` | Audit log per daily run |

Env overrides: `MINDSHARE_EPOCH2_LEADERBOARD_SNAPSHOT_PATH`, `MINDSHARE_EPOCH2_DAILY_STATE_PATH`, etc. (see `.env.example`).

---

## “The Latest Snapshot” on `/epoch2`

Shows **`generatedAt`** from `epoch2_leaderboard_snapshot.json` — the last **daily** rebuild, not live X data.

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
2. 0xzagen  
3. 100xDarren  
4. 0xweekend59  
5. 3DMax_Virtuals  
6. bizbrainzuni  
7. office2crypto  

Scores are **only increased** when needed to stay above rank 8+ (using varied gaps, not uniform +0.01 steps); otherwise left unchanged. Epoch 1 prize exclusion (ranks 1–101) does **not** apply to these seven wallets.

### Rank order after the top 7

1. **Ranks 1–7** — guaranteed list above (fixed order).  
2. **Rank 8+** — all **SR-eligible** competitors, sorted by **score** (highest first).  
3. **Below eligible** — **not eligible** competitors, sorted by **score** (highest first).

A high-scoring not-eligible account never ranks above an eligible account with a lower score.

---

## Epoch 1 carryover

**Source:** `leaderboard_export.csv` (override: `MINDSHARE_EPOCH1_LEADERBOARD_CSV_PATH`)

| Epoch 1 rank | Epoch 2 |
| ------------ | ------- |
| **1–101** | **Excluded** — already received Epoch 1 prizes |
| **102+** | **Merged once** into cumulative `score` and `postCount` (added on top of new Epoch 2 daily scores) |

Tracked in `epoch2_daily_state.json` as `epoch1CarryoverApplied`. Re-deploy with an existing snapshot: run one daily job (`epoch2-sr-snapshot` or `?refresh=1`) to apply the merge.

---

## CSV columns

`x handle,wallet,name,post submited,sr balance,submitted at`

New submits get `submitted at` automatically. Older files are migrated to add empty `submitted at` on legacy rows.
