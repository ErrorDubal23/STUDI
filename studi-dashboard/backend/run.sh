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
# Codigo que cada estudiante necesita para crear su propia cuenta (ver
# POST /api/auth/registro) -- cambialo antes de exponer el servicio.
export STUDI_INVITE_CODE="${STUDI_INVITE_CODE:-studi2026}"

mkdir -p "$STUDI_DATA_DIR/usuarios"

if [[ "${1:-}" == "--reload" ]]; then
  exec uvicorn main:app --host 0.0.0.0 --port 8080 --reload
else
  exec uvicorn main:app --host 0.0.0.0 --port 8080
fi
