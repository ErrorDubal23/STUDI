import { subjectById } from "../lib/subjects.js";

export function SubjectDot({ materiaId, className = "h-2.5 w-2.5" }) {
  const subject = subjectById(materiaId);
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: subject.colorLight }}
    />
  );
}

export function SubjectChip({ materiaId, active, onClick, label }) {
  const subject = subjectById(materiaId);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
        active
          ? "border-transparent text-white"
          : "border-hairline text-ink-secondary dark:border-hairline-dark dark:text-ink-dark-secondary"
      }`}
      style={active ? { backgroundColor: subject.colorLight } : undefined}
    >
      {!active && <SubjectDot materiaId={materiaId} />}
      {label ?? subject.nombre}
    </button>
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
    <h2 className="mb-2 mt-5 text-[13px] font-medium uppercase tracking-wide text-ink-muted">
      {children}
    </h2>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-hairline bg-surface p-4 dark:border-hairline-dark dark:bg-surface-dark ${className}`}
    >
      {children}
    </div>
  );
}
