import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import { useMaterias } from "../lib/MateriasContext.jsx";
import { SPRING_SNAPPY, TAP_PRESS } from "../lib/motion.js";
import { SubjectDot, StateMessage, Card } from "./ui.jsx";

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];
const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const VISTAS = [
  { id: "mes", label: "Mes" },
  { id: "semana", label: "Horario semanal" },
];

// Horario is recurring by day-of-week (from cada materia.horario), not tied
// to a specific calendar date -- se agrupa por dia, no por semana navegable.
function buildHorarioSemanal(materias) {
  const porDia = new Map(DIAS_SEMANA.map((d) => [d, []]));
  for (const materia of materias) {
    for (const bloque of materia.horario ?? []) {
      if (!porDia.has(bloque.dia)) continue;
      porDia.get(bloque.dia).push({
        materiaId: materia.id,
        nombre: materia.nombre,
        color: materia.colorLight,
        horaInicio: bloque.hora_inicio,
        horaFin: bloque.hora_fin,
      });
    }
  }
  for (const lista of porDia.values()) {
    lista.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  }
  return porDia;
}

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
  const { materias } = useMaterias();
  const [vista, setVista] = useState("mes"); // mes | semana
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

  const horarioSemanal = useMemo(() => buildHorarioSemanal(materias), [materias]);
  const celdas = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const eventosDelDia = eventosPorFecha.get(seleccionado) ?? [];
  const todayISO = toISO(today);
  const hoyNombreDia = DIAS_SEMANA[(today.getDay() + 6) % 7];

  function cambiarMes(delta) {
    const next = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  }

  if (error) return <StateMessage>{error}</StateMessage>;

  return (
    <div>
      <div className="-mx-4 mb-4 flex gap-1 overflow-x-auto px-4 pb-1">
        {VISTAS.map((op) => (
          <motion.button
            key={op.id}
            type="button"
            whileTap={TAP_PRESS}
            onClick={() => setVista(op.id)}
            className="relative shrink-0 overflow-hidden rounded-full px-3.5 py-1.5 text-[13px] font-medium"
          >
            {vista === op.id && (
              <motion.span
                layoutId="calendario-toggle-bg"
                transition={SPRING_SNAPPY}
                className="absolute inset-0 rounded-full bg-ink dark:bg-ink-dark"
              />
            )}
            <span className={`relative z-10 ${vista === op.id ? "text-white dark:text-plane-dark" : "text-ink-secondary dark:text-ink-dark-secondary"}`}>
              {op.label}
            </span>
          </motion.button>
        ))}
      </div>

      {vista === "semana" && (
        <div className="flex flex-col gap-4">
          {DIAS_SEMANA.map((dia) => {
            const bloques = horarioSemanal.get(dia) ?? [];
            return (
              <div key={dia}>
                <p
                  className={`mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] ${
                    dia === hoyNombreDia ? "text-ink dark:text-ink-dark" : "text-ink-muted"
                  }`}
                >
                  {dia} {dia === hoyNombreDia && "· Hoy"}
                </p>
                {bloques.length === 0 ? (
                  <p className="text-[13px] text-ink-muted">Sin clases.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {bloques.map((b, idx) => (
                      <motion.div
                        key={idx}
                        whileTap={TAP_PRESS}
                        className="flex items-center gap-2.5 rounded-2xl border p-3 shadow-card dark:shadow-card-dark"
                        style={{ backgroundColor: `${b.color}1f`, borderColor: `${b.color}55` }}
                      >
                        <SubjectDot materiaId={b.materiaId} />
                        <span className="flex-1 truncate text-[13px] font-medium">{b.nombre}</span>
                        <span className="text-[12px] tabular-nums text-ink-muted">
                          {b.horaInicio}–{b.horaFin}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {vista === "mes" && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <motion.button
              type="button"
              whileTap={TAP_PRESS}
              onClick={() => cambiarMes(-1)}
              className="rounded-full px-3 py-1 text-[15px] text-ink-secondary dark:text-ink-dark-secondary"
            >
              ‹
            </motion.button>
            <span className="text-[15px] font-semibold capitalize">
              {MESES[cursor.month]} {cursor.year}
            </span>
            <motion.button
              type="button"
              whileTap={TAP_PRESS}
              onClick={() => cambiarMes(1)}
              className="rounded-full px-3 py-1 text-[15px] text-ink-secondary dark:text-ink-dark-secondary"
            >
              ›
            </motion.button>
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
                  className="relative flex flex-col items-center gap-0.5 rounded-xl py-1.5"
                >
                  {esSeleccionado && (
                    <motion.span
                      layoutId="calendario-dia-bg"
                      transition={SPRING_SNAPPY}
                      className="absolute inset-0 rounded-xl bg-hairline dark:bg-hairline-dark"
                    />
                  )}
                  <span
                    className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-[13px] ${
                      esHoy ? "bg-ink text-white dark:bg-ink-dark dark:text-plane-dark" : ""
                    }`}
                  >
                    {fecha.getDate()}
                  </span>
                  <span className="relative z-10 flex h-1.5 gap-0.5">
                    {eventosDia.slice(0, 3).map((ev, idx) => (
                      <SubjectDot key={idx} materiaId={ev.materia_id} className="h-1.5 w-1.5" />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[13px] font-semibold">
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
        </>
      )}
    </div>
  );
}
