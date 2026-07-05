#!/usr/bin/env bash
# Starts the STUDI dashboard backend on the Ubuntu server.
# Usage: ./run.sh [--reload]
set -euo pipefail

cd "$(dirname "$0")"

# En macOS con Homebrew, python3.14 necesita una libexpat mas nueva que la del
# sistema; si esta instalada via `brew install expat`, la anteponemos aqui.
if [ -d /opt/homebrew/opt/expat/lib ]; then
  export DYLD_LIBRARY_PATH="/opt/homebrew/opt/expat/lib${DYLD_LIBRARY_PATH:+:$DYLD_LIBRARY_PATH}"
fi

if [ ! -d venv ]; then
  python3 -m venv venv
fi

source venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

export STUDI_DATA_DIR="${STUDI_DATA_DIR:-$HOME/.openclaw/studi}"
export STUDI_FRONTEND_DIST="${STUDI_FRONTEND_DIST:-$(cd .. && pwd)/frontend/dist}"

mkdir -p "$STUDI_DATA_DIR/transcripts" "$STUDI_DATA_DIR/brightspace" \
         "$STUDI_DATA_DIR/audio_pendiente" "$STUDI_DATA_DIR/talleres/solicitudes"

if [[ "${1:-}" == "--reload" ]]; then
  exec uvicorn main:app --host 0.0.0.0 --port 8080 --reload
else
  exec uvicorn main:app --host 0.0.0.0 --port 8080
fi
