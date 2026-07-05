import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import { subjectById, SUBJECT_FALLBACK, SUBJECTS } from "../lib/subjects.js";
import { SubjectDot, StateMessage, Card } from "./ui.jsx";
import { IconCheck } from "./Icons.jsx";

// repaso_hoy.json shape can vary depending on how the scheduler wrote it —
// normalize the common possibilities into { materiaId, materiaNombre, temas }.
function normalizeRepaso(data) {
  if (!data) return [];
  const bloques = data.materias || data.items || data.temas || [];
  if (!Array.isArray(bloques)) return [];

  return bloques.map((bloque, idx) => {
    if (typeof bloque === "string") {
      return { key: `s-${idx}`, materiaId: SUBJECT_FALLBACK.id, materiaNombre: "General", temas: [bloque] };
    }
    const materiaNombre = bloque.materia || bloque.nombre || bloque.materia_nombre || "General";
    const materiaId =
      bloque.materia_id ||
      SUBJECTS.find((s) => s.nombre.toLowerCase() === String(materiaNombre).toLowerCase())?.id ||
      SUBJECT_FALLBACK.id;
    const temas = bloque.temas || bloque.temas_repaso || (bloque.tema ? [bloque.tema] : []);
    return { key: `${materiaId}-${idx}`, materiaId, materiaNombre, temas };
  });
}

export default function Repaso() {
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

  const bloques = useMemo(() => normalizeRepaso(data), [data]);

  async function generarTaller(bloque) {
    setEnviando(bloque.key);
    try {
      await api.generarTaller(bloque.materiaId, bloque.temas);
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

  return (
    <div className="flex flex-col gap-2.5">
      {bloques.map((bloque) => {
        const subject = subjectById(bloque.materiaId);
        const yaEnviado = enviados.has(bloque.key);
        return (
          <Card key={bloque.key}>
            <div className="flex items-center gap-2 text-[12px] text-ink-secondary dark:text-ink-dark-secondary">
              <SubjectDot materiaId={bloque.materiaId} />
              <span>{subject.nombre !== SUBJECT_FALLBACK.nombre ? subject.nombre : bloque.materiaNombre}</span>
            </div>

            {bloque.temas.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {bloque.temas.map((tema) => (
                  <li
                    key={tema}
                    className="rounded-full bg-hairline px-2.5 py-1 text-[12px] dark:bg-hairline-dark"
                  >
                    {tema}
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              disabled={enviando === bloque.key || yaEnviado}
              onClick={() => generarTaller(bloque)}
              className="mt-3 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium text-white disabled:opacity-70"
              style={{ backgroundColor: yaEnviado ? "#0ca30c" : subject.colorLight }}
            >
              {yaEnviado ? (
                <>
                  <IconCheck className="h-4 w-4" />
                  Taller solicitado
                </>
              ) : enviando === bloque.key ? (
                "Enviando…"
              ) : (
                "Generar taller"
              )}
            </button>
          </Card>
        );
      })}
    </div>
  );
}
