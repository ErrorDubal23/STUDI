"""
STUDI dashboard backend.

Reads the files OpenClaw already writes under ~/.openclaw/studi/ and
exposes them over a small REST API for the React frontend. Also accepts
audio uploads and review-taller requests, dropping them as files that the
OpenClaw skills (studi-audio, studi-taller) pick up on their own schedule.
"""

import json
import os
import re
import shutil
import unicodedata
from datetime import datetime, date
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DATA_DIR = Path(os.environ.get("STUDI_DATA_DIR", "~/.openclaw/studi")).expanduser()
TRANSCRIPTS_DIR = DATA_DIR / "transcripts"
BRIGHTSPACE_DIR = DATA_DIR / "brightspace"
AUDIO_INBOX_DIR = DATA_DIR / "audio_pendiente"
TALLER_REQUESTS_DIR = DATA_DIR / "talleres" / "solicitudes"
REPASO_FILE = DATA_DIR / "repaso_hoy.json"

FRONTEND_DIST = Path(os.environ.get("STUDI_FRONTEND_DIST", Path(__file__).resolve().parent.parent / "frontend" / "dist"))

# Subject registry: single source of truth for colors + schedule metadata.
# Keys are matched against the "Materia:" field of each ficha using a loose,
# accent/case-insensitive containment check (see resolve_subject()).
SUBJECTS = [
    {
        "id": "algoritmos",
        "codigo": "IST4310",
        "nombre": "Algoritmos y Complejidad",
        "color_light": "#2a78d6",
        "color_dark": "#3987e5",
        "horario": "Lunes 9-11",
    },
    {
        "id": "analisis-datos",
        "codigo": "EST7042",
        "nombre": "Análisis de Datos en Ingeniería I",
        "color_light": "#1baf7a",
        "color_dark": "#199e70",
        "horario": "Martes, Miércoles, Jueves",
    },
    {
        "id": "diseno-digital",
        "codigo": "IST7072",
        "nombre": "Diseño Digital",
        "color_light": "#eda100",
        "color_dark": "#c98500",
        "horario": "Miércoles, Jueves",
    },
    {
        "id": "estructuras-discretas",
        "codigo": "IST4330",
        "nombre": "Estructuras Discretas",
        "color_light": "#008300",
        "color_dark": "#008300",
        "horario": "Martes, Jueves",
    },
    {
        "id": "teoria-codigos",
        "codigo": "MAT4215",
        "nombre": "Teoría de Códigos",
        "color_light": "#4a3aa7",
        "color_dark": "#9085e9",
        "horario": "Lunes, Miércoles",
    },
]

SUBJECT_FALLBACK = {
    "id": "otra",
    "codigo": "",
    "nombre": None,
    "color_light": "#898781",
    "color_dark": "#898781",
    "horario": "",
}


def _normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    return text.lower().strip()


def resolve_subject(materia_text: Optional[str]) -> dict:
    if not materia_text:
        return {**SUBJECT_FALLBACK, "nombre": "Sin materia"}
    norm = _normalize(materia_text)
    for subject in SUBJECTS:
        if _normalize(subject["nombre"]) in norm or norm in _normalize(subject["nombre"]):
            return subject
        if subject["codigo"] and subject["codigo"].lower() in norm:
            return subject
    return {**SUBJECT_FALLBACK, "nombre": materia_text}


# ---------------------------------------------------------------------------
# Ficha parsing
# ---------------------------------------------------------------------------

# Known header fields at the top of a ficha .txt, "Campo: valor" style.
FIELD_ALIASES = {
    "materia": "materia",
    "fecha": "fecha",
    "temas": "temas",
    "brightspace": "brightspace",
    "taller pendiente": "taller_pendiente",
    "resumen": "resumen",
    "terminos": "terminos",
    "términos": "terminos",
    "preguntas": "preguntas",
    "duracion": "duracion",
    "duración": "duracion",
}

DATE_PATTERN = re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b")
LIST_FIELDS = {"temas", "terminos", "preguntas"}


def _split_list_value(value: str) -> list[str]:
    parts = re.split(r"[,;\n]|(?<=\?)\s+(?=[A-ZÁÉÍÓÚÑ¿])", value)
    return [p.strip(" -\t") for p in parts if p.strip(" -\t")]


def parse_ficha(raw_text: str) -> dict:
    lines = raw_text.splitlines()
    fields: dict = {}
    body_lines: list[str] = []

    current_field = None
    for line in lines:
        match = re.match(r"^([A-Za-zÁÉÍÓÚÑáéíóúñ ]+):\s?(.*)$", line)
        key = match.group(1).strip().lower() if match else None
        alias = FIELD_ALIASES.get(key) if key else None
        if alias:
            current_field = alias
            value = match.group(2).strip()
            if alias in LIST_FIELDS:
                fields[alias] = _split_list_value(value) if value else []
            else:
                fields[alias] = value
        elif current_field and line.strip():
            # Continuation of a multi-line field (e.g. a long "Resumen:").
            if current_field in LIST_FIELDS:
                fields[current_field].extend(_split_list_value(line))
            else:
                fields[current_field] = (fields.get(current_field, "") + " " + line.strip()).strip()
        elif line.strip():
            body_lines.append(line.strip())

    fechas_detectadas = sorted(set(m.group(0) for m in DATE_PATTERN.finditer(raw_text)))

    subject = resolve_subject(fields.get("materia"))

    return {
        "materia": fields.get("materia") or subject["nombre"],
        "materia_id": subject["id"],
        "fecha": fields.get("fecha"),
        "temas": fields.get("temas", []),
        "brightspace": fields.get("brightspace"),
        "taller_pendiente": fields.get("taller_pendiente"),
        "resumen": fields.get("resumen") or ("\n".join(body_lines) if body_lines else None),
        "terminos": fields.get("terminos", []),
        "preguntas": fields.get("preguntas", []),
        "duracion": fields.get("duracion"),
        "fechas_detectadas": fechas_detectadas,
    }


def load_ficha(path: Path) -> dict:
    raw_text = path.read_text(encoding="utf-8", errors="replace")
    parsed = parse_ficha(raw_text)
    stat = path.stat()
    return {
        "id": path.stem,
        "archivo": path.name,
        "modificado": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        **parsed,
    }


def list_fichas() -> list[dict]:
    if not TRANSCRIPTS_DIR.exists():
        return []
    fichas = [load_ficha(p) for p in sorted(TRANSCRIPTS_DIR.glob("*.txt"))]
    fichas.sort(key=lambda f: f.get("fecha") or "", reverse=True)
    return fichas


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="STUDI Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("STUDI_CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/status")
def api_status():
    return {
        "ok": True,
        "hora_servidor": datetime.now().isoformat(),
        "data_dir": str(DATA_DIR),
        "data_dir_existe": DATA_DIR.exists(),
        "fichas": len(list(TRANSCRIPTS_DIR.glob("*.txt"))) if TRANSCRIPTS_DIR.exists() else 0,
        "brightspace_archivos": len(list(BRIGHTSPACE_DIR.glob("*.json"))) if BRIGHTSPACE_DIR.exists() else 0,
        "repaso_disponible": REPASO_FILE.exists(),
    }


@app.get("/api/materias")
def api_materias():
    return SUBJECTS


@app.get("/api/fichas")
def api_fichas(materia: Optional[str] = None):
    fichas = list_fichas()
    if materia:
        fichas = [f for f in fichas if f["materia_id"] == materia]
    return fichas


@app.get("/api/fichas/{ficha_id}")
def api_ficha_detalle(ficha_id: str):
    path = TRANSCRIPTS_DIR / f"{ficha_id}.txt"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Ficha no encontrada")
    ficha = load_ficha(path)
    ficha["contenido_crudo"] = path.read_text(encoding="utf-8", errors="replace")
    return ficha


@app.get("/api/repaso")
def api_repaso():
    if not REPASO_FILE.exists():
        return {"disponible": False, "fecha": date.today().isoformat(), "materias": []}
    try:
        data = json.loads(REPASO_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="repaso_hoy.json inválido")
    if isinstance(data, dict):
        data.setdefault("disponible", True)
        return data
    return {"disponible": True, "items": data}


@app.get("/api/brightspace")
def api_brightspace(materia: Optional[str] = None):
    resultado = []
    if BRIGHTSPACE_DIR.exists():
        for path in sorted(BRIGHTSPACE_DIR.glob("*.json")):
            try:
                contenido = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
            nombre_materia = path.stem.replace("_", " ")
            subject = resolve_subject(nombre_materia)
            if materia and subject["id"] != materia:
                continue
            resultado.append({
                "materia": nombre_materia,
                "materia_id": subject["id"],
                "archivo": path.name,
                "actualizado": datetime.fromtimestamp(path.stat().st_mtime).isoformat(),
                "contenido": contenido,
            })
    return resultado


DUE_KEY_PATTERN = re.compile(r"(fecha|due|entrega|vence|deadline)", re.IGNORECASE)
DATE_ISO_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2}")


def _find_dates_in_json(node, found: list[tuple[str, str]], titulo_actual: str = ""):
    """Best-effort walk of a Brightspace module tree looking for due dates."""
    if isinstance(node, dict):
        titulo = node.get("titulo") or node.get("title") or node.get("nombre") or titulo_actual
        for key, value in node.items():
            if isinstance(value, str) and DUE_KEY_PATTERN.search(key) and DATE_ISO_PATTERN.search(value):
                found.append((titulo, DATE_ISO_PATTERN.search(value).group(0)))
            else:
                _find_dates_in_json(value, found, titulo)
    elif isinstance(node, list):
        for item in node:
            _find_dates_in_json(item, found, titulo_actual)


@app.get("/api/calendario")
def api_calendario():
    eventos = []

    for ficha in list_fichas():
        subject = next((s for s in SUBJECTS if s["id"] == ficha["materia_id"]), SUBJECT_FALLBACK)
        if ficha.get("fecha"):
            eventos.append({
                "fecha": ficha["fecha"],
                "materia": ficha["materia"],
                "materia_id": ficha["materia_id"],
                "color_light": subject["color_light"],
                "color_dark": subject["color_dark"],
                "tipo": "clase",
                "titulo": ", ".join(ficha["temas"][:2]) or "Clase",
                "origen": ficha["id"],
            })
        for fecha_extra in ficha.get("fechas_detectadas", []):
            if fecha_extra == ficha.get("fecha"):
                continue
            eventos.append({
                "fecha": fecha_extra,
                "materia": ficha["materia"],
                "materia_id": ficha["materia_id"],
                "color_light": subject["color_light"],
                "color_dark": subject["color_dark"],
                "tipo": "detectada",
                "titulo": ficha.get("taller_pendiente") or "Fecha mencionada en clase",
                "origen": ficha["id"],
            })

    if BRIGHTSPACE_DIR.exists():
        for path in sorted(BRIGHTSPACE_DIR.glob("*.json")):
            try:
                contenido = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
            nombre_materia = path.stem.replace("_", " ")
            subject = resolve_subject(nombre_materia)
            encontrados: list[tuple[str, str]] = []
            _find_dates_in_json(contenido, encontrados)
            for titulo, fecha_extra in encontrados:
                eventos.append({
                    "fecha": fecha_extra,
                    "materia": nombre_materia,
                    "materia_id": subject["id"],
                    "color_light": subject["color_light"],
                    "color_dark": subject["color_dark"],
                    "tipo": "brightspace",
                    "titulo": titulo or "Entrega Brightspace",
                    "origen": path.stem,
                })

    eventos.sort(key=lambda e: e["fecha"])
    return eventos


@app.post("/api/audio")
async def api_audio(file: UploadFile = File(...), materia: Optional[str] = Form(None)):
    AUDIO_INBOX_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    suffix = Path(file.filename or "grabacion.webm").suffix or ".webm"
    materia_slug = re.sub(r"[^a-z0-9]+", "-", _normalize(materia)).strip("-") if materia else "sin-materia"
    destino = AUDIO_INBOX_DIR / f"{timestamp}_{materia_slug}{suffix}"

    with destino.open("wb") as out:
        shutil.copyfileobj(file.file, out)

    return {
        "ok": True,
        "archivo": destino.name,
        "tamano_bytes": destino.stat().st_size,
        "mensaje": "Audio recibido, será procesado por studi-audio.",
    }


@app.post("/api/talleres/generar")
async def api_generar_taller(materia_id: str = Form(...), temas: str = Form("")):
    TALLER_REQUESTS_DIR.mkdir(parents=True, exist_ok=True)
    subject = next((s for s in SUBJECTS if s["id"] == materia_id), SUBJECT_FALLBACK)
    timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    solicitud = {
        "materia_id": materia_id,
        "materia": subject.get("nombre") or materia_id,
        "temas": [t.strip() for t in temas.split(",") if t.strip()],
        "solicitado_en": datetime.now().isoformat(),
        "estado": "pendiente",
    }
    destino = TALLER_REQUESTS_DIR / f"{timestamp}_{materia_id}.json"
    destino.write_text(json.dumps(solicitud, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "solicitud": solicitud, "archivo": destino.name}


# ---------------------------------------------------------------------------
# Static frontend (built with `npm run build` into frontend/dist)
# ---------------------------------------------------------------------------

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")
    app.mount("/icons", StaticFiles(directory=FRONTEND_DIST / "icons"), name="icons")

    @app.get("/manifest.json")
    def manifest():
        return FileResponse(FRONTEND_DIST / "manifest.json")

    @app.get("/sw.js")
    def service_worker():
        return FileResponse(FRONTEND_DIST / "sw.js", media_type="application/javascript")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
