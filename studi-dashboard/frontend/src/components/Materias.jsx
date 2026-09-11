import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { useMaterias } from "../lib/MateriasContext.jsx";
import { SPRING_SNAPPY, SPRING_SOFT, TAP_PRESS } from "../lib/motion.js";
import { siguienteColorMateria } from "../lib/visual.js";
import { SubjectIconBadge, Card, Accordion, StateMessage } from "./ui.jsx";
import { IconTrash, IconPlus, IconChevron } from "./Icons.jsx";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const TIPOS_CORTE = [
  { id: "parcial", label: "Parcial" },
  { id: "laboratorio", label: "Laboratorio" },
  { id: "actividad", label: "Actividad en clase" },
  { id: "otro", label: "Otro" },
];

const inputClass =
  "w-full rounded-xl border border-hairline bg-transparent px-3 py-2 text-[14px] dark:border-hairline-dark dark:text-ink-dark";

function vacia(materiasExistentes) {
  const color = siguienteColorMateria(materiasExistentes);
  return {
    nombre: "",
    codigo: "",
    nrc: "",
    profesor: "",
    color_light: color.light,
    color_dark: color.dark,
    horario: [],
    cortes: [],
    es_extracurricular: false,
  };
}

// Seccion plegable liviana (sin el Card/borde de <Accordion>, que aca
// dentro de un formulario ya anidado en una tarjeta se ve como "caja
// dentro de caja") -- solo para lo opcional/menos usado (Cortes).
function SeccionPlegable({ titulo, subtitulo, abierta, onToggle, children }) {
  return (
    <div>
      <motion.button
        type="button"
        whileTap={TAP_PRESS}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 py-1 text-left"
      >
        <div>
          <span className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">{titulo}</span>
          {subtitulo && <p className="text-[11px] text-ink-muted">{subtitulo}</p>}
        </div>
        <motion.span animate={{ rotate: abierta ? 90 : 0 }} transition={SPRING_SNAPPY}>
          <IconChevron className="h-3.5 w-3.5 text-ink-muted" />
        </motion.span>
      </motion.button>
      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING_SOFT}
            className="overflow-hidden"
          >
            <div className="pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GenerarDescargableBoton({ materiaId, corte }) {
  const [estado, setEstado] = useState("idle"); // idle | generando | listo | error
  const [mensaje, setMensaje] = useState(null);
  const listoParaGenerar = Boolean(corte.fecha_inicio && corte.fecha_fin);

  async function generar() {
    setEstado("generando");
    setMensaje(null);
    try {
      await api.generarTallerDescargable(materiaId, corte.id);
      setEstado("listo");
      setMensaje("Listo — búscalo en la pestaña Talleres.");
    } catch (err) {
      setEstado("error");
      setMensaje(err.message);
    }
  }

  return (
    <div className="mt-1">
      <motion.button
        type="button"
        whileTap={estado === "generando" || !listoParaGenerar ? undefined : TAP_PRESS}
        disabled={estado === "generando" || !listoParaGenerar}
        onClick={generar}
        className="rounded-full border border-hairline px-3 py-1.5 text-[12px] text-ink-secondary disabled:opacity-50 dark:border-hairline-dark dark:text-ink-dark-secondary"
      >
        {estado === "generando" ? "Generando…" : "Generar taller descargable"}
      </motion.button>
      {!listoParaGenerar && (
        <p className="mt-1 text-[11px] text-ink-muted">Necesita fecha de inicio y fin para saber qué temas incluir.</p>
      )}
      {mensaje && (
        <p className={`mt-1 text-[11px] ${estado === "error" ? "text-[#d03b3b]" : "text-[#0ca30c]"}`}>{mensaje}</p>
      )}
    </div>
  );
}

function MateriaForm({ materiaId, inicial, onGuardar, onCancelar, onBorrar, guardando }) {
  const [form, setForm] = useState(inicial);
  const [cortesAbiertos, setCortesAbiertos] = useState(false);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function agregarHorario() {
    set("horario", [...form.horario, { dia: "Lunes", hora_inicio: "08:00", hora_fin: "10:00" }]);
  }
  function editarHorario(idx, campo, valor) {
    const copia = form.horario.map((h, i) => (i === idx ? { ...h, [campo]: valor } : h));
    set("horario", copia);
  }
  function quitarHorario(idx) {
    set("horario", form.horario.filter((_, i) => i !== idx));
  }

  function agregarCorte() {
    set("cortes", [
      ...form.cortes,
      { id: `corte-${Date.now()}`, nombre: `Corte ${form.cortes.length + 1}`, tipo: "parcial", fecha_inicio: "", fecha_fin: "", peso: "" },
    ]);
  }
  function editarCorte(idx, campo, valor) {
    const copia = form.cortes.map((c, i) => (i === idx ? { ...c, [campo]: valor } : c));
    set("cortes", copia);
  }
  function quitarCorte(idx) {
    set("cortes", form.cortes.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-[12px] text-ink-muted">
        Nombre *
        <input className={inputClass} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej. Algoritmos y Complejidad" />
      </label>

      <label className="flex flex-col gap-1 text-[12px] text-ink-muted">
        Profesor
        <input className={inputClass} value={form.profesor} onChange={(e) => set("profesor", e.target.value)} placeholder="Opcional" />
      </label>

      <label className="flex items-center gap-2 text-[13px]">
        <input type="checkbox" checked={form.es_extracurricular} onChange={(e) => set("es_extracurricular", e.target.checked)} />
        Es una actividad extracurricular (sin cortes)
      </label>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">Horario</span>
          <motion.button type="button" whileTap={TAP_PRESS} onClick={agregarHorario} className="flex items-center gap-1 text-[12px] text-ink-secondary dark:text-ink-dark-secondary">
            <IconPlus className="h-3.5 w-3.5" /> Agregar bloque
          </motion.button>
        </div>
        <div className="flex flex-col gap-2">
          {form.horario.map((bloque, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select className={inputClass} value={bloque.dia} onChange={(e) => editarHorario(idx, "dia", e.target.value)}>
                {DIAS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <input type="time" className={inputClass} value={bloque.hora_inicio} onChange={(e) => editarHorario(idx, "hora_inicio", e.target.value)} />
              <input type="time" className={inputClass} value={bloque.hora_fin} onChange={(e) => editarHorario(idx, "hora_fin", e.target.value)} />
              <motion.button type="button" whileTap={TAP_PRESS} onClick={() => quitarHorario(idx)} className="shrink-0 text-ink-muted">
                <IconTrash className="h-4 w-4" />
              </motion.button>
            </div>
          ))}
          {form.horario.length === 0 && <p className="text-[12px] text-ink-muted">Sin bloques de horario todavía.</p>}
        </div>
      </div>

      {!form.es_extracurricular && (
        <SeccionPlegable
          titulo="Cortes y fechas"
          subtitulo={
            form.cortes.length > 0
              ? `${form.cortes.length} ${form.cortes.length === 1 ? "corte definido" : "cortes definidos"}`
              : "Opcional — solo hace falta cuando quieras un taller descargable por corte"
          }
          abierta={cortesAbiertos}
          onToggle={() => setCortesAbiertos((v) => !v)}
        >
          <div className="mb-2 flex justify-end">
            <motion.button type="button" whileTap={TAP_PRESS} onClick={agregarCorte} className="flex items-center gap-1 text-[12px] text-ink-secondary dark:text-ink-dark-secondary">
              <IconPlus className="h-3.5 w-3.5" /> Agregar corte
            </motion.button>
          </div>
          <div className="flex flex-col gap-3">
            {form.cortes.map((corte, idx) => (
              <div key={corte.id} className="flex flex-col gap-2 rounded-xl border border-hairline p-3 dark:border-hairline-dark">
                <div className="flex items-center gap-2">
                  <input className={inputClass} value={corte.nombre} onChange={(e) => editarCorte(idx, "nombre", e.target.value)} placeholder="Nombre del corte" />
                  <motion.button type="button" whileTap={TAP_PRESS} onClick={() => quitarCorte(idx)} className="shrink-0 text-ink-muted">
                    <IconTrash className="h-4 w-4" />
                  </motion.button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select className={inputClass} value={corte.tipo} onChange={(e) => editarCorte(idx, "tipo", e.target.value)}>
                    {TIPOS_CORTE.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                  <input className={inputClass} value={corte.peso || ""} onChange={(e) => editarCorte(idx, "peso", e.target.value)} placeholder="Peso (ej. 30%, opcional)" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" className={inputClass} value={corte.fecha_inicio || ""} onChange={(e) => editarCorte(idx, "fecha_inicio", e.target.value)} />
                  <input type="date" className={inputClass} value={corte.fecha_fin || ""} onChange={(e) => editarCorte(idx, "fecha_fin", e.target.value)} />
                </div>
                {materiaId && <GenerarDescargableBoton materiaId={materiaId} corte={corte} />}
              </div>
            ))}
            {form.cortes.length === 0 && <p className="text-[12px] text-ink-muted">Sin cortes definidos todavía.</p>}
          </div>
        </SeccionPlegable>
      )}

      <div className="flex items-center justify-between pt-1">
        {onBorrar ? (
          <motion.button type="button" whileTap={TAP_PRESS} onClick={onBorrar} className="text-[13px] text-[#d03b3b]">
            Borrar materia
          </motion.button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <motion.button type="button" whileTap={TAP_PRESS} onClick={onCancelar} className="rounded-full border border-hairline px-4 py-2 text-[13px] text-ink-secondary dark:border-hairline-dark dark:text-ink-dark-secondary">
            Cancelar
          </motion.button>
          <motion.button
            type="button"
            whileTap={guardando || !form.nombre.trim() ? undefined : TAP_PRESS}
            disabled={guardando || !form.nombre.trim()}
            onClick={() => onGuardar(form)}
            className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60 dark:bg-ink-dark dark:text-plane-dark"
          >
            {guardando ? "Guardando…" : "Guardar"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function resumenHorario(horario) {
  if (!horario || horario.length === 0) return "Sin horario";
  return horario.map((h) => `${h.dia} ${h.hora_inicio}-${h.hora_fin}`).join(" · ");
}

function MateriaItem({ materia, abierta, onToggle, guardando, onGuardar, onCancelar, onBorrar }) {
  return (
    <Accordion
      open={abierta}
      onToggle={onToggle}
      accentColor={materia.colorLight}
      header={
        <div className="flex min-w-0 items-center gap-3">
          <SubjectIconBadge materiaId={materia.id} className="h-9 w-9" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[14px] font-semibold">{materia.nombre}</span>
            {materia.profesor && <span className="text-[12px] text-ink-muted">{materia.profesor}</span>}
            <span className="text-[12px] text-ink-muted">{resumenHorario(materia.horario)}</span>
          </div>
        </div>
      }
    >
      <MateriaForm
        materiaId={materia.id}
        inicial={{
          nombre: materia.nombre,
          codigo: materia.codigo,
          nrc: materia.nrc,
          profesor: materia.profesor,
          color_light: materia.colorLight,
          color_dark: materia.colorDark,
          horario: materia.horario,
          cortes: materia.cortes,
          es_extracurricular: materia.esExtracurricular,
        }}
        guardando={guardando}
        onGuardar={onGuardar}
        onCancelar={onCancelar}
        onBorrar={onBorrar}
      />
    </Accordion>
  );
}

export default function Materias() {
  const { usuario, logout } = useAuth();
  const { materias, loading, error, crear, editar, borrar, nuevoSemestre } = useMaterias();
  const [abierta, setAbierta] = useState(null); // id de materia en edicion, o "__nueva__"
  const [guardando, setGuardando] = useState(false);
  const [avisoSemestre, setAvisoSemestre] = useState(false);

  if (error) return <StateMessage>{error}</StateMessage>;
  if (loading) return <StateMessage>Cargando materias…</StateMessage>;

  async function handleGuardarNueva(form) {
    setGuardando(true);
    try {
      await crear(form);
      setAbierta(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function handleGuardarEdicion(id, form) {
    setGuardando(true);
    try {
      await editar(id, form);
      setAbierta(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function handleBorrar(id) {
    if (!confirm("¿Borrar esta materia? Las fichas y talleres ya guardados no se eliminan.")) return;
    await borrar(id);
    setAbierta(null);
  }

  async function handleNuevoSemestre() {
    const etiqueta = prompt("Etiqueta para archivar el semestre actual (ej. 2026-1):");
    if (!etiqueta) return;
    await nuevoSemestre(etiqueta);
    setAvisoSemestre(false);
  }

  const regulares = materias.filter((m) => !m.esExtracurricular);
  const extra = materias.filter((m) => m.esExtracurricular);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <motion.button
          type="button"
          whileTap={TAP_PRESS}
          onClick={() => setAbierta("__nueva__")}
          className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white dark:bg-ink-dark dark:text-plane-dark"
        >
          <IconPlus className="h-4 w-4" /> Agregar materia
        </motion.button>
        <motion.button
          type="button"
          whileTap={TAP_PRESS}
          onClick={() => setAvisoSemestre(true)}
          className="rounded-full border border-hairline px-4 py-2 text-[13px] text-ink-secondary dark:border-hairline-dark dark:text-ink-dark-secondary"
        >
          Nuevo semestre
        </motion.button>
      </div>

      {avisoSemestre && (
        <Card className="flex flex-col gap-2 border-[#d03b3b]/40">
          <p className="text-[13px]">
            Esto archiva la lista actual de materias y empieza una vacía. Tus fichas y talleres ya guardados no se
            tocan.
          </p>
          <div className="flex justify-end gap-2">
            <motion.button type="button" whileTap={TAP_PRESS} onClick={() => setAvisoSemestre(false)} className="rounded-full border border-hairline px-3 py-1.5 text-[12px] dark:border-hairline-dark">
              Cancelar
            </motion.button>
            <motion.button type="button" whileTap={TAP_PRESS} onClick={handleNuevoSemestre} className="rounded-full bg-[#d03b3b] px-3 py-1.5 text-[12px] font-medium text-white">
              Confirmar
            </motion.button>
          </div>
        </Card>
      )}

      {abierta === "__nueva__" && (
        <Card>
          <MateriaForm inicial={vacia(materias)} guardando={guardando} onGuardar={handleGuardarNueva} onCancelar={() => setAbierta(null)} />
        </Card>
      )}

      <div className="flex flex-col gap-2.5">
        {regulares.map((materia) => (
          <MateriaItem
            key={materia.id}
            materia={materia}
            abierta={abierta === materia.id}
            onToggle={() => setAbierta(abierta === materia.id ? null : materia.id)}
            guardando={guardando}
            onGuardar={(form) => handleGuardarEdicion(materia.id, form)}
            onCancelar={() => setAbierta(null)}
            onBorrar={() => handleBorrar(materia.id)}
          />
        ))}
        {regulares.length === 0 && <StateMessage>Todavía no hay materias — agrega la primera.</StateMessage>}
      </div>

      {extra.length > 0 && (
        <div>
          <p className="mb-2 mt-2 text-[10px] uppercase tracking-[0.14em] text-ink-muted">Extracurriculares</p>
          <div className="flex flex-col gap-2.5">
            {extra.map((materia) => (
              <MateriaItem
                key={materia.id}
                materia={materia}
                abierta={abierta === materia.id}
                onToggle={() => setAbierta(abierta === materia.id ? null : materia.id)}
                guardando={guardando}
                onGuardar={(form) => handleGuardarEdicion(materia.id, form)}
                onCancelar={() => setAbierta(null)}
                onBorrar={() => handleBorrar(materia.id)}
              />
            ))}
          </div>
        </div>
      )}

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium">{usuario?.nombre}</p>
          <p className="text-[12px] text-ink-muted">@{usuario?.usuario}</p>
        </div>
        <motion.button
          type="button"
          whileTap={TAP_PRESS}
          onClick={logout}
          className="rounded-full border border-hairline px-4 py-2 text-[13px] text-ink-secondary dark:border-hairline-dark dark:text-ink-dark-secondary"
        >
          Cerrar sesión
        </motion.button>
      </Card>
    </div>
  );
}
