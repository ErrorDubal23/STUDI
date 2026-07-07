import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { SubjectDot, StateMessage, Card } from "./ui.jsx";
import { IconChevron } from "./Icons.jsx";

function formatFecha(fecha) {
  if (!fecha) return null;
  const d = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

function Modulo({ modulo, nivel = 0 }) {
  const [abierto, setAbierto] = useState(false);
  const tieneContenido = Boolean(modulo.descripcion) || modulo.hijos.length > 0;

  return (
    <div style={{ marginLeft: nivel * 14 }}>
      <button
        type="button"
        onClick={() => tieneContenido && setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 py-2 text-left"
        disabled={!tieneContenido}
      >
        <span className="truncate text-[13px]">{modulo.titulo}</span>
        {tieneContenido && (
          <IconChevron className={`h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform ${abierto ? "rotate-90" : ""}`} />
        )}
      </button>
      {abierto && (
        <div className="flex flex-col gap-1 pb-2 pl-1">
          {modulo.descripcion && <p className="text-[12px] text-ink-secondary dark:text-ink-dark-secondary">{modulo.descripcion}</p>}
          {modulo.hijos.map((hijo) => (
            <Modulo key={hijo.id} modulo={hijo} nivel={nivel + 1} />
          ))}
        </div>
      )}
    </div>
  );
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

  if (error) return <StateMessage>{error}</StateMessage>;
  if (!datos) return <StateMessage>Cargando Brightspace…</StateMessage>;
  if (datos.length === 0) return <StateMessage>Sin contenido de Brightspace todavía.</StateMessage>;

  return (
    <div className="flex flex-col gap-2.5">
      {datos.map((materia) => {
        const estaAbierto = abierto === materia.materia_id;
        const entregasOrdenadas = [...materia.entregas].sort((a, b) =>
          (a.fecha_entrega || "9999").localeCompare(b.fecha_entrega || "9999")
        );
        return (
          <Card key={materia.materia} className="p-0">
            <button
              type="button"
              onClick={() => setAbierto(estaAbierto ? null : materia.materia_id)}
              className="flex w-full items-center justify-between gap-2 p-4 text-left"
            >
              <span className="flex items-center gap-2 text-[14px] font-medium">
                <SubjectDot materiaId={materia.materia_id} />
                {materia.materia}
              </span>
              <span className="text-[12px] text-ink-muted">
                {materia.modulos.length > 0 && `${materia.modulos.length} módulos`}
                {materia.modulos.length > 0 && materia.entregas.length > 0 && " · "}
                {materia.entregas.length > 0 && `${materia.entregas.length} entregas`}
              </span>
            </button>

            {estaAbierto && (
              <div className="flex flex-col gap-4 border-t border-hairline px-4 py-3 dark:border-hairline-dark">
                {materia.modulos.length > 0 && (
                  <div>
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-muted">Módulos</p>
                    <div className="flex flex-col">
                      {materia.modulos.map((modulo) => (
                        <Modulo key={modulo.id} modulo={modulo} />
                      ))}
                    </div>
                  </div>
                )}

                {materia.entregas.length > 0 && (
                  <div>
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-muted">Entregas</p>
                    <div className="flex flex-col gap-2">
                      {entregasOrdenadas.map((entrega) => (
                        <div key={entrega.id} className="flex items-start justify-between gap-2 py-1.5 text-[13px]">
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate">{entrega.nombre}</span>
                            {entrega.archivos.length > 0 && (
                              <span className="truncate text-[11px] text-ink-muted">{entrega.archivos.join(", ")}</span>
                            )}
                          </div>
                          {entrega.fecha_entrega && (
                            <span className="shrink-0 text-[12px] text-ink-muted">{formatFecha(entrega.fecha_entrega)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {materia.modulos.length === 0 && materia.entregas.length === 0 && (
                  <p className="py-2 text-[13px] text-ink-muted">Sin contenido detectado en este archivo.</p>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
