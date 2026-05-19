# `data/newmindshare` — production snapshots (do not commit)

Built artifacts only. **Never commit** files in this folder (see root `.gitignore`).

## Split: live input vs built output

| | Path | Updates |
|--|------|---------|
| **Submissions (live)** | `mindshare_submissions.csv` at **repo root** | Form / daily |
| **SR + scores (built)** | `data/newmindshare/*` | Manual rebuild + cron |

`/epoch2` reads `data/newmindshare/epoch2_leaderboard_snapshot.json`.  
Rebuilds always read the **latest** root CSV; they do not use a copy inside this folder.

## Server `.env` (production)

Snapshot path is **hardcoded** to `data/newmindshare` (no `MINDSHARE_EPOCH2_DATA_DIR` needed).

```bash
BASE_ARCHIVE_RPC_URL=...
TWITTER_BEARER_TOKEN=...
CRON_SECRET=...
# Live CSV: ./mindshare_submissions.csv (repo root)
```

## Manual full rebuild (eligibility + post scores)

After deploy or rule changes:

```bash
cd ~/frontend
curl -sS -X POST "http://127.0.0.1:4022/api/mindshare/epoch2-rebuild?latestSr=1" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Writes here:

- `epoch2_sr_snapshots.jsonl` — SR eligible per checkpoint day  
- `epoch2_sr_eligible_wallets.json` — latest SR gate  
- `epoch2_daily_state.json` — `countedPostKeys`  
- `epoch2_leaderboard_snapshot.json` — public leaderboard  
- `epoch2_metrics_cache.json` — X metrics cache  

Nightly cron (`epoch2-sr-snapshot`) also writes here automatically.

## Local

```bash
scp server:~/frontend/mindshare_submissions.csv ./mindshare_submissions.csv
npm run epoch2:rebuild -- --latest-sr
```

## Old `data/mindshare/`

Legacy snapshots from before this layout. Production uses `data/newmindshare/` only.
