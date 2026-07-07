import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import { useMaterias } from "../lib/MateriasContext.jsx";
import { SubjectChip, SubjectDot, StateMessage, Accordion } from "./ui.jsx";
import { TAP_PRESS } from "../lib/motion.js";

function formatFecha(fecha) {
  if (!fecha) return "Sin fecha";
  const d = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

export default function Fichas() {
  const { materias } = useMaterias();
  const [fichas, setFichas] = useState(null);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState(null);
  const [abierta, setAbierta] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [mensajeTaller, setMensajeTaller] = useState(null);

  useEffect(() => {
    api
      .fichas()
      .then(setFichas)
      .catch((err) => setError(err.message));
  }, []);

  const materiasConFichas = useMemo(() => {
    if (!fichas) return [];
    const ids = new Set(fichas.map((f) => f.materia_id));
    return materias.filter((s) => ids.has(s.id));
  }, [fichas, materias]);

  const visibles = useMemo(() => {
    if (!fichas) return [];
    return filtro ? fichas.filter((f) => f.materia_id === filtro) : fichas;
  }, [fichas, filtro]);

  async function generarTallerDeMateria() {
    setGenerando(true);
    setMensajeTaller(null);
    try {
      await api.generarTallerInteractivo(filtro);
      setMensajeTaller({ tipo: "ok", texto: "Listo — búscalo en la pestaña Talleres." });
    } catch (err) {
      setMensajeTaller({ tipo: "error", texto: err.message });
    } finally {
      setGenerando(false);
    }
  }

  if (error) return <StateMessage>{error}</StateMessage>;
  if (!fichas) return <StateMessage>Cargando fichas…</StateMessage>;
  if (fichas.length === 0) return <StateMessage>Todavía no hay fichas de clase.</StateMessage>;

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 bg-plane px-4 pb-2 dark:bg-plane-dark">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 pt-1">
          <SubjectChip
            label="Todas"
            groupId="fichas-filtro"
            active={filtro === null}
            onClick={() => setFiltro(null)}
            materiaId={materiasConFichas[0]?.id}
          />
          {materiasConFichas.map((s) => (
            <SubjectChip
              key={s.id}
              materiaId={s.id}
              groupId="fichas-filtro"
              active={filtro === s.id}
              onClick={() => {
                setFiltro(s.id);
                setMensajeTaller(null);
              }}
            />
          ))}
        </div>

        {filtro && (
          <div className="flex items-center gap-2 pt-1">
            <motion.button
              type="button"
              whileTap={generando ? undefined : TAP_PRESS}
              disabled={generando}
              onClick={generarTallerDeMateria}
              className="rounded-full border border-hairline px-3.5 py-1.5 text-[13px] text-ink-secondary disabled:opacity-50 dark:border-hairline-dark dark:text-ink-dark-secondary"
            >
              {generando ? "Generando…" : "Generar taller de esta materia"}
            </motion.button>
            {mensajeTaller && (
              <span className={`text-[12px] ${mensajeTaller.tipo === "error" ? "text-[#d03b3b]" : "text-[#0ca30c]"}`}>
                {mensajeTaller.texto}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2.5">
        {visibles.map((ficha) => (
          <Accordion
            key={ficha.id}
            open={abierta === ficha.id}
            onToggle={() => setAbierta(abierta === ficha.id ? null : ficha.id)}
            header={
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center gap-2 text-[12px] text-ink-secondary dark:text-ink-dark-secondary">
                  <SubjectDot materiaId={ficha.materia_id} />
                  <span className="truncate">{ficha.materia}</span>
                </div>
                <span className="text-[15px] font-semibold">
                  {ficha.temas?.length ? ficha.temas.slice(0, 2).join(", ") : "Ficha de clase"}
                </span>
                <span className="text-[12px] text-ink-muted">{formatFecha(ficha.fecha)}</span>
                {ficha.taller_pendiente && (
                  <span className="mt-1 inline-block w-fit rounded-full bg-hairline px-2 py-0.5 text-[11px] text-ink-secondary dark:bg-hairline-dark dark:text-ink-dark-secondary">
                    Taller pendiente
                  </span>
                )}
              </div>
            }
          >
            <div className="flex flex-col gap-3 text-[13px]">
              {ficha.resumen && (
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-ink-muted">Resumen</p>
                  <p className="text-ink-secondary dark:text-ink-dark-secondary">{ficha.resumen}</p>
                </div>
              )}
              {ficha.temas?.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-ink-muted">Temas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ficha.temas.map((tema) => (
                      <span key={tema} className="rounded-full bg-hairline px-2 py-0.5 text-[12px] dark:bg-hairline-dark">
                        {tema}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {ficha.terminos?.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-ink-muted">Términos</p>
                  <ul className="list-disc space-y-0.5 pl-4 text-ink-secondary dark:text-ink-dark-secondary">
                    {ficha.terminos.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
              {ficha.preguntas?.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-ink-muted">Preguntas</p>
                  <ul className="list-disc space-y-0.5 pl-4 text-ink-secondary dark:text-ink-dark-secondary">
                    {ficha.preguntas.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {ficha.brightspace && (
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-ink-muted">Brightspace</p>
                  <p className="text-ink-secondary dark:text-ink-dark-secondary">{ficha.brightspace}</p>
                </div>
              )}
            </div>
          </Accordion>
        ))}
      </div>
    </div>
  );
}
