import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { api } from "../lib/api.js";
import { useMaterias, useSubjectById } from "../lib/MateriasContext.jsx";
import { SubjectDot, SubjectChip, StateMessage, Card } from "./ui.jsx";
import { TAP_PRESS } from "../lib/motion.js";
import { IconChevron } from "./Icons.jsx";

const KATEX_OPTIONS = { throwOnError: false, strict: false };

const BADGES = {
  domina: { texto: "Dominado", color: "#0ca30c" },
  parcial: { texto: "A medio camino", color: "#c98500" },
  fallo: { texto: "Sigue practicando", color: "#d03b3b" },
};

// remark-math solo reconoce delimitadores $...$ / $$...$$ -- Yoda a veces
// escribe matematicas con delimitadores estilo LaTeX \( \) / \[ \], hay que
// convertirlos antes de pasarle el texto a ReactMarkdown.
function normalizarDelimitadoresMatematicos(texto) {
  return texto
    .replace(/\\\[/g, "$$")
    .replace(/\\\]/g, "$$")
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$");
}

function Markdown({ children }) {
  return (
    <div className="text-[14px] leading-relaxed [&_.katex]:text-[15px]">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[[rehypeKatex, KATEX_OPTIONS]]}>
        {normalizarDelimitadoresMatematicos(children)}
      </ReactMarkdown>
    </div>
  );
}

function formatFechaHora(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function Pregunta({ tallerId, pregunta }) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  async function responder() {
    if (!texto.trim()) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await api.responderTaller(tallerId, pregunta.numero, texto);
      setResultado(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const badge = resultado?.resultado ? BADGES[resultado.resultado] : null;
  const subject = useSubjectById(pregunta.materia_id);

  return (
    <Card
      accentColor={subject.colorLight}
      className="flex flex-col gap-2.5 print:break-inside-avoid print:border-0 print:shadow-none"
    >
      <div className="flex items-center gap-1.5 text-[11px] text-ink-muted print:hidden">
        <SubjectDot materiaId={pregunta.materia_id} className="h-2 w-2" />
        {pregunta.materia}
      </div>

      <Markdown>{`${pregunta.numero}. ${pregunta.pregunta}`}</Markdown>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Escribe tu respuesta…"
        rows={2}
        className="w-full resize-none rounded-xl border border-hairline bg-transparent px-3 py-2 text-[13px] dark:border-hairline-dark dark:text-ink-dark print:hidden"
      />

      <motion.button
        type="button"
        whileTap={enviando || !texto.trim() ? undefined : TAP_PRESS}
        disabled={enviando || !texto.trim()}
        onClick={responder}
        className="self-end rounded-full bg-ink px-4 py-1.5 text-[12px] font-medium text-white disabled:opacity-50 dark:bg-ink-dark dark:text-plane-dark print:hidden"
      >
        {enviando ? (
          <span className="flex items-center gap-1.5">
            <motion.span
              className="h-2.5 w-2.5 rounded-full border-[1.5px] border-white/40 border-t-white dark:border-ink-dark/30 dark:border-t-ink-dark"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
            />
            Pensando…
          </span>
        ) : resultado ? (
          "Responder de nuevo"
        ) : (
          "Responder"
        )}
      </motion.button>

      {error && <p className="text-[12px] text-[#d03b3b] print:hidden">{error}</p>}

      {resultado && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-hairline px-3 py-2.5 dark:bg-hairline-dark print:hidden"
        >
          {badge && (
            <span
              className="mb-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
              style={{ backgroundColor: badge.color }}
            >
              {badge.texto}
            </span>
          )}
          <Markdown>{resultado.feedback}</Markdown>
        </motion.div>
      )}
    </Card>
  );
}

function Ejercicio({ ejercicio }) {
  return (
    <Card className="flex flex-col gap-2 print:break-inside-avoid print:border-0 print:shadow-none">
      {ejercicio.tema && (
        <p className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">{ejercicio.tema}</p>
      )}
      <Markdown>{`${ejercicio.numero}. ${ejercicio.enunciado}`}</Markdown>
      <div className="mt-2 h-16 border-b border-dashed border-hairline dark:border-hairline-dark print:h-24" />
    </Card>
  );
}

function TallerDescargable({ taller }) {
  const materia = useMaterias().materias.find((m) => m.id === taller.materias[0]);
  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div>
          <p className="text-[14px] font-semibold">{taller.materia_nombre || materia?.nombre}</p>
          <p className="text-[12px] text-ink-muted">{(taller.temas || []).join(", ")}</p>
        </div>
        <motion.button
          type="button"
          whileTap={TAP_PRESS}
          onClick={() => window.print()}
          className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white dark:bg-ink-dark dark:text-plane-dark"
        >
          Descargar PDF
        </motion.button>
      </div>
      <div className="mb-4 hidden print:block">
        <h1 className="text-lg font-semibold">{taller.materia_nombre || materia?.nombre} — Taller de práctica</h1>
        <p className="text-sm text-ink-muted">{(taller.temas || []).join(", ")}</p>
      </div>
      <div className="flex flex-col gap-3">
        {taller.ejercicios.map((e) => (
          <Ejercicio key={e.numero} ejercicio={e} />
        ))}
      </div>
    </div>
  );
}

function TallerDetalle({ id, onVolver }) {
  const [taller, setTaller] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .taller(id)
      .then(setTaller)
      .catch((err) => setError(err.message));
  }, [id]);

  return (
    <div>
      <motion.button
        type="button"
        whileTap={TAP_PRESS}
        onClick={onVolver}
        className="mb-3 flex items-center gap-1 text-[13px] text-ink-secondary dark:text-ink-dark-secondary print:hidden"
      >
        <IconChevron className="h-4 w-4 rotate-180" /> Todos los talleres
      </motion.button>
      {error && <StateMessage>{error}</StateMessage>}
      {!taller && !error && <StateMessage>Cargando taller…</StateMessage>}
      {taller && taller.tipo === "descargable" && <TallerDescargable taller={taller} />}
      {taller && taller.tipo !== "descargable" && (
        <div className="flex flex-col gap-3">
          {taller.preguntas.map((p) => (
            <Pregunta key={p.numero} tallerId={id} pregunta={p} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Talleres() {
  const { materias } = useMaterias();
  const [talleres, setTalleres] = useState(null);
  const [error, setError] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const [filtro, setFiltro] = useState(null);

  useEffect(() => {
    api
      .talleres()
      .then(setTalleres)
      .catch((err) => setError(err.message));
  }, []);

  const materiasConTalleres = useMemo(() => {
    if (!talleres) return [];
    const ids = new Set(talleres.flatMap((t) => t.materias));
    return materias.filter((m) => ids.has(m.id));
  }, [talleres, materias]);

  const visibles = useMemo(() => {
    if (!talleres) return [];
    return filtro ? talleres.filter((t) => t.materias.includes(filtro)) : talleres;
  }, [talleres, filtro]);

  if (abierto) return <TallerDetalle id={abierto} onVolver={() => setAbierto(null)} />;

  if (error) return <StateMessage>{error}</StateMessage>;
  if (!talleres) return <StateMessage>Cargando talleres…</StateMessage>;
  if (talleres.length === 0) return <StateMessage>Todavía no hay talleres generados.</StateMessage>;

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 mb-3 bg-plane px-4 pb-1 pt-1 dark:bg-plane-dark">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <SubjectChip
            label="Todas"
            groupId="talleres-filtro"
            active={filtro === null}
            onClick={() => setFiltro(null)}
            materiaId={materiasConTalleres[0]?.id}
          />
          {materiasConTalleres.map((m) => (
            <SubjectChip key={m.id} materiaId={m.id} groupId="talleres-filtro" active={filtro === m.id} onClick={() => setFiltro(m.id)} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {visibles.map((t) => (
          <Card key={t.id} onClick={() => setAbierto(t.id)} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex items-center gap-1.5">
                {t.materias.map((m) => (
                  <SubjectDot key={m} materiaId={m} />
                ))}
                <span className="text-[13px] font-semibold">
                  {t.tipo === "descargable" ? "Taller descargable" : t.tipo === "acumulado" ? "Taller acumulado" : "Taller"} ·{" "}
                  {t.num_items} {t.tipo === "descargable" ? "ejercicios" : "preguntas"}
                </span>
              </div>
              <span className="text-[12px] text-ink-muted">{formatFechaHora(t.creado_en)}</span>
            </div>
            <IconChevron className="h-4 w-4 shrink-0 text-ink-muted" />
          </Card>
        ))}
        {visibles.length === 0 && <StateMessage>No hay talleres de esta materia.</StateMessage>}
      </div>
    </div>
  );
}
