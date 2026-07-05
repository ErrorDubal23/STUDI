import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import { SubjectDot, StateMessage, Card } from "./ui.jsx";
import { IconLink } from "./Icons.jsx";

// Brightspace JSON exports can be structured in a few different ways
// depending on what studi-brightspace scraped — normalize defensively.
function extraerModulos(contenido) {
  const crudos = Array.isArray(contenido)
    ? contenido
    : contenido?.modulos || contenido?.modules || contenido?.contenidos || Object.values(contenido ?? {}).find(Array.isArray) || [];

  return crudos
    .filter((m) => m && typeof m === "object")
    .map((m, idx) => ({
      key: idx,
      titulo: m.titulo || m.title || m.nombre || m.name || "Módulo sin título",
      url: m.url || m.link || m.enlace || m.href || null,
      tipo: m.tipo || m.type || null,
    }));
}

export default function Brightspace() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [abierto, setAbierto] = useState(null);

  useEffect(() => {
    api
      .brightspace()
      .then((res) => {
        setDatos(res);
        setAbierto(res[0]?.materia_id ?? null);
      })
      .catch((err) => setError(err.message));
  }, []);

  const conModulos = useMemo(
    () => (datos ?? []).map((d) => ({ ...d, modulos: extraerModulos(d.contenido) })),
    [datos]
  );

  if (error) return <StateMessage>{error}</StateMessage>;
  if (!datos) return <StateMessage>Cargando Brightspace…</StateMessage>;
  if (datos.length === 0) return <StateMessage>Sin contenido de Brightspace todavía.</StateMessage>;

  return (
    <div className="flex flex-col gap-2.5">
      {conModulos.map((materia) => {
        const estaAbierto = abierto === materia.materia_id;
        return (
          <Card key={materia.archivo} className="p-0">
            <button
              type="button"
              onClick={() => setAbierto(estaAbierto ? null : materia.materia_id)}
              className="flex w-full items-center justify-between gap-2 p-4 text-left"
            >
              <span className="flex items-center gap-2 text-[14px] font-medium">
                <SubjectDot materiaId={materia.materia_id} />
                {materia.materia}
              </span>
              <span className="text-[12px] text-ink-muted">{materia.modulos.length} módulos</span>
            </button>

            {estaAbierto && (
              <div className="flex flex-col gap-1 border-t border-hairline px-4 py-3 dark:border-hairline-dark">
                {materia.modulos.length === 0 ? (
                  <p className="py-2 text-[13px] text-ink-muted">Sin módulos detectados en este archivo.</p>
                ) : (
                  materia.modulos.map((mod) =>
                    mod.url ? (
                      <a
                        key={mod.key}
                        href={mod.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-2 rounded-lg py-2.5 text-[13px]"
                      >
                        <span className="truncate">{mod.titulo}</span>
                        <IconLink className="h-4 w-4 shrink-0 text-ink-muted" />
                      </a>
                    ) : (
                      <div key={mod.key} className="py-2.5 text-[13px]">
                        {mod.titulo}
                      </div>
                    )
                  )
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
