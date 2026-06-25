#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "▶ Installing dependencies..."
npm ci

echo "▶ Building project..."
npm run build

echo ""
echo "✓ Build complete (static files in dist/)"
echo ""
echo "The waitlist API (/waitlist/*) is NOT in dist/ — it runs in Node via vite preview."
echo "If Caddy returns 502 on /waitlist/prices, the preview process is not running."
echo ""
echo "Start (or restart) the app server:"
echo "  npm run start          # listens on 127.0.0.1:3000 — serves dist/ + waitlist API"
echo ""
echo "Caddy should reverse_proxy to that port (all traffic, or at least /waitlist and /api/waitlist)."
echo "See Caddyfile.example in the repo."
