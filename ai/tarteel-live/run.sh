#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PYTHON="/home/zaki/Projets/olddata/venv_mushaf/bin/python"

if [[ ! -x "$PYTHON" ]]; then
    echo "Interpréteur Python introuvable : $PYTHON" >&2
    exit 1
fi

cd "$ROOT"

exec "$PYTHON" -m uvicorn \
    app:app \
    --app-dir "$ROOT/ai/tarteel-live" \
    --host 127.0.0.1 \
    --port 8767 \
    --workers 1
