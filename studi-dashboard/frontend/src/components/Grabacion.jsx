import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api.js";
import { useMaterias } from "../lib/MateriasContext.jsx";
import { SubjectChip, Card } from "./ui.jsx";
import { IconGrabar, IconStop, IconCheck } from "./Icons.jsx";

function formatDuracion(segundos) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Grabacion() {
  const { materias } = useMaterias();
  const [materiaId, setMateriaId] = useState(null);
  const [estado, setEstado] = useState("inactivo"); // inactivo | grabando | listo | subiendo | subido
  const [duracion, setDuracion] = useState(0);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState(null);
  const [historial, setHistorial] = useState([]);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const blobRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  useEffect(() => {
    if (materiaId === null && materias.length > 0) setMateriaId(materias[0].id);
  }, [materiaId, materias]);

  async function iniciarGrabacion() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        blobRef.current = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        setEstado("listo");
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setDuracion(0);
      setEstado("grabando");
      timerRef.current = setInterval(() => setDuracion((d) => d + 1), 1000);
    } catch {
      setError("No se pudo acceder al micrófono. Revisa los permisos del navegador.");
    }
  }

  function detenerGrabacion() {
    clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }

  function descartar() {
    blobRef.current = null;
    setDuracion(0);
    setEstado("inactivo");
  }

  async function subir() {
    if (!blobRef.current) return;
    setEstado("subiendo");
    setProgreso(0);
    try {
      const resultado = await api.subirAudio(blobRef.current, materiaId, setProgreso);
      setHistorial((prev) => [{ ...resultado, materiaId, fecha: new Date() }, ...prev]);
      setEstado("subido");
      blobRef.current = null;
      setTimeout(() => setEstado("inactivo"), 1600);
    } catch (err) {
      setError(err.message);
      setEstado("listo");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-[12px] uppercase tracking-wide text-ink-muted">Materia</p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {materias.map((s) => (
            <SubjectChip
              key={s.id}
              materiaId={s.id}
              active={materiaId === s.id}
              onClick={() => setMateriaId(s.id)}
            />
          ))}
        </div>
      </div>

      <Card className="flex flex-col items-center gap-4 py-8">
        {estado === "grabando" ? (
          <>
            <span className="text-[13px] text-ink-muted">Grabando…</span>
            <span className="text-[32px] font-semibold tabular-nums">{formatDuracion(duracion)}</span>
            <button
              type="button"
              onClick={detenerGrabacion}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-white dark:bg-ink-dark dark:text-plane-dark"
            >
              <IconStop className="h-6 w-6" />
            </button>
          </>
        ) : estado === "listo" ? (
          <>
            <span className="text-[13px] text-ink-muted">Grabación lista · {formatDuracion(duracion)}</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={descartar}
                className="rounded-full border border-hairline px-4 py-2 text-[13px] text-ink-secondary dark:border-hairline-dark dark:text-ink-dark-secondary"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={subir}
                className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white dark:bg-ink-dark dark:text-plane-dark"
              >
                Subir
              </button>
            </div>
          </>
        ) : estado === "subiendo" ? (
          <>
            <span className="text-[13px] text-ink-muted">Subiendo… {progreso}%</span>
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-hairline dark:bg-hairline-dark">
              <div
                className="h-full rounded-full bg-ink transition-all dark:bg-ink-dark"
                style={{ width: `${progreso}%` }}
              />
            </div>
          </>
        ) : estado === "subido" ? (
          <div className="flex items-center gap-2 text-[14px] font-medium text-[#0ca30c]">
            <IconCheck className="h-5 w-5" />
            Audio enviado para procesar
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={iniciarGrabacion}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-white dark:bg-ink-dark dark:text-plane-dark"
            >
              <IconGrabar className="h-7 w-7" />
            </button>
            <span className="text-[13px] text-ink-muted">Toca para grabar la clase</span>
          </>
        )}
      </Card>

      {error && <p className="text-center text-[13px] text-[#d03b3b]">{error}</p>}

      {historial.length > 0 && (
        <div>
          <p className="mb-2 text-[12px] uppercase tracking-wide text-ink-muted">Subidas recientes</p>
          <div className="flex flex-col gap-2">
            {historial.map((h, idx) => (
              <Card key={idx} className="flex items-center justify-between py-2.5">
                <span className="truncate text-[13px]">{h.archivo}</span>
                <span className="text-[11px] text-ink-muted">{h.fecha.toLocaleTimeString("es-CO")}</span>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
