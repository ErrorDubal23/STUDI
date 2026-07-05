#!/usr/bin/env bash
# One-time setup for the STUDI dashboard on the Ubuntu server.
# Run from inside the studi-dashboard/ folder once it's been copied to the
# server (e.g. with rsync or git clone), then re-run any time you deploy
# an update to pick up new code.
#
# Usage: ./install.sh
set -euo pipefail

cd "$(dirname "$0")"
ROOT="$(pwd)"

echo "== Verificando dependencias del sistema =="
if ! command -v python3 >/dev/null; then
  sudo apt-get update && sudo apt-get install -y python3 python3-venv python3-pip
fi
if ! command -v node >/dev/null; then
  sudo apt-get update && sudo apt-get install -y nodejs npm
fi

echo "== Construyendo el frontend =="
cd "$ROOT/frontend"
npm install
npm run build

echo "== Preparando el entorno del backend =="
cd "$ROOT/backend"
python3 -m venv venv
source venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
deactivate

mkdir -p "$HOME/.openclaw/studi/transcripts" \
         "$HOME/.openclaw/studi/brightspace" \
         "$HOME/.openclaw/studi/audio_pendiente" \
         "$HOME/.openclaw/studi/talleres/solicitudes"

echo "== Instalando el servicio systemd =="
SERVICE_FILE=/etc/systemd/system/studi-dashboard.service
sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=STUDI Dashboard
After=network.target

[Service]
Type=simple
User=${USER}
WorkingDirectory=${ROOT}/backend
Environment=STUDI_DATA_DIR=${HOME}/.openclaw/studi
Environment=STUDI_FRONTEND_DIST=${ROOT}/frontend/dist
ExecStart=${ROOT}/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8080
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable studi-dashboard
sudo systemctl restart studi-dashboard

echo "== Listo =="
echo "Dashboard disponible en http://<ip-del-servidor>:8080"
echo "Ver logs con: sudo journalctl -u studi-dashboard -f"
