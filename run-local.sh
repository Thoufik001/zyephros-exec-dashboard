#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-5173}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUNDLED_NODE="/Users/thoufikabdullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
BUNDLED_PYTHON="/Users/thoufikabdullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"

if [[ -x "$BUNDLED_NODE" ]]; then
  exec "$BUNDLED_NODE" "$ROOT/server.mjs"
elif command -v node >/dev/null 2>&1; then
  exec node "$ROOT/server.mjs"
elif [[ -x "$BUNDLED_PYTHON" ]]; then
  cd "$ROOT/public"
  exec "$BUNDLED_PYTHON" -m http.server "$PORT" --bind 127.0.0.1
else
  cd "$ROOT/public"
  exec python3 -m http.server "$PORT" --bind 127.0.0.1
fi
