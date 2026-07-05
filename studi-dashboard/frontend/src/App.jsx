import { useState } from "react";
import Fichas from "./components/Fichas.jsx";
import Calendario from "./components/Calendario.jsx";
import Repaso from "./components/Repaso.jsx";
import Grabacion from "./components/Grabacion.jsx";
import Brightspace from "./components/Brightspace.jsx";
import { IconFichas, IconCalendario, IconRepaso, IconGrabar, IconBrightspace } from "./components/Icons.jsx";

const TABS = [
  { id: "repaso", label: "Repaso", Icon: IconRepaso, Component: Repaso },
  { id: "fichas", label: "Fichas", Icon: IconFichas, Component: Fichas },
  { id: "grabar", label: "Grabar", Icon: IconGrabar, Component: Grabacion },
  { id: "calendario", label: "Calendario", Icon: IconCalendario, Component: Calendario },
  { id: "brightspace", label: "Brightspace", Icon: IconBrightspace, Component: Brightspace },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("repaso");
  const active = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const ActiveComponent = active.Component;

  return (
    <div className="flex min-h-screen flex-col bg-plane text-ink dark:bg-plane-dark dark:text-ink-dark">
      <header
        className="sticky top-0 z-10 border-b border-hairline bg-plane/90 backdrop-blur-sm dark:border-hairline-dark dark:bg-plane-dark/90"
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

      <nav
        className="fixed inset-x-0 bottom-0 z-10 border-t border-hairline bg-surface/95 backdrop-blur-sm dark:border-hairline-dark dark:bg-surface-dark/95"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = id === activeTab;
            return (
              <li key={id} className="flex-1">
                <button
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px]"
                >
                  <Icon
                    className={`h-6 w-6 ${
                      isActive
                        ? "text-ink dark:text-ink-dark"
                        : "text-ink-muted"
                    }`}
                  />
                  <span
                    className={
                      isActive
                        ? "font-medium text-ink dark:text-ink-dark"
                        : "text-ink-muted"
                    }
                  >
                    {label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
