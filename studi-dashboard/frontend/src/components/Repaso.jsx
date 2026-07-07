import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import { useMaterias, SUBJECT_FALLBACK } from "../lib/MateriasContext.jsx";
import { SubjectDot, StateMessage, Card } from "./ui.jsx";
import { SPRING_SOFT, TAP_PRESS } from "../lib/motion.js";
import { IconCheck } from "./Icons.jsx";

// repaso_hoy.json shape can vary depending on how the scheduler wrote it —
// normalize the common possibilities into { materiaId, materiaNombre, temas, urgencia }.
function normalizeRepaso(data, materias) {
  if (!data) return [];
  const bloques = data.materias || data.items || data.temas || [];
  if (!Array.isArray(bloques)) return [];

  return bloques.map((bloque, idx) => {
    if (typeof bloque === "string") {
      return { key: `s-${idx}`, materiaId: SUBJECT_FALLBACK.id, materiaNombre: "General", temas: [bloque], urgencia: "normal" };
    }
    const materiaNombre = bloque.materia || bloque.nombre || bloque.materia_nombre || "General";
    const materiaId =
      bloque.materia_id ||
      materias.find((s) => s.nombre.toLowerCase() === String(materiaNombre).toLowerCase())?.id ||
      SUBJECT_FALLBACK.id;
    const temas = bloque.temas || bloque.temas_repaso || (bloque.tema ? [bloque.tema] : []);
    return { key: `${materiaId}-${idx}`, materiaId, materiaNombre, temas, urgencia: bloque.urgencia || "normal" };
  });
}

function BotonGenerar({ bloque, subject, enviando, yaEnviado, onGenerar, compacto }) {
  return (
    <motion.button
      type="button"
      whileTap={enviando || yaEnviado ? undefined : TAP_PRESS}
      disabled={enviando || yaEnviado}
      onClick={onGenerar}
      className={`flex items-center gap-1.5 rounded-full font-medium text-white disabled:opacity-70 ${
        compacto ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-[13px]"
      }`}
      style={{ backgroundColor: yaEnviado ? "#0ca30c" : subject.colorLight }}
    >
      {yaEnviado ? (
        <>
          <IconCheck className="h-3.5 w-3.5" />
          {compacto ? "Listo" : "Taller listo — mira Talleres"}
        </>
      ) : enviando ? (
        <span className="flex items-center gap-1.5">
          <motion.span
            className="h-2.5 w-2.5 rounded-full border-[1.5px] border-white/40 border-t-white"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
          />
          Generando…
        </span>
      ) : (
        "Generar taller"
      )}
    </motion.button>
  );
}

export default function Repaso() {
  const { materias } = useMaterias();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(null);
  const [enviados, setEnviados] = useState(new Set());

  useEffect(() => {
    api
      .repaso()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  const bloques = useMemo(() => {
    const lista = normalizeRepaso(data, materias);
    // La materia con mas urgencia (y mas temas) se vuelve la tarjeta
    // destacada -- prioridad visual real, no solo una lista pareja.
    return [...lista].sort((a, b) => {
      if (a.urgencia !== b.urgencia) return a.urgencia === "alta" ? -1 : 1;
      return b.temas.length - a.temas.length;
    });
  }, [data, materias]);

  const totalTemas = useMemo(() => bloques.reduce((sum, b) => sum + b.temas.length, 0), [bloques]);
  const fraccionUrgente = bloques.length ? bloques.filter((b) => b.urgencia === "alta").length / bloques.length : 0;

  async function generarTaller(bloque) {
    setEnviando(bloque.key);
    try {
      await api.generarTallerInteractivo(bloque.materiaId, bloque.temas);
      setEnviados((prev) => new Set(prev).add(bloque.key));
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(null);
    }
  }

  if (error) return <StateMessage>{error}</StateMessage>;
  if (!data) return <StateMessage>Cargando repaso de hoy…</StateMessage>;
  if (!data.disponible || bloques.length === 0) {
    return <StateMessage>No hay repaso programado para hoy.</StateMessage>;
  }

  const [destacado, ...resto] = bloques;
  const subjectDestacado = materias.find((m) => m.id === destacado.materiaId) || SUBJECT_FALLBACK;

  return (
    <div className="flex flex-col gap-4">
      {/* Hero: contador grande + anillo de progreso */}
      <div className="flex items-center gap-4 px-1 py-2">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
          <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full -rotate-90">
            <circle cx="40" cy="40" r="34" fill="none" strokeWidth="6" className="stroke-hairline dark:stroke-hairline-dark" />
            <motion.circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              stroke="#d03b3b"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: fraccionUrgente }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <span className="text-4xl font-bold tracking-tight">{totalTemas}</span>
        </div>
        <div>
          <p className="text-[15px] font-semibold">Temas pendientes hoy</p>
          <p className="text-[12px] text-ink-muted">
            {bloques.length} {bloques.length === 1 ? "materia" : "materias"} por repasar
          </p>
        </div>
      </div>

      {/* Tarjeta destacada -- la materia con mas urgencia/temas, a todo el ancho */}
      <Card accentColor={subjectDestacado.colorLight} className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[13px] font-medium text-ink-secondary dark:text-ink-dark-secondary">
          <SubjectDot materiaId={destacado.materiaId} className="h-3 w-3" />
          <span className="text-[17px] font-semibold text-ink dark:text-ink-dark">
            {subjectDestacado.nombre !== SUBJECT_FALLBACK.nombre ? subjectDestacado.nombre : destacado.materiaNombre}
          </span>
        </div>
        {destacado.temas.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {destacado.temas.map((tema) => (
              <li key={tema} className="rounded-full bg-hairline px-2.5 py-1 text-[12px] dark:bg-hairline-dark">
                {tema}
              </li>
            ))}
          </ul>
        )}
        <BotonGenerar
          bloque={destacado}
          subject={subjectDestacado}
          enviando={enviando === destacado.key}
          yaEnviado={enviados.has(destacado.key)}
          onGenerar={() => generarTaller(destacado)}
        />
      </Card>

      {/* Grilla compacta para el resto */}
      {resto.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          {resto.map((bloque) => {
            const subject = materias.find((m) => m.id === bloque.materiaId) || SUBJECT_FALLBACK;
            return (
              <Card key={bloque.key} accentColor={subject.colorLight} className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink-secondary dark:text-ink-dark-secondary">
                  <SubjectDot materiaId={bloque.materiaId} />
                  <span className="truncate">
                    {subject.nombre !== SUBJECT_FALLBACK.nombre ? subject.nombre : bloque.materiaNombre}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted">
                  {bloque.temas.length} {bloque.temas.length === 1 ? "tema" : "temas"}
                </p>
                <BotonGenerar
                  bloque={bloque}
                  subject={subject}
                  enviando={enviando === bloque.key}
                  yaEnviado={enviados.has(bloque.key)}
                  onGenerar={() => generarTaller(bloque)}
                  compacto
                />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
