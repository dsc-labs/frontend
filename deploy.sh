#!/usr/bin/env bash
set -e

SITE_DIR="/var/www/strikerobot"

echo "▶ Building project..."
npm run build

echo "▶ Deploying to $SITE_DIR ..."
sudo mkdir -p "$SITE_DIR"

# Remove old build to avoid stale files
sudo rm -rf "$SITE_DIR/dist"

# Copy new build
sudo cp -r dist "$SITE_DIR/"

# Fix permissions for Caddy
sudo chown -R caddy:caddy "$SITE_DIR"
