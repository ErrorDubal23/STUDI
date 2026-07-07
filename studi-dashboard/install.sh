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

mkdir -p "$HOME/.openclaw/studi/usuarios"

SERVICE_FILE=/etc/systemd/system/studi-dashboard.service
if [ -f "$SERVICE_FILE" ]; then
  # Un despliegue ya existente puede tener ajustes manuales que este script
  # no conoce (ej. un PATH extra para binarios como whisper, o un interprete
  # de Python distinto al venv de aqui abajo) -- sobreescribir el unit file a
  # ciegas en cada re-run los perderia silenciosamente. Se deja intacto y solo
  # se avisa que revises manualmente.
  echo "== Servicio systemd ya existe, no se regenera =="
  echo "Si esta es la primera vez que agregas STUDI_INVITE_CODE, edita $SERVICE_FILE"
  echo "a mano (sudo systemctl edit --full studi-dashboard) y agrega una linea:"
  echo "  Environment=STUDI_INVITE_CODE=<tu-codigo>"
  echo "junto a las demas lineas Environment= que ya tenga, luego:"
  echo "  sudo systemctl daemon-reload && sudo systemctl restart studi-dashboard"
else
  echo "== Instalando el servicio systemd =="
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
# Codigo que cada estudiante necesita para crear su propia cuenta (POST
# /api/auth/registro) -- cambia este valor por uno propio antes de compartirlo.
Environment=STUDI_INVITE_CODE=cambiar-este-codigo
ExecStart=${ROOT}/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8080
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable studi-dashboard
  sudo systemctl restart studi-dashboard
fi

echo "== Listo =="
echo "Dashboard disponible en http://<ip-del-servidor>:8080"
echo "Ver logs con: sudo journalctl -u studi-dashboard -f"
