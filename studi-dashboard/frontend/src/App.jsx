import { useState } from "react";
import Fichas from "./components/Fichas.jsx";
import Calendario from "./components/Calendario.jsx";
import Repaso from "./components/Repaso.jsx";
import Grabacion from "./components/Grabacion.jsx";
import Brightspace from "./components/Brightspace.jsx";
import Materias from "./components/Materias.jsx";
import Talleres from "./components/Talleres.jsx";
import { MateriasProvider } from "./lib/MateriasContext.jsx";
import {
  IconFichas,
  IconCalendario,
  IconRepaso,
  IconGrabar,
  IconBrightspace,
  IconMaterias,
  IconTalleres,
  IconMas,
} from "./components/Icons.jsx";

// Bottom nav caps at 5 slots on mobile (4 primary + "Mas"). Todo lo demas
// vive detras de "Mas" para que las etiquetas no se amontonen en pantallas
// angostas -- ver App.test antes de agregar un sexto item aqui.
const PRIMARY = [
  { id: "repaso", label: "Repaso", Icon: IconRepaso, Component: Repaso },
  { id: "fichas", label: "Fichas", Icon: IconFichas, Component: Fichas },
  { id: "talleres", label: "Talleres", Icon: IconTalleres, Component: Talleres },
  { id: "grabar", label: "Grabar", Icon: IconGrabar, Component: Grabacion },
];

const SECUNDARIOS = [
  { id: "calendario", label: "Calendario", Icon: IconCalendario, Component: Calendario },
  { id: "brightspace", label: "Brightspace", Icon: IconBrightspace, Component: Brightspace },
  { id: "materias", label: "Materias", Icon: IconMaterias, Component: Materias },
];

const TODOS = [...PRIMARY, ...SECUNDARIOS];

export default function App() {
  const [activeTab, setActiveTab] = useState("repaso");
  const [mostrarMas, setMostrarMas] = useState(false);
  const active = TODOS.find((t) => t.id === activeTab) ?? TODOS[0];
  const ActiveComponent = active.Component;
  const enSecundarios = SECUNDARIOS.some((t) => t.id === activeTab);

  function irA(id) {
    setActiveTab(id);
    setMostrarMas(false);
  }

  return (
    <MateriasProvider>
      <div className="flex min-h-screen flex-col bg-plane text-ink dark:bg-plane-dark dark:text-ink-dark">
        <header
          className="sticky top-0 z-10 border-b border-hairline bg-plane/90 backdrop-blur-sm dark:border-hairline-dark dark:bg-plane-dark/90 print:hidden"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-[15px] font-semibold tracking-tight">STUDI</span>
            <span className="text-[12px] text-ink-secondary dark:text-ink-dark-secondary">
              {active.label}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-3">
          <ActiveComponent />
        </main>

        {mostrarMas && (
          <>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setMostrarMas(false)}
              className="fixed inset-0 z-10 bg-black/10 dark:bg-black/30"
            />
            <div className="fixed inset-x-0 bottom-[64px] z-20 mx-auto max-w-lg px-3" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
              <div className="flex flex-col overflow-hidden rounded-2xl border border-hairline bg-surface shadow-lg dark:border-hairline-dark dark:bg-surface-dark">
                {SECUNDARIOS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => irA(id)}
                    className={`flex items-center gap-3 border-b border-hairline px-4 py-3 text-left text-[14px] last:border-b-0 dark:border-hairline-dark ${
                      id === activeTab ? "font-medium" : ""
                    }`}
                  >
                    <Icon className="h-5 w-5 text-ink-muted" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <nav
          className="fixed inset-x-0 bottom-0 z-10 border-t border-hairline bg-surface/95 backdrop-blur-sm dark:border-hairline-dark dark:bg-surface-dark/95 print:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1">
            {PRIMARY.map(({ id, label, Icon }) => {
              const isActive = id === activeTab;
              return (
                <li key={id} className="flex-1">
                  <button
                    type="button"
                    onClick={() => irA(id)}
                    className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px]"
                  >
                    <Icon className={`h-6 w-6 ${isActive ? "text-ink dark:text-ink-dark" : "text-ink-muted"}`} />
                    <span className={isActive ? "font-medium text-ink dark:text-ink-dark" : "text-ink-muted"}>{label}</span>
                  </button>
                </li>
              );
            })}
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setMostrarMas((v) => !v)}
                className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px]"
              >
                <IconMas className={`h-6 w-6 ${mostrarMas || enSecundarios ? "text-ink dark:text-ink-dark" : "text-ink-muted"}`} />
                <span className={mostrarMas || enSecundarios ? "font-medium text-ink dark:text-ink-dark" : "text-ink-muted"}>Más</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </MateriasProvider>
  );
}
