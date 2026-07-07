"""
STUDI dashboard backend.

Reads the files OpenClaw already writes under ~/.openclaw/studi/ and
exposes them over a small REST API for the React frontend. Also accepts
audio uploads and review-taller requests, dropping them as files that the
OpenClaw skills (studi-audio, studi-taller) pick up on their own schedule.
"""

import asyncio
import json
import os
import re
import shutil
import subprocess
import unicodedata
import urllib.error
import urllib.request
from datetime import datetime, date
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DATA_DIR = Path(os.environ.get("STUDI_DATA_DIR", "~/.openclaw/studi")).expanduser()
TRANSCRIPTS_DIR = DATA_DIR / "transcripts"
BRIGHTSPACE_DIR = DATA_DIR / "brightspace"
AUDIO_INBOX_DIR = DATA_DIR / "audio_pendiente"
TALLER_GENERADOS_DIR = DATA_DIR / "talleres" / "generados"
REPASO_FILE = DATA_DIR / "repaso_hoy.json"
MATERIAS_FILE = DATA_DIR / "materias.json"

# Tutoria interactiva en vivo: le habla directo a Ollama (no al gateway de
# OpenClaw -- ese solo expone su UI de control y /health, confirmado en
# servidor). Reutiliza el mismo espiritu socratico de taller_prompt.md, pero
# como llamada aislada de una sola pregunta, no como sesion de Yoda.
OLLAMA_URL = os.environ.get("STUDI_OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("STUDI_OLLAMA_MODEL", "kimi-k2.6:cloud")
# Script de studi-taller que persiste el desempeno por tema (el mismo que usa
# Yoda por Telegram). Si no existe en esta maquina (ej. en local en el Mac,
# fuera del servidor), simplemente no se registra el desempeno.
REGISTRAR_DESEMPENO_SCRIPT = Path(os.environ.get(
    "STUDI_REGISTRAR_DESEMPENO_SCRIPT",
    "/home/seh/.openclaw/workspace/skills/studi-taller/registrar_desempeno.py",
))

# Watcher de audio: procesa audio_pendiente/ solo, sin depender de que
# alguien le pida a Yoda por Telegram que lo haga. Reutiliza transcribe.sh
# (Whisper) de la skill studi-audio y el contenido real de process.md como
# prompt directo a Ollama -- un solo texto canonico, usado tanto por Yoda a
# mano como por este watcher.
TRANSCRIBE_SCRIPT = Path(os.environ.get(
    "STUDI_TRANSCRIBE_SCRIPT",
    "/home/seh/.openclaw/workspace/skills/studi-audio/transcribe.sh",
))
PROCESS_MD_PATH = Path(os.environ.get(
    "STUDI_PROCESS_MD",
    "/home/seh/.openclaw/workspace/skills/studi-audio/process.md",
))
AUDIO_WATCH_INTERVAL = int(os.environ.get("STUDI_AUDIO_WATCH_INTERVAL", "25"))
AUDIO_PROCESADOS_DIR = AUDIO_INBOX_DIR / "procesados"

FRONTEND_DIST = Path(os.environ.get("STUDI_FRONTEND_DIST", Path(__file__).resolve().parent.parent / "frontend" / "dist"))

# Seed used the first time materias.json doesn't exist yet -- matches the
# semester profile already tracked by the studi-audio skill on the server
# (skills/studi-audio/semester_profile.json), so the dashboard and Yoda agree
# on the same subjects out of the box. After the first read, materias.json
# on disk is the single source of truth; this constant is never read again.
DEFAULT_SUBJECTS = [
    {
        "id": "algoritmos",
        "nombre": "Algoritmos y Complejidad",
        "codigo": "IST4310",
        "nrc": "2053",
        "profesor": "Narvaez Esmeide Alberto",
        "color_light": "#2a78d6",
        "color_dark": "#3987e5",
        "horario": [
            {"dia": "Lunes", "hora_inicio": "09:00", "hora_fin": "11:00"},
            {"dia": "Jueves", "hora_inicio": "15:00", "hora_fin": "17:00"},
        ],
        "salones": ["94K", "SDU9"],
        "cortes": [],
        "es_extracurricular": False,
    },
    {
        "id": "analisis-datos",
        "nombre": "Análisis de Datos en Ingeniería I",
        "codigo": "EST7042",
        "nrc": "1643",
        "profesor": "Luis Anillo Arrieta",
        "color_light": "#1baf7a",
        "color_dark": "#199e70",
        "horario": [
            {"dia": "Martes", "hora_inicio": "10:00", "hora_fin": "12:00"},
            {"dia": "Miércoles", "hora_inicio": "10:00", "hora_fin": "12:00"},
            {"dia": "Jueves", "hora_inicio": "09:00", "hora_fin": "10:00"},
        ],
        "salones": ["SDU3", "33C", "32C"],
        "cortes": [],
        "es_extracurricular": False,
    },
    {
        "id": "diseno-digital",
        "nombre": "Diseño Digital",
        "codigo": "IST7072",
        "nrc": "2070",
        "profesor": "Charris Stand Daniela Maria",
        "color_light": "#eda100",
        "color_dark": "#c98500",
        "horario": [
            {"dia": "Miércoles", "hora_inicio": "17:00", "hora_fin": "19:00"},
            {"dia": "Jueves", "hora_inicio": "13:00", "hora_fin": "14:00"},
        ],
        "salones": ["26C", "33J"],
        "cortes": [],
        "es_extracurricular": False,
    },
    {
        "id": "estructuras-discretas",
        "nombre": "Estructuras Discretas",
        "codigo": "IST4330",
        "nrc": "2056",
        "profesor": "Davila Castellar Kevin Omar",
        "color_light": "#008300",
        "color_dark": "#008300",
        "horario": [
            {"dia": "Martes", "hora_inicio": "14:00", "hora_fin": "16:00"},
            {"dia": "Jueves", "hora_inicio": "13:00", "hora_fin": "15:00"},
        ],
        "salones": ["23D", "SDU1"],
        "cortes": [],
        "es_extracurricular": False,
    },
    {
        "id": "teoria-codigos",
        "nombre": "Teoría de Códigos",
        "codigo": "MAT4215",
        "nrc": "2230",
        "profesor": "Garcia Claro El Javier",
        "color_light": "#4a3aa7",
        "color_dark": "#9085e9",
        "horario": [
            {"dia": "Lunes", "hora_inicio": "13:00", "hora_fin": "14:00"},
            {"dia": "Miércoles", "hora_inicio": "15:00", "hora_fin": "17:00"},
        ],
        "salones": ["11J", "13J"],
        "cortes": [],
        "es_extracurricular": False,
    },
]

SUBJECT_FALLBACK = {
    "id": "otra",
    "codigo": "",
    "nombre": None,
    "color_light": "#898781",
    "color_dark": "#898781",
    "horario": [],
}


def load_materias() -> list[dict]:
    if not MATERIAS_FILE.exists():
        materias = [dict(m) for m in DEFAULT_SUBJECTS]
        save_materias(materias)
        return materias
    try:
        return json.loads(MATERIAS_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return [dict(m) for m in DEFAULT_SUBJECTS]


def save_materias(materias: list[dict]) -> None:
    MATERIAS_FILE.parent.mkdir(parents=True, exist_ok=True)
    MATERIAS_FILE.write_text(json.dumps(materias, ensure_ascii=False, indent=2), encoding="utf-8")


def slugify(nombre: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", _normalize(nombre)).strip("-")
    return slug or "materia"


def _normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    return text.lower().strip()


def resolve_subject(materia_text: Optional[str], materias: Optional[list[dict]] = None) -> dict:
    if not materia_text:
        return {**SUBJECT_FALLBACK, "nombre": "Sin materia"}
    norm = _normalize(materia_text)
    for subject in materias if materias is not None else load_materias():
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
        # A blank line or a Markdown heading always closes whatever "Campo:"
        # field was open -- otherwise a LIST_FIELDS field (e.g. "Temas:")
        # keeps swallowing every following line, including headings and
        # bullet points, as if they were more list items.
        if not line.strip() or line.lstrip().startswith("#"):
            current_field = None
            if line.strip():
                body_lines.append(line.strip())
            continue

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
        elif match:
            # Looks like a "Campo: valor" line but for a field we don't
            # track (e.g. "Tarea:") -- still ends whatever field was open,
            # so its value doesn't get swallowed as more items of the
            # previous field.
            current_field = None
        elif current_field:
            # Continuation of a multi-line field (e.g. a long "Resumen:").
            if current_field in LIST_FIELDS:
                fields[current_field].extend(_split_list_value(line))
            else:
                fields[current_field] = (fields.get(current_field, "") + " " + line.strip()).strip()
        else:
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


class HorarioBloque(BaseModel):
    dia: str
    hora_inicio: str
    hora_fin: str


class Corte(BaseModel):
    id: str
    nombre: str
    tipo: str = "otro"  # parcial | laboratorio | actividad | otro
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    peso: Optional[str] = None  # texto libre, ej. "30%" -- no es un campo validado


class MateriaInput(BaseModel):
    nombre: str
    codigo: str = ""
    nrc: str = ""
    profesor: str = ""
    color_light: str = "#898781"
    color_dark: str = "#898781"
    horario: list[HorarioBloque] = []
    salones: list[str] = []
    cortes: list[Corte] = []
    es_extracurricular: bool = False


class MateriaUpdate(BaseModel):
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    nrc: Optional[str] = None
    profesor: Optional[str] = None
    color_light: Optional[str] = None
    color_dark: Optional[str] = None
    horario: Optional[list[HorarioBloque]] = None
    salones: Optional[list[str]] = None
    cortes: Optional[list[Corte]] = None
    es_extracurricular: Optional[bool] = None


class NuevoSemestreInput(BaseModel):
    etiqueta: Optional[str] = None


@app.get("/api/materias")
def api_materias():
    return load_materias()


@app.post("/api/materias")
def api_crear_materia(payload: MateriaInput):
    materias = load_materias()
    base_id = slugify(payload.nombre)
    materia_id = base_id
    existentes = {m["id"] for m in materias}
    n = 2
    while materia_id in existentes:
        materia_id = f"{base_id}-{n}"
        n += 1
    nueva = {"id": materia_id, **payload.model_dump()}
    materias.append(nueva)
    save_materias(materias)
    return nueva


@app.put("/api/materias/{materia_id}")
def api_editar_materia(materia_id: str, payload: MateriaUpdate):
    materias = load_materias()
    idx = next((i for i, m in enumerate(materias) if m["id"] == materia_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    cambios = {k: v for k, v in payload.model_dump().items() if v is not None}
    materias[idx] = {**materias[idx], **cambios}
    save_materias(materias)
    return materias[idx]


@app.delete("/api/materias/{materia_id}")
def api_borrar_materia(materia_id: str):
    materias = load_materias()
    restantes = [m for m in materias if m["id"] != materia_id]
    if len(restantes) == len(materias):
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    save_materias(restantes)
    return {"ok": True}


@app.post("/api/semestre/nuevo")
def api_nuevo_semestre(payload: NuevoSemestreInput = NuevoSemestreInput()):
    etiqueta = (payload.etiqueta or datetime.now().strftime("%Y-%m-%d")).strip()
    archivado_como = None
    if MATERIAS_FILE.exists():
        archivado_como = f"materias_{etiqueta}.json"
        MATERIAS_FILE.rename(DATA_DIR / archivado_como)
    save_materias([])
    return {"ok": True, "archivado_como": archivado_como}


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


DATE_ISO_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2}")

# Brightspace (D2L) exports use PascalCase field names. studi-brightspace
# writes richer per-materia folders (content.json = module tree, dropbox.json
# = tareas/entregas) alongside older flat "<materia>.json" files that share
# dropbox.json's shape. Parse both against their real schema instead of
# guessing lowercase field names.


def _normalize_modulo(item: dict) -> dict:
    descripcion = item.get("Description") or {}
    return {
        "id": item.get("Id"),
        "titulo": item.get("Title") or item.get("ShortTitle") or "Sin título",
        "tipo": item.get("Type"),
        "descripcion": descripcion.get("Text") or None,
        "hijos": [_normalize_modulo(h) for h in (item.get("Structure") or [])],
    }


def _normalize_entrega(item: dict) -> Optional[dict]:
    nombre = item.get("Name")
    if not nombre:
        return None
    fecha = item.get("DueDate") or ""
    match = DATE_ISO_PATTERN.search(fecha)
    return {
        "id": item.get("Id"),
        "nombre": nombre,
        "fecha_entrega": match.group(0) if match else None,
        "archivos": [a["FileName"] for a in (item.get("Attachments") or []) if a.get("FileName")],
    }


def read_brightspace_materia(carpeta: Path) -> dict:
    modulos: list[dict] = []
    entregas: list[dict] = []

    content_path = carpeta / "content.json"
    if content_path.exists():
        try:
            data = json.loads(content_path.read_text(encoding="utf-8"))
            if isinstance(data, list):
                modulos = [_normalize_modulo(m) for m in data]
        except json.JSONDecodeError:
            pass

    dropbox_path = carpeta / "dropbox.json"
    if dropbox_path.exists():
        try:
            data = json.loads(dropbox_path.read_text(encoding="utf-8"))
            if isinstance(data, list):
                entregas = [e for e in (_normalize_entrega(i) for i in data) if e]
        except json.JSONDecodeError:
            pass

    return {"modulos": modulos, "entregas": entregas}


def list_brightspace(materias: Optional[list[dict]] = None) -> list[dict]:
    materias = materias if materias is not None else load_materias()
    resultado = []
    if not BRIGHTSPACE_DIR.exists():
        return resultado

    vistos = set()
    for carpeta in sorted(p for p in BRIGHTSPACE_DIR.iterdir() if p.is_dir()):
        nombre_materia = carpeta.name.replace("_", " ")
        subject = resolve_subject(nombre_materia, materias)
        datos = read_brightspace_materia(carpeta)
        resultado.append({
            "materia": nombre_materia,
            "materia_id": subject["id"],
            "color_light": subject["color_light"],
            "color_dark": subject["color_dark"],
            "modulos": datos["modulos"],
            "entregas": datos["entregas"],
            "actualizado": datetime.fromtimestamp(carpeta.stat().st_mtime).isoformat(),
        })
        vistos.add(carpeta.name)

    # Compatibilidad con el formato viejo: un archivo suelto "<materia>.json"
    # con la misma forma que dropbox.json, para materias que aun no tienen
    # su carpeta con el export nuevo.
    for path in sorted(BRIGHTSPACE_DIR.glob("*.json")):
        if path.stem in vistos:
            continue
        try:
            contenido = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        nombre_materia = path.stem.replace("_", " ")
        subject = resolve_subject(nombre_materia, materias)
        entregas = [e for e in (_normalize_entrega(i) for i in contenido) if e] if isinstance(contenido, list) else []
        resultado.append({
            "materia": nombre_materia,
            "materia_id": subject["id"],
            "color_light": subject["color_light"],
            "color_dark": subject["color_dark"],
            "modulos": [],
            "entregas": entregas,
            "actualizado": datetime.fromtimestamp(path.stat().st_mtime).isoformat(),
        })

    return resultado


@app.get("/api/brightspace")
def api_brightspace(materia: Optional[str] = None):
    resultado = list_brightspace()
    if materia:
        resultado = [r for r in resultado if r["materia_id"] == materia]
    return resultado


@app.get("/api/calendario")
def api_calendario():
    eventos = []
    materias = load_materias()

    for ficha in list_fichas():
        subject = next((s for s in materias if s["id"] == ficha["materia_id"]), SUBJECT_FALLBACK)
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

    for materia_data in list_brightspace(materias):
        for entrega in materia_data["entregas"]:
            if not entrega["fecha_entrega"]:
                continue
            eventos.append({
                "fecha": entrega["fecha_entrega"],
                "materia": materia_data["materia"],
                "materia_id": materia_data["materia_id"],
                "color_light": materia_data["color_light"],
                "color_dark": materia_data["color_dark"],
                "tipo": "brightspace",
                "titulo": entrega["nombre"],
                "origen": f"brightspace-{entrega['id']}",
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


def list_talleres_generados() -> list[dict]:
    if not TALLER_GENERADOS_DIR.exists():
        return []
    talleres = []
    for path in TALLER_GENERADOS_DIR.glob("*.json"):
        try:
            talleres.append(json.loads(path.read_text(encoding="utf-8")))
        except json.JSONDecodeError:
            continue
    talleres.sort(key=lambda t: t.get("creado_en", ""), reverse=True)
    return talleres


@app.get("/api/talleres")
def api_talleres():
    return [
        {
            "id": t.get("id"),
            "creado_en": t.get("creado_en"),
            "tipo": t.get("tipo", "normal"),
            "materias": t.get("materias", []),
            "num_items": len(t.get("preguntas") or t.get("ejercicios") or []),
        }
        for t in list_talleres_generados()
    ]


@app.get("/api/talleres/{taller_id}")
def api_taller_detalle(taller_id: str):
    path = TALLER_GENERADOS_DIR / f"{taller_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Taller no encontrado")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Taller inválido")


TALLER_SYSTEM_PROMPT = """Eres STUDI en modo tutor socrático, evaluando la respuesta de un \
estudiante a una pregunta de estudio puntual.

Reglas:
- Nunca digas directamente si la respuesta es correcta o incorrecta.
- Primero pregunta "¿Por qué crees eso?" o pide que profundice.
- Si la respuesta es incompleta, da una pista mínima, nunca la respuesta completa.
- Sé breve: máximo 3-4 líneas de feedback.
- Responde siempre en español.
- Termina SIEMPRE tu respuesta con una línea aparte, exactamente una de estas:
  RESULTADO: domina
  RESULTADO: parcial
  RESULTADO: fallo
  (domina = respuesta completa y correcta; parcial = a medio camino; fallo = \
equivocada sin indicios de entender el tema)."""

RESULTADO_PATTERN = re.compile(r"^RESULTADO:\s*(domina|parcial|fallo)\s*$", re.IGNORECASE | re.MULTILINE)


def _llamar_ollama(system_prompt: str, mensaje_usuario: str, timeout: int = 60) -> str:
    body = json.dumps({
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": mensaje_usuario},
        ],
        "stream": False,
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/chat",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            data = json.loads(res.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError) as exc:
        raise HTTPException(status_code=502, detail=f"No se pudo conectar con el modelo de IA: {exc}")
    return data.get("message", {}).get("content", "")


class RespuestaTallerInput(BaseModel):
    numero: int
    respuesta: str


@app.post("/api/talleres/{taller_id}/responder")
def api_taller_responder(taller_id: str, payload: RespuestaTallerInput):
    path = TALLER_GENERADOS_DIR / f"{taller_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Taller no encontrado")
    taller = json.loads(path.read_text(encoding="utf-8"))
    pregunta = next((p for p in taller.get("preguntas", []) if p.get("numero") == payload.numero), None)
    if not pregunta:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada en el taller")

    mensaje_usuario = (
        f"Pregunta ({pregunta.get('materia')}): {pregunta.get('pregunta')}\n\n"
        f"Respuesta del estudiante: {payload.respuesta}"
    )
    contenido = _llamar_ollama(TALLER_SYSTEM_PROMPT, mensaje_usuario, timeout=60)
    match = RESULTADO_PATTERN.search(contenido)
    resultado = match.group(1).lower() if match else None
    feedback = RESULTADO_PATTERN.sub("", contenido).strip()

    if resultado and pregunta.get("tema") and REGISTRAR_DESEMPENO_SCRIPT.exists():
        subprocess.run(
            [
                "python3", str(REGISTRAR_DESEMPENO_SCRIPT),
                "--materia", pregunta["materia_id"],
                "--tema", pregunta["tema"],
                "--resultado", resultado,
            ],
            capture_output=True,
            timeout=10,
        )

    return {"feedback": feedback, "resultado": resultado}


TALLER_DESCARGABLE_SYSTEM_PROMPT = """Eres STUDI generando un taller de práctica para preparación de parcial.

Genera entre 6 y 10 ejercicios PRÁCTICOS (problemas concretos a resolver, \
nunca preguntas conceptuales abiertas tipo "explica qué es X") sobre los \
temas indicados, de dificultad media-alta a alta.

Reglas:
- Cada ejercicio debe tener datos o un enunciado específico para resolver,
  no una pregunta de opinión o de definición.
- Si el tema es matemático o lógico, usa notación LaTeX con delimitadores
  $...$ para inline y $$...$$ para bloques.
- Ordena de menor a mayor dificultad.
- Responde ÚNICAMENTE con JSON válido, sin texto antes ni después, con
  este formato exacto:
  {"ejercicios": [{"numero": 1, "tema": "<tema breve>", "enunciado": "<texto del ejercicio>"}]}
- Escribe todo en español."""


def _extraer_json(texto: str) -> dict:
    texto = texto.strip()
    texto = re.sub(r"^```(?:json)?\n?", "", texto)
    texto = re.sub(r"\n?```$", "", texto)
    return json.loads(texto)


class GenerarDescargableInput(BaseModel):
    materia_id: str
    corte_id: Optional[str] = None
    temas: Optional[list[str]] = None


@app.post("/api/talleres/generar-descargable")
def api_generar_taller_descargable(payload: GenerarDescargableInput):
    materias = load_materias()
    materia = next((m for m in materias if m["id"] == payload.materia_id), None)
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")

    temas = list(payload.temas or [])
    if payload.corte_id:
        corte = next((c for c in (materia.get("cortes") or []) if c["id"] == payload.corte_id), None)
        if not corte:
            raise HTTPException(status_code=404, detail="Corte no encontrado")
        if corte.get("fecha_inicio") and corte.get("fecha_fin"):
            for ficha in list_fichas():
                if (
                    ficha["materia_id"] == payload.materia_id
                    and ficha.get("fecha")
                    and corte["fecha_inicio"] <= ficha["fecha"] <= corte["fecha_fin"]
                ):
                    temas.extend(ficha.get("temas", []))
        temas = list(dict.fromkeys(temas))

    if not temas:
        raise HTTPException(
            status_code=400,
            detail="No hay temas para generar el taller (revisa las fechas del corte o agrega fichas de clase)",
        )

    mensaje_usuario = f"Materia: {materia['nombre']}\nTemas a cubrir: {', '.join(temas)}"
    contenido = _llamar_ollama(TALLER_DESCARGABLE_SYSTEM_PROMPT, mensaje_usuario, timeout=90)
    try:
        ejercicios = _extraer_json(contenido)["ejercicios"]
    except (json.JSONDecodeError, KeyError, TypeError):
        raise HTTPException(status_code=502, detail="El modelo no devolvió un taller válido, intenta de nuevo")

    timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    taller_id = f"{timestamp}_{payload.materia_id}-descargable"
    taller = {
        "id": taller_id,
        "creado_en": datetime.now().isoformat(),
        "tipo": "descargable",
        "materias": [payload.materia_id],
        "materia_nombre": materia["nombre"],
        "corte_id": payload.corte_id,
        "temas": temas,
        "ejercicios": [
            {
                "numero": e.get("numero", i + 1),
                "tema": e.get("tema", ""),
                "enunciado": e.get("enunciado", ""),
            }
            for i, e in enumerate(ejercicios)
        ],
    }
    TALLER_GENERADOS_DIR.mkdir(parents=True, exist_ok=True)
    (TALLER_GENERADOS_DIR / f"{taller_id}.json").write_text(
        json.dumps(taller, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return taller


TALLER_INTERACTIVO_SYSTEM_PROMPT = """Eres STUDI generando un taller de práctica con preguntas abiertas.

Genera 5 preguntas de estudio ABIERTAS (nunca de selección múltiple) sobre \
los temas indicados, yendo de menor a mayor dificultad. Si hay más de una \
materia entre los temas, mezcla preguntas entre ellas (interleaving) en vez \
de agruparlas.

Reglas:
- Las preguntas deben hacer pensar, no solo memorizar -- nunca reveles la
  respuesta en el enunciado.
- Máximo 2 preguntas por materia.
- Responde ÚNICAMENTE con JSON válido, sin texto antes ni después, con
  este formato exacto:
  {"preguntas": [{"numero": 1, "materia_id": "<id>", "materia": "<nombre>", "tema": "<tema breve>", "pregunta": "<texto>"}]}
- Escribe todo en español."""


class GenerarInteractivoInput(BaseModel):
    materia_id: str
    corte_id: Optional[str] = None
    temas: Optional[list[str]] = None


@app.post("/api/talleres/generar-interactivo")
def api_generar_taller_interactivo(payload: GenerarInteractivoInput):
    materias = load_materias()
    materia = next((m for m in materias if m["id"] == payload.materia_id), None)
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")

    temas = list(payload.temas or [])
    if payload.corte_id:
        corte = next((c for c in (materia.get("cortes") or []) if c["id"] == payload.corte_id), None)
        if not corte:
            raise HTTPException(status_code=404, detail="Corte no encontrado")
        if corte.get("fecha_inicio") and corte.get("fecha_fin"):
            for ficha in list_fichas():
                if (
                    ficha["materia_id"] == payload.materia_id
                    and ficha.get("fecha")
                    and corte["fecha_inicio"] <= ficha["fecha"] <= corte["fecha_fin"]
                ):
                    temas.extend(ficha.get("temas", []))

    if not temas:
        # Sin temas ni corte especificos: usa todos los temas de todas las
        # fichas de esta materia, sin filtrar por fecha -- permite practicar
        # en cualquier momento, no solo lo que el scheduler marque vencido.
        for ficha in list_fichas():
            if ficha["materia_id"] == payload.materia_id:
                temas.extend(ficha.get("temas", []))
    temas = list(dict.fromkeys(temas))

    if not temas:
        raise HTTPException(status_code=400, detail="No hay fichas con temas para esta materia todavía")

    mensaje_usuario = f"Materia: {materia['nombre']}\nTemas disponibles: {', '.join(temas)}"
    contenido = _llamar_ollama(TALLER_INTERACTIVO_SYSTEM_PROMPT, mensaje_usuario, timeout=60)
    try:
        preguntas = _extraer_json(contenido)["preguntas"]
    except (json.JSONDecodeError, KeyError, TypeError):
        raise HTTPException(status_code=502, detail="El modelo no devolvió un taller válido, intenta de nuevo")

    timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    taller_id = f"{timestamp}_{payload.materia_id}"
    taller = {
        "id": taller_id,
        "creado_en": datetime.now().isoformat(),
        "tipo": "normal",
        "materias": list(dict.fromkeys(p.get("materia_id", payload.materia_id) for p in preguntas)),
        "preguntas": [
            {
                "numero": p.get("numero", i + 1),
                "materia_id": p.get("materia_id", payload.materia_id),
                "materia": p.get("materia", materia["nombre"]),
                "tema": p.get("tema", ""),
                "pregunta": p.get("pregunta", ""),
            }
            for i, p in enumerate(preguntas)
        ],
    }
    TALLER_GENERADOS_DIR.mkdir(parents=True, exist_ok=True)
    (TALLER_GENERADOS_DIR / f"{taller_id}.json").write_text(
        json.dumps(taller, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return taller


def _formatear_brightspace_context(materia_id: str) -> str:
    for materia_data in list_brightspace():
        if materia_data["materia_id"] != materia_id:
            continue
        partes = [f"- {modulo['titulo']}" for modulo in materia_data["modulos"]]
        for entrega in materia_data["entregas"]:
            if entrega.get("fecha_entrega"):
                partes.append(f"- Entrega: {entrega['nombre']} ({entrega['fecha_entrega']})")
        return "\n".join(partes)
    return ""


def _renderizar_process_md(materia: dict, fecha: str, transcript: str, brightspace_context: str) -> str:
    plantilla = PROCESS_MD_PATH.read_text(encoding="utf-8")
    return (
        plantilla
        .replace("{{materia}}", materia.get("nombre", ""))
        .replace("{{profesor}}", materia.get("profesor") or "No especificado")
        .replace("{{fecha}}", fecha)
        .replace("{{transcript}}", transcript)
        .replace("{{brightspace_context}}", brightspace_context or "Sin contenido de Brightspace disponible")
    )


def _procesar_audio_pendiente(path: Path) -> None:
    match_nombre = re.match(r"^(\d{4}-\d{2}-\d{2})T\d{2}-\d{2}-\d{2}_(.+)$", path.stem)
    if not match_nombre:
        print(f"[audio-watcher] nombre inesperado, se ignora: {path.name}")
        return
    fecha, materia_slug = match_nombre.group(1), match_nombre.group(2)

    materia = next((m for m in load_materias() if m["id"] == materia_slug), None)
    if not materia:
        print(f"[audio-watcher] materia '{materia_slug}' no encontrada en materias.json, se deja pendiente")
        return
    if not TRANSCRIBE_SCRIPT.exists():
        print(f"[audio-watcher] transcribe.sh no encontrado en {TRANSCRIBE_SCRIPT}, se deja pendiente")
        return
    if not PROCESS_MD_PATH.exists():
        print(f"[audio-watcher] process.md no encontrado en {PROCESS_MD_PATH}, se deja pendiente")
        return

    resultado = subprocess.run(
        ["bash", str(TRANSCRIBE_SCRIPT), str(path), materia_slug, fecha],
        capture_output=True, text=True, timeout=600,
    )
    if resultado.returncode != 0:
        print(f"[audio-watcher] transcribe.sh falló para {path.name}: {resultado.stderr[-500:]}")
        return

    match_path = re.search(r"TRANSCRIPT_PATH=(\S+)", resultado.stdout)
    if not match_path:
        print(f"[audio-watcher] no se pudo leer la ruta del transcript para {path.name}")
        return
    transcript_path = Path(match_path.group(1))
    if not transcript_path.exists():
        print(f"[audio-watcher] transcript no encontrado en {transcript_path}")
        return
    transcript = transcript_path.read_text(encoding="utf-8", errors="replace")

    brightspace_context = _formatear_brightspace_context(materia["id"])
    prompt = _renderizar_process_md(materia, fecha, transcript, brightspace_context)
    contenido = _llamar_ollama(prompt, "Genera la ficha según las instrucciones.", timeout=180)

    ficha_path = TRANSCRIPTS_DIR / f"{fecha}_{materia['nombre'].replace(' ', '_')}.txt"
    TRANSCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
    ficha_path.write_text(contenido, encoding="utf-8")

    # El transcript crudo de transcribe.sh era solo un paso intermedio -- no
    # es una ficha real (no tiene Materia:/Fecha:/Temas:) y viviría en la
    # misma carpeta que list_fichas() escanea, apareciendo como "sin materia".
    if transcript_path.exists() and transcript_path != ficha_path:
        transcript_path.unlink(missing_ok=True)

    AUDIO_PROCESADOS_DIR.mkdir(parents=True, exist_ok=True)
    path.rename(AUDIO_PROCESADOS_DIR / path.name)
    print(f"[audio-watcher] ficha generada: {ficha_path.name}")


async def _audio_watcher_loop():
    while True:
        try:
            if AUDIO_INBOX_DIR.exists():
                for path in sorted(AUDIO_INBOX_DIR.glob("*.webm")):
                    # _procesar_audio_pendiente es sincrona y bloqueante
                    # (subprocess de Whisper, llamada HTTP a Ollama). Correrla
                    # directo aqui congelaria el unico hilo del event loop --
                    # y con el, toda la API -- mientras dura la transcripcion.
                    await asyncio.to_thread(_procesar_audio_pendiente, path)
        except Exception as exc:
            print(f"[audio-watcher] error inesperado: {exc}")
        await asyncio.sleep(AUDIO_WATCH_INTERVAL)


@app.on_event("startup")
async def _iniciar_audio_watcher():
    asyncio.create_task(_audio_watcher_loop())


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
