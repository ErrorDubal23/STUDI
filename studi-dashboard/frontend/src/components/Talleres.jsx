import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { api } from "../lib/api.js";
import { SubjectDot, StateMessage, Card } from "./ui.jsx";
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

  return (
    <Card className="flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
        <SubjectDot materiaId={pregunta.materia_id} className="h-2 w-2" />
        {pregunta.materia}
      </div>

      <Markdown>{`${pregunta.numero}. ${pregunta.pregunta}`}</Markdown>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Escribe tu respuesta…"
        rows={2}
        className="w-full resize-none rounded-xl border border-hairline bg-transparent px-3 py-2 text-[13px] dark:border-hairline-dark dark:text-ink-dark"
      />

      <button
        type="button"
        disabled={enviando || !texto.trim()}
        onClick={responder}
        className="self-end rounded-full bg-ink px-4 py-1.5 text-[12px] font-medium text-white disabled:opacity-50 dark:bg-ink-dark dark:text-plane-dark"
      >
        {enviando ? "Pensando…" : resultado ? "Responder de nuevo" : "Responder"}
      </button>

      {error && <p className="text-[12px] text-[#d03b3b]">{error}</p>}

      {resultado && (
        <div className="rounded-xl bg-hairline px-3 py-2.5 dark:bg-hairline-dark">
          {badge && (
            <span
              className="mb-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
              style={{ backgroundColor: badge.color }}
            >
              {badge.texto}
            </span>
          )}
          <Markdown>{resultado.feedback}</Markdown>
        </div>
      )}
    </Card>
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
      <button type="button" onClick={onVolver} className="mb-3 flex items-center gap-1 text-[13px] text-ink-secondary dark:text-ink-dark-secondary">
        <IconChevron className="h-4 w-4 rotate-180" /> Todos los talleres
      </button>
      {error && <StateMessage>{error}</StateMessage>}
      {!taller && !error && <StateMessage>Cargando taller…</StateMessage>}
      {taller && (
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
  const [talleres, setTalleres] = useState(null);
  const [error, setError] = useState(null);
  const [abierto, setAbierto] = useState(null);

  useEffect(() => {
    api
      .talleres()
      .then(setTalleres)
      .catch((err) => setError(err.message));
  }, []);

  if (abierto) return <TallerDetalle id={abierto} onVolver={() => setAbierto(null)} />;

  if (error) return <StateMessage>{error}</StateMessage>;
  if (!talleres) return <StateMessage>Cargando talleres…</StateMessage>;
  if (talleres.length === 0) return <StateMessage>Todavía no hay talleres generados.</StateMessage>;

  return (
    <div className="flex flex-col gap-2.5">
      {talleres.map((t) => (
        <Card key={t.id} className="p-0">
          <button type="button" onClick={() => setAbierto(t.id)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex items-center gap-1.5">
                {t.materias.map((m) => (
                  <SubjectDot key={m} materiaId={m} />
                ))}
                <span className="text-[13px] font-medium">
                  {t.tipo === "acumulado" ? "Taller acumulado" : "Taller"} · {t.num_preguntas} preguntas
                </span>
              </div>
              <span className="text-[12px] text-ink-muted">{formatFechaHora(t.creado_en)}</span>
            </div>
            <IconChevron className="h-4 w-4 shrink-0 text-ink-muted" />
          </button>
        </Card>
      ))}
    </div>
  );
}
