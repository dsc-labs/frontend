# `data/` — runtime state (server-owned, NOT versioned)

Everything under `data/` except the `.gitkeep` placeholders is **runtime state
owned by the production server**. Git carries code, never this data.

## Rules

- **The server is the source of truth.** Live registrations and cron snapshots
  are written on the server and only ever exist there.
- **Never commit runtime data.** It is `.gitignore`d on purpose. Your local copy
  is disposable dev data and is *expected* to differ from the server.
- **Deploys are code-only.** `git pull` on the server updates code; it must not
  touch `data/`. Keep the production data dir *outside* the checkout and point
  the app at it with env vars (`WAITLIST_STATE_PATH`, `MINDSHARE_EPOCH2_*_PATH`).

## Active paths the app reads/writes

- Waitlist: `data/waitlist/state.json` (or `WAITLIST_STATE_PATH`) — **public waitlist is closed**; file may still exist on the server for archives
- Mindshare snapshots: `data/newmindshare/` (or the `MINDSHARE_EPOCH2_*_PATH` vars)

`data/mindshare/` holds legacy archives and is no longer read at runtime.

## Need production data locally?

One-way copy, server → laptop only. Never push local data up.

```bash
rsync -av ubuntu@YOUR_SERVER:/path/to/prod/data/ ./data/
```
