import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api.js";
import { useMaterias, useSubjectById } from "../lib/MateriasContext.jsx";
import { SPRING_SNAPPY, TAP_PRESS } from "../lib/motion.js";
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
  const subject = useSubjectById(materiaId);

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

  const grabando = estado === "grabando";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-ink-muted">Materia</p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {materias.map((s) => (
            <SubjectChip
              key={s.id}
              materiaId={s.id}
              groupId="grabar-materia"
              active={materiaId === s.id}
              onClick={() => setMateriaId(s.id)}
            />
          ))}
        </div>
      </div>

      <Card className="flex flex-col items-center gap-4 py-10">
        {estado === "grabando" || estado === "inactivo" ? (
          <>
            {estado === "grabando" && (
              <span className="text-[13px] text-ink-muted">Grabando…</span>
            )}
            {estado === "grabando" && (
              <span className="text-[32px] font-bold tabular-nums">{formatDuracion(duracion)}</span>
            )}
            <div className="relative flex h-24 w-24 items-center justify-center">
              {grabando && (
                <motion.span
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: "#d03b3b" }}
                  animate={{ scale: [1, 1.4, 1], opacity: [0.45, 0, 0.45] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                />
              )}
              <motion.button
                type="button"
                whileTap={TAP_PRESS}
                onClick={grabando ? detenerGrabacion : iniciarGrabacion}
                className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full text-white shadow-card dark:shadow-card-dark"
                style={{ backgroundColor: grabando ? "#d03b3b" : subject.colorLight }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {grabando ? (
                    <motion.span
                      key="stop"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={SPRING_SNAPPY}
                    >
                      <IconStop className="h-7 w-7" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="mic"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={SPRING_SNAPPY}
                    >
                      <IconGrabar className="h-9 w-9" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
            {estado === "inactivo" && <span className="text-[13px] text-ink-muted">Toca para grabar la clase</span>}
          </>
        ) : estado === "listo" ? (
          <>
            <span className="text-[13px] text-ink-muted">Grabación lista · {formatDuracion(duracion)}</span>
            <div className="flex gap-3">
              <motion.button
                type="button"
                whileTap={TAP_PRESS}
                onClick={descartar}
                className="rounded-full border border-hairline px-4 py-2 text-[13px] text-ink-secondary dark:border-hairline-dark dark:text-ink-dark-secondary"
              >
                Descartar
              </motion.button>
              <motion.button
                type="button"
                whileTap={TAP_PRESS}
                onClick={subir}
                className="rounded-full px-4 py-2 text-[13px] font-medium text-white"
                style={{ backgroundColor: subject.colorLight }}
              >
                Subir
              </motion.button>
            </div>
          </>
        ) : estado === "subiendo" ? (
          <>
            <span className="text-[13px] text-ink-muted">Subiendo… {progreso}%</span>
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-hairline dark:bg-hairline-dark">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: subject.colorLight }}
                animate={{ width: `${progreso}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={SPRING_SNAPPY}
            className="flex items-center gap-2 text-[14px] font-medium text-[#0ca30c]"
          >
            <IconCheck className="h-5 w-5" />
            Audio enviado para procesar
          </motion.div>
        )}
      </Card>

      {error && <p className="text-center text-[13px] text-[#d03b3b]">{error}</p>}

      {historial.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-ink-muted">Subidas recientes</p>
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
