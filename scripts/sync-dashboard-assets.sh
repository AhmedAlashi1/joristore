#!/usr/bin/env bash
# Copy SPA JS/CSS to public/assets (required for /admin — no npm needed).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPA="$ROOT/public/spa"
if [[ ! -f "$SPA/index.html" ]]; then
  echo "ERROR: missing $SPA/index.html — run git pull first."
  exit 1
fi
if [[ ! -d "$SPA/assets" ]]; then
  echo "ERROR: missing $SPA/assets"
  exit 1
fi
mkdir -p "$ROOT/public/assets"
rsync -av --delete "$SPA/assets/" "$ROOT/public/assets/"
MAIN_JS="$(grep -oE 'index-[^"]+\.js' "$SPA/index.html" | head -1)"
if [[ -n "$MAIN_JS" && -f "$ROOT/public/assets/$MAIN_JS" ]]; then
  echo "OK: public/assets/$MAIN_JS"
else
  echo "WARN: could not verify main bundle in public/assets/"
fi
