#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PYTHON="$ROOT/ai/quran-recognition/.venv/bin/python"
UVICORN="$ROOT/ai/quran-recognition/.venv/bin/uvicorn"

if [ ! -x "$PYTHON" ] || [ ! -x "$UVICORN" ]; then
  printf 'Environnement Python ou Uvicorn absent.\n' >&2
  exit 1
fi

cd "$ROOT"

export PYTHONPATH="$ROOT/ai/quran-recognition${PYTHONPATH:+:$PYTHONPATH}"
export HF_HUB_OFFLINE=1
export TRANSFORMERS_OFFLINE=1

exec "$UVICORN" \
  service.app.main:app \
  --host 127.0.0.1 \
  --port "${TILAWA_RECOGNITION_PORT:-8765}" \
  --workers 1
