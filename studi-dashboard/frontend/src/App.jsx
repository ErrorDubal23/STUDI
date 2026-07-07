import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import Fichas from "./components/Fichas.jsx";
import Calendario from "./components/Calendario.jsx";
import Repaso from "./components/Repaso.jsx";
import Grabacion from "./components/Grabacion.jsx";
import Brightspace from "./components/Brightspace.jsx";
import Login from "./components/Login.jsx";
import Materias from "./components/Materias.jsx";
import Talleres from "./components/Talleres.jsx";
import { AuthProvider, useAuth } from "./lib/AuthContext.jsx";
import { MateriasProvider } from "./lib/MateriasContext.jsx";
import { SPRING_SNAPPY, SPRING_SOFT, TAP_PRESS } from "./lib/motion.js";
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
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

function AuthGate() {
  const { usuario, cargando } = useAuth();
  if (cargando) return null;
  if (!usuario) return <Login />;
  return <AppShell />;
}

function AppShell() {
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
      <div className="relative flex min-h-screen flex-col bg-plane text-ink dark:bg-plane-dark dark:text-ink-dark">
        <div className="studi-noise-overlay" aria-hidden="true" />
        <header
          className="sticky top-0 z-10 border-b border-hairline bg-plane/90 backdrop-blur-sm dark:border-hairline-dark dark:bg-plane-dark/90 print:hidden"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-[15px] font-bold tracking-tight">
              STUDI<span className="text-[#2a78d6]">.</span>
            </span>
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink-secondary dark:text-ink-dark-secondary">
              <active.Icon className="h-4 w-4" />
              {active.label}
            </div>
          </div>
        </header>

        <main className="relative z-[1] flex-1 overflow-y-auto px-4 pb-24 pt-3">
          <ActiveComponent />
        </main>

        <AnimatePresence>
          {mostrarMas && (
            <>
              <motion.button
                key="backdrop"
                type="button"
                aria-label="Cerrar"
                onClick={() => setMostrarMas(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-10 bg-black/20 dark:bg-black/40"
              />
              <motion.div
                key="sheet"
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={(_e, info) => {
                  if (info.offset.y > 80 || info.velocity.y > 500) setMostrarMas(false);
                }}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={SPRING_SOFT}
                className="fixed inset-x-0 bottom-[64px] z-20 mx-auto max-w-lg px-3"
                style={{ marginBottom: "env(safe-area-inset-bottom)" }}
              >
                <div className="flex flex-col overflow-hidden rounded-2xl border border-hairline bg-surface shadow-card dark:border-hairline-dark dark:bg-surface-dark dark:shadow-card-dark">
                  <div className="flex justify-center pb-1 pt-2.5">
                    <span className="h-1 w-10 rounded-full bg-hairline dark:bg-hairline-dark" />
                  </div>
                  {SECUNDARIOS.map(({ id, label, Icon }) => (
                    <motion.button
                      key={id}
                      type="button"
                      whileTap={TAP_PRESS}
                      onClick={() => irA(id)}
                      className={`flex items-center gap-3 border-b border-hairline px-4 py-3 text-left text-[14px] last:border-b-0 dark:border-hairline-dark ${
                        id === activeTab ? "font-semibold" : ""
                      }`}
                    >
                      <Icon className="h-5 w-5 text-ink-muted" />
                      {label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <nav
          className="fixed inset-x-0 bottom-0 z-10 border-t border-hairline bg-surface/95 backdrop-blur-sm dark:border-hairline-dark dark:bg-surface-dark/95 print:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1">
            {PRIMARY.map(({ id, label, Icon }) => {
              const isActive = id === activeTab;
              return (
                <li key={id} className="relative flex-1">
                  <motion.button
                    type="button"
                    whileTap={TAP_PRESS}
                    onClick={() => irA(id)}
                    className="relative flex w-full flex-col items-center gap-1 py-2.5 text-[11px]"
                  >
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-bg"
                        transition={SPRING_SNAPPY}
                        className="absolute inset-x-2.5 inset-y-1 rounded-2xl bg-hairline dark:bg-hairline-dark"
                      />
                    )}
                    <span className="relative z-10 flex flex-col items-center gap-1">
                      <Icon className={`h-6 w-6 ${isActive ? "text-ink dark:text-ink-dark" : "text-ink-muted"}`} />
                      <span className={isActive ? "font-semibold text-ink dark:text-ink-dark" : "text-ink-muted"}>
                        {label}
                      </span>
                    </span>
                  </motion.button>
                </li>
              );
            })}
            <li className="relative flex-1">
              <motion.button
                type="button"
                whileTap={TAP_PRESS}
                onClick={() => setMostrarMas((v) => !v)}
                className="relative flex w-full flex-col items-center gap-1 py-2.5 text-[11px]"
              >
                {(mostrarMas || enSecundarios) && (
                  <motion.span
                    layoutId="nav-active-bg"
                    transition={SPRING_SNAPPY}
                    className="absolute inset-x-2.5 inset-y-1 rounded-2xl bg-hairline dark:bg-hairline-dark"
                  />
                )}
                <span className="relative z-10 flex flex-col items-center gap-1">
                  <IconMas className={`h-6 w-6 ${mostrarMas || enSecundarios ? "text-ink dark:text-ink-dark" : "text-ink-muted"}`} />
                  <span className={mostrarMas || enSecundarios ? "font-semibold text-ink dark:text-ink-dark" : "text-ink-muted"}>
                    Más
                  </span>
                </span>
              </motion.button>
            </li>
          </ul>
        </nav>
      </div>
    </MateriasProvider>
  );
}
