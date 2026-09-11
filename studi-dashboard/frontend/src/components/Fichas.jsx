import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import { useMaterias, useSubjectById, SUBJECT_FALLBACK } from "../lib/MateriasContext.jsx";
import { SubjectChip, SubjectIconBadge, TagChip, SegmentedTabs, StateMessage, Card, Markdown } from "./ui.jsx";
import { TAP_PRESS } from "../lib/motion.js";
import { IconChevron, IconCheck } from "./Icons.jsx";

const SECCIONES = [
  { campo: "resumen", etiqueta: "Resumen" },
  { campo: "terminos", etiqueta: "Términos" },
  { campo: "preguntas", etiqueta: "Preguntas" },
  { campo: "conexiones", etiqueta: "Conexiones" },
  { campo: "brightspace", etiqueta: "Brightspace" },
  { campo: "fechas_texto", etiqueta: "Fechas" },
];

function formatFecha(fecha) {
  if (!fecha) return "Sin fecha";
  const d = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

// Vista de lectura a pantalla completa (mismo patron que TallerDetalle en
// Talleres.jsx) en vez del acordeon anterior -- una seccion a la vez via
// pestanas, no las 6 secciones apiladas en un solo scroll largo.
function FichaDetalle({ ficha, onVolver }) {
  const subject = useSubjectById(ficha.materia_id);
  const secciones = useMemo(() => SECCIONES.filter(({ campo }) => ficha[campo]), [ficha]);
  const [activo, setActivo] = useState(secciones[0]?.campo ?? null);

  return (
    <div>
      <motion.button
        type="button"
        whileTap={TAP_PRESS}
        onClick={onVolver}
        className="mb-3 flex items-center gap-1 text-[13px] text-ink-secondary dark:text-ink-dark-secondary"
      >
        <IconChevron className="h-4 w-4 rotate-180" /> Todas las fichas
      </motion.button>

      <div className="flex items-start gap-3">
        <SubjectIconBadge materiaId={ficha.materia_id} tone="tintada" className="h-12 w-12" />
        <div className="min-w-0">
          <p className="text-[12px] text-ink-muted">
            {subject.nombre !== SUBJECT_FALLBACK.nombre ? subject.nombre : ficha.materia}
          </p>
          <h1 className="text-[18px] font-bold leading-tight">
            {ficha.temas?.length ? ficha.temas.slice(0, 2).join(", ") : "Ficha de clase"}
          </h1>
          <p className="text-[12px] text-ink-muted">{formatFecha(ficha.fecha)}</p>
        </div>
      </div>

      {ficha.temas?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ficha.temas.map((tema, idx) => (
            <TagChip key={tema} index={idx}>
              {tema}
            </TagChip>
          ))}
        </div>
      )}

      {secciones.length > 0 ? (
        <div className="mt-4">
          <SegmentedTabs
            groupId="ficha-secciones"
            options={secciones.map((s) => ({ id: s.campo, label: s.etiqueta }))}
            active={activo}
            onChange={setActivo}
            accentColor={subject.colorLight}
          />
          <div className="mt-3 text-[13px] text-ink-secondary dark:text-ink-dark-secondary">
            <Markdown>{ficha[activo]}</Markdown>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-[13px] text-ink-muted">Esta ficha todavía no tiene contenido generado.</p>
      )}
    </div>
  );
}

export default function Fichas({ onNavegar }) {
  const { materias } = useMaterias();
  const [fichas, setFichas] = useState(null);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState(null);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [incluirAnteriores, setIncluirAnteriores] = useState(false);
  const [abierta, setAbierta] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [mensajeTaller, setMensajeTaller] = useState(null);
  const [tallerGeneradoId, setTallerGeneradoId] = useState(null);

  useEffect(() => {
    api
      .fichas()
      .then(setFichas)
      .catch((err) => setError(err.message));
  }, []);

  const idsActivos = useMemo(() => new Set(materias.map((m) => m.id)), [materias]);

  // "Nuevo semestre" archiva materias.json pero las fichas viejas se quedan
  // en disco -- sin este filtro, fichas de materias que ya no existen en el
  // semestre actual aparecen mezcladas en "Todas" para siempre.
  const fichasDelSemestre = useMemo(() => {
    if (!fichas) return [];
    return incluirAnteriores ? fichas : fichas.filter((f) => idsActivos.has(f.materia_id));
  }, [fichas, incluirAnteriores, idsActivos]);

  const materiasConFichas = useMemo(() => {
    const ids = new Set(fichasDelSemestre.map((f) => f.materia_id));
    return materias.filter((s) => ids.has(s.id));
  }, [fichasDelSemestre, materias]);

  const visibles = useMemo(
    () =>
      fichasDelSemestre.filter((f) => {
        if (filtro && f.materia_id !== filtro) return false;
        if (desde && (!f.fecha || f.fecha < desde)) return false;
        if (hasta && (!f.fecha || f.fecha > hasta)) return false;
        return true;
      }),
    [fichasDelSemestre, filtro, desde, hasta]
  );

  async function generarTallerDeMateria() {
    const temas = [...new Set(visibles.flatMap((f) => f.temas || []))];
    if (temas.length === 0) {
      setMensajeTaller({ tipo: "error", texto: "No hay temas en las fichas filtradas para generar un taller." });
      return;
    }
    setGenerando(true);
    setMensajeTaller(null);
    setTallerGeneradoId(null);
    try {
      const resultado = await api.generarTallerInteractivo(filtro, temas);
      setMensajeTaller({ tipo: "ok", texto: "Taller generado con los temas filtrados." });
      setTallerGeneradoId(resultado.id);
    } catch (err) {
      setMensajeTaller({ tipo: "error", texto: err.message });
    } finally {
      setGenerando(false);
    }
  }

  if (error) return <StateMessage>{error}</StateMessage>;
  if (!fichas) return <StateMessage>Cargando fichas…</StateMessage>;
  if (fichas.length === 0) return <StateMessage>Todavía no hay fichas de clase.</StateMessage>;

  const fichaAbierta = abierta ? fichas.find((f) => f.id === abierta) : null;
  if (fichaAbierta) return <FichaDetalle ficha={fichaAbierta} onVolver={() => setAbierta(null)} />;

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
                setTallerGeneradoId(null);
              }}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1.5">
          <label className="flex items-center gap-1.5 text-[12px] text-ink-muted">
            Desde
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="rounded-lg border border-hairline bg-transparent px-2 py-1 text-[12px] dark:border-hairline-dark dark:text-ink-dark"
            />
          </label>
          <label className="flex items-center gap-1.5 text-[12px] text-ink-muted">
            Hasta
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="rounded-lg border border-hairline bg-transparent px-2 py-1 text-[12px] dark:border-hairline-dark dark:text-ink-dark"
            />
          </label>
          <label className="flex items-center gap-1.5 text-[12px] text-ink-muted">
            <input
              type="checkbox"
              checked={incluirAnteriores}
              onChange={(e) => setIncluirAnteriores(e.target.checked)}
            />
            Incluir semestres anteriores
          </label>
        </div>

        {filtro && (
          <div className="flex flex-col gap-1.5 pt-2">
            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                whileTap={generando ? undefined : TAP_PRESS}
                disabled={generando}
                onClick={generarTallerDeMateria}
                className="rounded-full border border-hairline px-3.5 py-1.5 text-[13px] text-ink-secondary disabled:opacity-50 dark:border-hairline-dark dark:text-ink-dark-secondary"
              >
                {generando ? "Generando…" : "Generar taller de estas fichas"}
              </motion.button>
              {tallerGeneradoId && (
                <motion.button
                  type="button"
                  whileTap={TAP_PRESS}
                  onClick={() => onNavegar?.("talleres", { tallerId: tallerGeneradoId })}
                  className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[13px] font-medium text-white dark:bg-ink-dark dark:text-plane-dark"
                >
                  <IconCheck className="h-3.5 w-3.5" /> Ver taller
                </motion.button>
              )}
            </div>
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
          <Card key={ficha.id} onClick={() => setAbierta(ficha.id)} className="flex items-center gap-3">
            <SubjectIconBadge materiaId={ficha.materia_id} tone="tintada" className="h-11 w-11" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] text-ink-muted">{ficha.materia}</p>
              <p className="truncate text-[14.5px] font-semibold">
                {ficha.temas?.length ? ficha.temas.slice(0, 2).join(", ") : "Ficha de clase"}
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-ink-muted">
                <span>{formatFecha(ficha.fecha)}</span>
                {ficha.taller_pendiente && (
                  <span className="rounded-full bg-hairline px-2 py-0.5 dark:bg-hairline-dark">Taller pendiente</span>
                )}
              </div>
            </div>
            <IconChevron className="h-4 w-4 shrink-0 text-ink-muted" />
          </Card>
        ))}
        {visibles.length === 0 && (
          <StateMessage>No hay fichas que coincidan con estos filtros.</StateMessage>
        )}
      </div>
    </div>
  );
}
