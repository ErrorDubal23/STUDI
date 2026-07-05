import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import { SubjectDot, StateMessage, Card } from "./ui.jsx";

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function toISO(d) {
  return d.toISOString().slice(0, 10);
}

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function Calendario() {
  const [eventos, setEventos] = useState(null);
  const [error, setError] = useState(null);
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [seleccionado, setSeleccionado] = useState(toISO(today));

  useEffect(() => {
    api
      .calendario()
      .then(setEventos)
      .catch((err) => setError(err.message));
  }, []);

  const eventosPorFecha = useMemo(() => {
    const map = new Map();
    for (const ev of eventos ?? []) {
      if (!map.has(ev.fecha)) map.set(ev.fecha, []);
      map.get(ev.fecha).push(ev);
    }
    return map;
  }, [eventos]);

  const celdas = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const eventosDelDia = eventosPorFecha.get(seleccionado) ?? [];
  const todayISO = toISO(today);

  function cambiarMes(delta) {
    const next = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  }

  if (error) return <StateMessage>{error}</StateMessage>;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => cambiarMes(-1)}
          className="rounded-full px-3 py-1 text-[15px] text-ink-secondary dark:text-ink-dark-secondary"
        >
          ‹
        </button>
        <span className="text-[14px] font-medium capitalize">
          {MESES[cursor.month]} {cursor.year}
        </span>
        <button
          type="button"
          onClick={() => cambiarMes(1)}
          className="rounded-full px-3 py-1 text-[15px] text-ink-secondary dark:text-ink-dark-secondary"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {DIAS.map((d) => (
          <span key={d} className="text-[11px] text-ink-muted">
            {d}
          </span>
        ))}
        {celdas.map((fecha, i) => {
          if (!fecha) return <span key={i} />;
          const iso = toISO(fecha);
          const eventosDia = eventosPorFecha.get(iso) ?? [];
          const esHoy = iso === todayISO;
          const esSeleccionado = iso === seleccionado;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => setSeleccionado(iso)}
              className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 ${
                esSeleccionado ? "bg-hairline dark:bg-hairline-dark" : ""
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] ${
                  esHoy ? "bg-ink text-white dark:bg-ink-dark dark:text-plane-dark" : ""
                }`}
              >
                {fecha.getDate()}
              </span>
              <span className="flex h-1.5 gap-0.5">
                {eventosDia.slice(0, 3).map((ev, idx) => (
                  <SubjectDot key={idx} materiaId={ev.materia_id} className="h-1.5 w-1.5" />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[13px] font-medium">
          {new Date(`${seleccionado}T00:00:00`).toLocaleDateString("es-CO", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        {!eventos ? (
          <StateMessage>Cargando calendario…</StateMessage>
        ) : eventosDelDia.length === 0 ? (
          <p className="text-[13px] text-ink-muted">Sin eventos este día.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {eventosDelDia.map((ev, idx) => (
              <Card key={idx} className="flex items-start gap-2.5">
                <SubjectDot materiaId={ev.materia_id} className="mt-1 h-2.5 w-2.5" />
                <div className="flex min-w-0 flex-col">
                  <span className="text-[13px] font-medium">{ev.titulo}</span>
                  <span className="text-[12px] text-ink-muted">
                    {ev.materia} · {ev.tipo === "clase" ? "Clase" : ev.tipo === "brightspace" ? "Entrega Brightspace" : "Fecha mencionada"}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
