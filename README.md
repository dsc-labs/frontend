# Strike Robot frontend

React + TypeScript + Vite site for [strikerobot.ai](https://strikerobot.ai) (About, SR Platform, SR Agentic).

## Setup

```bash
npm install
npm run dev    # http://localhost:3000
npm run build
```

Env vars: [`.env.example`](./.env.example). Runtime data under `data/` is server-owned — see [`data/README.md`](./data/README.md).

## Public routes

| Path | Status |
| ---- | ------ |
| `/` | About |
| `/sr-platform` | SR Platform landing |
| `/agentic` | SR Agentic landing |
| `/api` | SR Platform Developer API hub |
| `/join`, `/test` | **Closed** — redirect to `/` |
| `/mindshare-challenge`, `/mindshare-submit` | **Closed** after Epoch 3 end — redirect to `/` |
| `/mindshare-leaderboard`, `/leaderboard`, `/epoch3-preview` | Alias → home when mindshare is closed |
| `/data-platform`, `/use-cases`, `/technology-stack`, `/models` | Redirect → `/sr-platform` |
| `/about`, `/partners` | Redirect → `/` |

Hero videos: `/sr-platform` uses `public/Video/Comp 2.mp4`; `/agentic` uses `public/Video/Comp 2-old.mp4`.

## Closed programs (Epoch 3 end)

Both public campaigns ended at **midnight GMT+7, 26 Jul 2026** (`EPOCH_3_END_MS` / `WAITLIST_PAGES_END_MS`).

### Mindshare

- Gate: function `isMindsharePagesOpen` in file `src/lib/mindshareEpochSchedule.ts`
- Pages redirect home; submit API rejects when the window is closed
- Keep in sync with file `lib/mindshareEpoch2Constants.ts`

### SR Platform waitlist (points)

- Gate: function `isWaitlistPagesOpen` in files `src/lib/srPlatformWaitlistLaunch.ts` and `lib/waitlistPages.ts`
- `/join` and `/test` redirect home; waitlist popup does not open
- All waitlist APIs return `403` when closed:
  - `POST /waitlist/register`, `POST /waitlist/register-test`
  - `GET /waitlist/status`, `GET /waitlist/prices`, `GET /waitlist` (stats)
  - `GET`/`POST /api/waitlist/snapshot` (no-op when closed; Vercel waitlist cron removed)

Rewrites for `/waitlist/*` remain in `vercel.json` so closed handlers still answer.

## Mindshare Epoch 2 (operator / archive)

Public leaderboard UI is no longer linked; snapshot tooling remains for operators.

| Doc | Contents |
| --- | -------- |
| [`snapshot.md`](./snapshot.md) | Daily cron, SR vs posts, files, operator APIs |
| [`score.md`](./score.md) | Quality rubric and per-post formula |
| [`data/newmindshare/README.md`](./data/newmindshare/README.md) | Snapshot layout |

Snapshots live in `data/newmindshare/` (not committed). Live submissions CSV is at repo root (`mindshare_submissions.csv` / `_3`).

### Operator APIs / scripts

| Endpoint / script | Purpose |
| ----------------- | ------- |
| `GET /api/mindshare/test-epoch2-leaderboard` | Read leaderboard snapshot JSON |
| `POST /api/mindshare/submit` | Append submission CSV (closed after Epoch 3) |
| Cron `GET /api/mindshare/epoch2-sr-snapshot` | Checkpoint SR snapshot (see `vercel.json`) |
| `npm run epoch2:rebuild` | Full SR + post replay |
| `npm run epoch2:posts-backfill` | Replay post counting |
| `npm run epoch2:sr-backfill-day` | One historical SR day |
| `npm run epoch2:recount` | Re-score existing keys |
| `npm run epoch2:check-sr` / `epoch2:trace-wallet` | Debug helpers |

Requires `CRON_SECRET`, `TWITTER_BEARER_TOKEN`, `BASE_ARCHIVE_RPC_URL` where applicable.

```bash
curl -sS -X POST "http://127.0.0.1:4022/api/mindshare/epoch2-rebuild?latestSr=1" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Stack

- React 18, TypeScript, Vite
- Framer Motion, GSAP, Lottie
- React Router, Privy (wallet login on waitlist/mindshare flows)

## PII / history

Waitlist `state.json` and related dumps must not be committed. See [`scripts/purge-pii-from-history.md`](./scripts/purge-pii-from-history.md) if they appear in git history.
