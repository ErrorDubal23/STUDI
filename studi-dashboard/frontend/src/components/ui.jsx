import { AnimatePresence, motion } from "framer-motion";
import { useSubjectById } from "../lib/MateriasContext.jsx";
import { SPRING_SNAPPY, SPRING_SOFT, TAP_PRESS } from "../lib/motion.js";
import { IconChevron } from "./Icons.jsx";

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

export function Card({ children, className = "", accentColor, onClick }) {
  const Comp = onClick ? motion.button : motion.div;
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      whileTap={onClick ? TAP_PRESS : undefined}
      className={`w-full rounded-2xl border border-hairline bg-surface p-4 text-left shadow-card dark:border-hairline-dark dark:bg-surface-dark dark:shadow-card-dark ${className}`}
      style={
        accentColor
          ? { boxShadow: `0 0 0 1px ${accentColor}33, 0 10px 28px -10px rgba(30,25,15,0.14)` }
          : undefined
      }
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
