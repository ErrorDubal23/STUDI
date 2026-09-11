import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { useSubjectById } from "../lib/MateriasContext.jsx";
import { SPRING_SNAPPY, SPRING_SOFT, TAP_PRESS } from "../lib/motion.js";
import { IconChevron, pickSubjectIcon } from "./Icons.jsx";
import { conAlfa, PALETA_CHIPS } from "../lib/visual.js";

const KATEX_OPTIONS = { throwOnError: false, strict: false };

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

export function Markdown({ children }) {
  return (
    <div
      className="text-[14px] leading-relaxed [&_.katex]:text-[15px]
      [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-4
      [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-4
      [&_p]:mb-1.5 [&_p:last-child]:mb-0
      [&_strong]:font-semibold [&_strong]:text-ink dark:[&_strong]:text-ink-dark"
    >
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[[rehypeKatex, KATEX_OPTIONS]]}>
        {normalizarDelimitadoresMatematicos(children)}
      </ReactMarkdown>
    </div>
  );
}

export function SubjectDot({ materiaId, className = "h-2.5 w-2.5" }) {
  const subject = useSubjectById(materiaId);
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: subject.colorLight, boxShadow: `0 0 8px 0 ${subject.colorLight}66` }}
    />
  );
}

// Filtro tipo "chiclet" -- un unico fondo de color (compartido via layoutId)
// se desliza entre chips cuando cambia el activo, en vez de que cada chip
// cambie de color por su cuenta. groupId separa el layoutId cuando una
// misma pantalla llegara a tener mas de una fila de chips independiente.
export function SubjectChip({ materiaId, active, onClick, label, groupId = "chip" }) {
  const subject = useSubjectById(materiaId);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={TAP_PRESS}
      className={`relative shrink-0 overflow-hidden rounded-full border px-3.5 py-1.5 text-[13px] font-medium ${
        active
          ? "border-transparent text-white"
          : "border-hairline text-ink-secondary dark:border-hairline-dark dark:text-ink-dark-secondary"
      }`}
    >
      {active && (
        <motion.span
          layoutId={`${groupId}-bg`}
          transition={SPRING_SNAPPY}
          className="absolute inset-0"
          style={{ backgroundColor: subject.colorLight }}
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">
        {!active && <SubjectDot materiaId={materiaId} />}
        {label ?? subject.nombre}
      </span>
    </motion.button>
  );
}

// Insignia circular con el icono tematico de la materia (ver
// pickSubjectIcon). tone="oscura" = circulo tinta oscura + icono blanco
// (tarjeta destacada); tone="tintada" = circulo con el color de la materia
// muy diluido + icono en el color pleno (tarjetas secundarias/listas).
export function SubjectIconBadge({ materiaId, tone = "tintada", className = "h-11 w-11" }) {
  const subject = useSubjectById(materiaId);
  const Icon = pickSubjectIcon(materiaId);
  const oscura = tone === "oscura";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full ${className}`}
      style={{
        backgroundColor: oscura ? "#152420" : conAlfa(subject.colorLight, 0.16),
        color: oscura ? "#ffffff" : subject.colorLight,
      }}
    >
      <Icon className="h-[55%] w-[55%]" />
    </span>
  );
}

// Chip pastel para temas/etiquetas -- color fijo por posicion (no por
// materia) para que una misma tarjeta muestre variedad, como en la
// referencia, en vez de que todos los chips de una tarjeta salgan del mismo
// tono de la materia.
export function TagChip({ children, index = 0 }) {
  const color = PALETA_CHIPS[index % PALETA_CHIPS.length];
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[12px] font-medium"
      style={{ backgroundColor: conAlfa(color, 0.14), color }}
    >
      {children}
    </span>
  );
}

// Tile para grillas de estadisticas (icono en circulo tintado + etiqueta +
// valor). El tinte se calcula por alfa sobre el color dado en vez de una
// tabla clara/oscura separada, para que se vea bien en ambos temas sin
// duplicar la paleta.
export function StatTile({ icon: Icon, label, value, color }) {
  return (
    <Card className="flex flex-col gap-2 p-3.5">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: conAlfa(color, 0.16), color }}
      >
        <Icon className="h-[52%] w-[52%]" />
      </span>
      <div>
        <p className="text-[11px] text-ink-muted">{label}</p>
        <p className="text-[17px] font-bold tabular-nums">{value}</p>
      </div>
    </Card>
  );
}

// Barra de pestanas con una sola pastilla de fondo compartida via layoutId
// (mismo patron que SubjectChip) -- para leer una seccion a la vez en vez de
// apilar todo el contenido en un solo scroll largo.
export function SegmentedTabs({ options, active, onChange, groupId = "tabs", accentColor }) {
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {options.map((opt) => {
        const isActive = opt.id === active;
        return (
          <motion.button
            key={opt.id}
            type="button"
            whileTap={TAP_PRESS}
            onClick={() => onChange(opt.id)}
            className={`relative shrink-0 overflow-hidden rounded-full px-3.5 py-1.5 text-[12.5px] font-medium ${
              isActive ? "text-white" : "text-ink-secondary dark:text-ink-dark-secondary"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={`${groupId}-bg`}
                transition={SPRING_SNAPPY}
                className="absolute inset-0"
                style={{ backgroundColor: accentColor || "#524f47" }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

export function StateMessage({ children }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6 text-center text-[13px] text-ink-muted">
      {children}
    </div>
  );
}

export function SectionTitle({ children }) {
  return (
    <h2 className="mb-2 mt-5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">
      {children}
    </h2>
  );
}

export function Card({ children, className = "", accentColor, onClick, style }) {
  const Comp = onClick ? motion.button : motion.div;
  const estiloCompuesto = {
    ...(accentColor ? { boxShadow: `0 0 0 1px ${accentColor}33, 0 10px 28px -10px rgba(30,25,15,0.14)` } : null),
    ...style,
  };
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      whileTap={onClick ? TAP_PRESS : undefined}
      className={`w-full rounded-2xl border border-hairline bg-surface p-4 text-left shadow-card dark:border-hairline-dark dark:bg-surface-dark dark:shadow-card-dark ${className}`}
      style={Object.keys(estiloCompuesto).length ? estiloCompuesto : undefined}
    >
      {children}
    </Comp>
  );
}

// Acordeon generico: altura animada real (no solo aparecer/desaparecer),
// chevron dentro de un boton circular tintado, y feedback de "prensado" en
// el encabezado. Fichas/Talleres/Brightspace lo reutilizan en vez de cada
// uno llevando su propia logica de {abierta && (...)}.
export function Accordion({ header, children, open, onToggle, accentColor, className = "" }) {
  return (
    <Card accentColor={accentColor} className={`overflow-hidden p-0 ${className}`}>
      <motion.button
        type="button"
        whileTap={TAP_PRESS}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        {header}
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={SPRING_SNAPPY}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-hairline text-ink-secondary dark:bg-hairline-dark dark:text-ink-dark-secondary"
        >
          <IconChevron className="h-3.5 w-3.5" />
        </motion.span>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING_SOFT}
            className="overflow-hidden"
          >
            <div className="border-t border-hairline px-4 py-4 dark:border-hairline-dark">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
