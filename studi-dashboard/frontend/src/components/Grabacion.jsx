import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api.js";
import { useMaterias, useSubjectById } from "../lib/MateriasContext.jsx";
import { SPRING_SNAPPY, TAP_PRESS } from "../lib/motion.js";
import { SubjectChip, Card } from "./ui.jsx";
import { IconGrabar, IconStop, IconCheck, IconFichas, IconTrash, IconPlus } from "./Icons.jsx";
import * as recordingStore from "../lib/recordingStore.js";
import { crearAudioMantenerActivo, destruirAudioMantenerActivo, solicitarWakeLock } from "../lib/keepAlive.js";

const TIMESLICE_MS = 5000;
const MAX_DURACION_SEGUNDOS = 100 * 60; // 1h40 — tope de seguridad
const EXTENSIONES_MATERIAL = ".pdf,.txt,.md";

function formatDuracion(segundos) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatFechaHora(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Material de apoyo (diapositivas/PDFs/textos que da el profesor) como
// entrada extra para generar talleres, ademas del audio. Vive en su propia
// tarjeta debajo de la grabacion porque comparte la misma materia
// seleccionada arriba -- no tiene sentido pedirla dos veces.
function MaterialApoyo({ materiaId, subject }) {
  const [materiales, setMateriales] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!materiaId) return;
    api.materiales(materiaId).then(setMateriales).catch(() => {});
  }, [materiaId]);

  async function alElegirArchivo(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !materiaId) return;
    setError(null);
    setSubiendo(true);
    setProgreso(0);
    try {
      const resultado = await api.subirMaterial(file, materiaId, setProgreso);
      setMateriales((prev) => [resultado, ...prev]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
    }
  }

  async function borrar(material) {
    try {
      await api.borrarMaterial(material.id);
      setMateriales((prev) => prev.filter((m) => m.id !== material.id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold">Material de apoyo</p>
          <p className="text-[11.5px] text-ink-muted">
            Diapositivas o textos de la clase — se usan como referencia extra al generar talleres.
          </p>
        </div>
        <motion.button
          type="button"
          whileTap={subiendo ? undefined : TAP_PRESS}
          disabled={subiendo || !materiaId}
          onClick={() => inputRef.current?.click()}
          className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: subject.colorLight }}
        >
          <IconPlus className="h-3.5 w-3.5" /> {subiendo ? `${progreso}%` : "Subir"}
        </motion.button>
        <input
          ref={inputRef}
          type="file"
          accept={EXTENSIONES_MATERIAL}
          onChange={alElegirArchivo}
          className="hidden"
        />
      </div>

      {error && <p className="text-[12px] text-[#d03b3b]">{error}</p>}

      {materiales.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {materiales.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded-xl bg-hairline px-3 py-2 dark:bg-hairline-dark">
              <IconFichas className="h-4 w-4 shrink-0 text-ink-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium">{m.nombre_original}</p>
                <p className="text-[11px] text-ink-muted">{formatFechaHora(m.subido_en)}</p>
              </div>
              <motion.button type="button" whileTap={TAP_PRESS} onClick={() => borrar(m)} className="shrink-0 text-ink-muted">
                <IconTrash className="h-4 w-4" />
              </motion.button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function Grabacion() {
  const { materias } = useMaterias();
  const [materiaId, setMateriaId] = useState(null);
  const [estado, setEstado] = useState("inactivo"); // inactivo | grabando | listo | subiendo | subido
  const [duracion, setDuracion] = useState(0);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const subject = useSubjectById(materiaId);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const blobRef = useRef(null);
  const timerRef = useRef(null);
  const sessionIdRef = useRef(null);
  const keepAliveAudioRef = useRef(null);
  const wakeLockRef = useRef(null);
  const autoStopTimeoutRef = useRef(null);
  const estadoRef = useRef(estado);

  useEffect(() => {
    estadoRef.current = estado;
  }, [estado]);

  useEffect(
    () => () => {
      clearInterval(timerRef.current);
      limpiarSoporteSegundoPlano();
    },
    []
  );

  useEffect(() => {
    if (materiaId === null && materias.length > 0) setMateriaId(materias[0].id);
  }, [materiaId, materias]);

  // Al abrir la app, si quedó una grabación sin terminar (la pestaña murió
  // en segundo plano antes de poder subirla), la ofrecemos para recuperar.
  useEffect(() => {
    recordingStore.listarSesionesPendientes().then(setPendientes).catch(() => {});
  }, []);

  useEffect(() => {
    async function alCambiarVisibilidad() {
      if (document.visibilityState === "visible" && estadoRef.current === "grabando") {
        wakeLockRef.current = await solicitarWakeLock();
        keepAliveAudioRef.current?.play().catch(() => {});
      }
    }
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => document.removeEventListener("visibilitychange", alCambiarVisibilidad);
  }, []);

  useEffect(() => {
    function alOcultarPagina() {
      if (estadoRef.current === "grabando") {
        try {
          mediaRecorderRef.current?.requestData();
        } catch {
          // best-effort: si la pagina se cierra ya se persistieron los
          // chunks anteriores via el timeslice periodico.
        }
      }
    }
    window.addEventListener("pagehide", alOcultarPagina);
    return () => window.removeEventListener("pagehide", alOcultarPagina);
  }, []);

  function limpiarSoporteSegundoPlano() {
    clearTimeout(autoStopTimeoutRef.current);
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
    destruirAudioMantenerActivo(keepAliveAudioRef.current);
    keepAliveAudioRef.current = null;
  }

  async function iniciarGrabacion() {
    setError(null);
    setAviso(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      sessionIdRef.current = await recordingStore.crearSesion(materiaId);

      recorder.ondataavailable = (e) => {
        if (!e.data || e.data.size === 0) return;
        chunksRef.current.push(e.data);
        recordingStore.agregarFragmento(sessionIdRef.current, e.data).catch(() => {});
      };
      recorder.onstop = () => {
        blobRef.current = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        limpiarSoporteSegundoPlano();
        setEstado("listo");
      };
      recorder.start(TIMESLICE_MS);
      mediaRecorderRef.current = recorder;
      setDuracion(0);
      setEstado("grabando");
      timerRef.current = setInterval(() => setDuracion((d) => d + 1), 1000);

      keepAliveAudioRef.current = crearAudioMantenerActivo();
      keepAliveAudioRef.current.play().catch(() => {});
      wakeLockRef.current = await solicitarWakeLock();
      autoStopTimeoutRef.current = setTimeout(() => {
        setAviso(`Se alcanzó el límite de seguridad de ${formatDuracion(MAX_DURACION_SEGUNDOS)}: la grabación se detuvo automáticamente.`);
        detenerGrabacion();
      }, MAX_DURACION_SEGUNDOS * 1000);
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
    if (sessionIdRef.current) {
      recordingStore.eliminarSesion(sessionIdRef.current).catch(() => {});
      sessionIdRef.current = null;
    }
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
      if (sessionIdRef.current) {
        await recordingStore.eliminarSesion(sessionIdRef.current).catch(() => {});
        sessionIdRef.current = null;
      }
      setTimeout(() => setEstado("inactivo"), 1600);
    } catch (err) {
      setError(err.message);
      setEstado("listo");
    }
  }

  async function subirPendiente(sesion) {
    try {
      const fragmentos = await recordingStore.obtenerFragmentos(sesion.id);
      const blob = new Blob(fragmentos, { type: "audio/webm" });
      const resultado = await api.subirAudio(blob, sesion.materiaId, () => {});
      setHistorial((prev) => [{ ...resultado, materiaId: sesion.materiaId, fecha: new Date() }, ...prev]);
      await recordingStore.eliminarSesion(sesion.id);
      setPendientes((prev) => prev.filter((p) => p.id !== sesion.id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function descartarPendiente(sesion) {
    await recordingStore.eliminarSesion(sesion.id).catch(() => {});
    setPendientes((prev) => prev.filter((p) => p.id !== sesion.id));
  }

  const grabando = estado === "grabando";

  return (
    <div className="flex flex-col gap-5">
      {pendientes.length > 0 && (
        <div className="flex flex-col gap-2">
          {pendientes.map((sesion) => (
            <Card key={sesion.id} className="flex items-center justify-between gap-3 py-3">
              <span className="text-[13px] text-ink-secondary dark:text-ink-dark-secondary">
                Se encontró una grabación sin subir del{" "}
                {new Date(sesion.startedAt).toLocaleString("es-CO")}
              </span>
              <div className="flex flex-shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => descartarPendiente(sesion)}
                  className="rounded-full border border-hairline px-3 py-1.5 text-[12px] text-ink-secondary dark:border-hairline-dark dark:text-ink-dark-secondary"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={() => subirPendiente(sesion)}
                  className="rounded-full bg-ink px-3 py-1.5 text-[12px] font-medium text-white dark:bg-ink-dark"
                >
                  Subir
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

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
      {aviso && <p className="text-center text-[13px] text-ink-muted">{aviso}</p>}

      <MaterialApoyo materiaId={materiaId} subject={subject} />

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
