# MMA Robot Landing Page

Dự án landing page được xây dựng với React + TypeScript + Vite, tối ưu cho animation nặng.

## Công nghệ sử dụng

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool nhanh
- **Framer Motion** - Animation library cho React
- **GSAP** - Animation library mạnh mẽ cho animation phức tạp
- **Lottie React** - Hỗ trợ animation Lottie
- **React Router DOM** - Routing cho SPA

## Cài đặt

```bash
npm install
```

## Chạy dự án

```bash
npm run dev
```

Dự án sẽ chạy tại `http://localhost:3000`

## Build

```bash
npm run build
```

## Cấu trúc thư mục

```
src/
  ├── components/     # Các component React
  │   ├── Navigation.tsx
  │   ├── Logo.tsx
  │   ├── HeroSection.tsx
  │   ├── VideoCard.tsx
  │   └── SocialIcons.tsx
  ├── pages/          # Các trang của website
  │   ├── Home.tsx           # Trang chủ
  │   ├── About.tsx          # ABOUT / WHAT WE DO
  │   ├── DataPlatform.tsx   # DECENTRALIZED DATA PLATFORM
  │   ├── UseCases.tsx       # USE CASES
  │   ├── TechnologyStack.tsx # TECHNOLOGY STACK
  │   └── Partners.tsx       # OUR PARTNERS
  ├── animations/     # Các animation utilities
  ├── styles/         # CSS/SCSS files
  ├── assets/         # Images, videos, etc.
  ├── App.tsx         # Component chính với routing
  ├── main.tsx        # Entry point
  └── index.css       # Global styles
```

## Routing

Dự án sử dụng React Router với 6 trang:

- `/` - Home (Trang chủ)
- `/about` - ABOUT / WHAT WE DO
- `/data-platform` - DECENTRALIZED DATA PLATFORM
- `/use-cases` - USE CASES
- `/technology-stack` - TECHNOLOGY STACK
- `/partners` - OUR PARTNERS

## Animation Libraries

### Framer Motion
Sử dụng cho các animation React components:
```tsx
import { motion } from 'framer-motion'
```

### GSAP
Sử dụng cho các animation phức tạp và timeline:
```tsx
import { gsap } from 'gsap'
```

### Lottie
Sử dụng cho các animation JSON:
```tsx
import Lottie from 'lottie-react'
```

## Mindshare Epoch 2 (`/epoch2`)

Public leaderboard is served from **`data/newmindshare/epoch2_leaderboard_snapshot.json`** (not live X on every page load).

| Doc | Contents |
| --- | -------- |
| [`snapshot.md`](./snapshot.md) | Daily cron, SR vs posts, files, operator APIs, backfill runbook |
| [`score.md`](./score.md) | Quality rubric, follower multiplier, per-post formula |

### Routes

- `/epoch2` — Epoch 2 leaderboard UI
- `/api/mindshare/submit` — append `mindshare_submissions.csv`
- `/api/mindshare/epoch2-leaderboard` — read snapshot JSON

### Daily job (production)

**17:00 UTC** (= **00:00 GMT+7**): `GET` / `POST` `/api/mindshare/epoch2-sr-snapshot`

1. SR eligibility at archive block for midnight GMT+7 → `epoch2_sr_eligible_wallets.json`
2. Count + score new posts in tonight’s GMT+7 window → `epoch2_daily_state.json`, `epoch2_leaderboard_snapshot.json`

Requires `CRON_SECRET` (Bearer), `TWITTER_BEARER_TOKEN`, `BASE_ARCHIVE_RPC_URL`.

### Operator scripts (`npm run`)

| Script | Purpose |
| ------ | ------- |
| `epoch2:rebuild` | Full SR + post replay → `data/newmindshare/` (reads root CSV) |
| `epoch2:posts-backfill -- --replace` | Replay post counting for days **15→18 & 20**, then score all |
| `epoch2:sr-backfill-day -- --day 2026-05-16 --replace` | One historical SR checkpoint line (archive RPC) |
| `epoch2:recount` | Re-score existing `countedPostKeys` only |
| `epoch2:check-sr -- <handle\|0x…> [--chain]` | SR checkpoints per day vs jsonl / chain |
| `epoch2:trace-wallet -- <handle\|0x…>` | CSV + SR jsonl + leaderboard + daily state |
| `epoch2:check-wallet` | Post count / scoring debug (see `scripts/check-wallet-posts.mjs`) |

**Production:** live CSV at repo root; snapshots hardcoded to **`data/newmindshare/`** (not committed). See [`data/newmindshare/README.md`](./data/newmindshare/README.md).

```bash
curl -sS -X POST "http://127.0.0.1:4022/api/mindshare/epoch2-rebuild?latestSr=1" \
  -H "Authorization: Bearer $CRON_SECRET"
```

See [`snapshot.md`](./snapshot.md) for endpoint query params and file layout. Env vars: [`.env.example`](./.env.example).

