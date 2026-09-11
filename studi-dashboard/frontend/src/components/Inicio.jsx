import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { useMaterias, SUBJECT_FALLBACK } from "../lib/MateriasContext.jsx";
import { TAP_PRESS } from "../lib/motion.js";
import { conAlfa, tonoMasOscuro } from "../lib/visual.js";
import { Card, SubjectIconBadge, TagChip, StatTile } from "./ui.jsx";
import { pickIllustration } from "./Illustrations.jsx";
import { IconCheck, IconChevron, IconRepaso, IconFichas, IconTalleres, IconMaterias } from "./Icons.jsx";

// repaso_hoy.json shape can vary depending on how the scheduler wrote it —
// normalize the common possibilities into { materiaId, materiaNombre, temas, urgencia }.
function normalizeRepaso(data, materias) {
  if (!data) return [];
  const bloques = data.materias || data.items || data.temas || [];
  if (!Array.isArray(bloques)) return [];

  return bloques.map((bloque, idx) => {
    if (typeof bloque === "string") {
      return { key: `s-${idx}`, materiaId: SUBJECT_FALLBACK.id, materiaNombre: "General", temas: [bloque], urgencia: "normal" };
    }
    const materiaNombre = bloque.materia || bloque.nombre || bloque.materia_nombre || "General";
    const materiaId =
      bloque.materia_id ||
      materias.find((s) => s.nombre.toLowerCase() === String(materiaNombre).toLowerCase())?.id ||
      SUBJECT_FALLBACK.id;
    const temas = bloque.temas || bloque.temas_repaso || (bloque.tema ? [bloque.tema] : []);
    return { key: `${materiaId}-${idx}`, materiaId, materiaNombre, temas, urgencia: bloque.urgencia || "normal" };
  });
}

function BotonGenerar({ bloque, subject, enviando, yaEnviado, onGenerar, onVerTaller, variant = "pill" }) {
  const gradiente = `linear-gradient(135deg, ${subject.colorLight}, ${tonoMasOscuro(subject.colorLight, 0.32)})`;
  // Una vez generado, el boton pasa a ser la forma de LLEGAR al taller (no
  // queda deshabilitado ni es solo un aviso de texto) -- eso es justo lo que
  // faltaba: antes no habia manera de saber donde ver lo que se genero.
  const accion = yaEnviado ? onVerTaller : onGenerar;

  if (variant === "bloque") {
    return (
      <motion.button
        type="button"
        whileTap={enviando ? undefined : TAP_PRESS}
        disabled={enviando}
        onClick={accion}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left text-white disabled:opacity-80"
        style={{ background: yaEnviado ? "linear-gradient(135deg, #1baf7a, #0f8a5c)" : gradiente }}
      >
        <div>
          <p className="text-[15px] font-semibold">{yaEnviado ? "Taller listo" : enviando ? "Generando…" : "Generar taller"}</p>
          <p className="text-[12px] text-white/80">
            {yaEnviado ? "Ver taller" : "Crea un nuevo taller con los temas seleccionados"}
          </p>
        </div>
        {enviando ? (
          <motion.span
            className="h-4 w-4 shrink-0 rounded-full border-2 border-white/40 border-t-white"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
          />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
            {yaEnviado ? <IconCheck className="h-4 w-4" /> : <IconChevron className="h-4 w-4" />}
          </span>
        )}
      </motion.button>
    );
  }

  if (variant === "outline") {
    return (
      <motion.button
        type="button"
        whileTap={enviando ? undefined : TAP_PRESS}
        disabled={enviando}
        onClick={accion}
        className="flex w-full items-center justify-between gap-2 rounded-full border-[1.5px] px-4 py-2.5 text-left text-[13px] font-medium disabled:opacity-70"
        style={{ borderColor: conAlfa(subject.colorLight, 0.5), color: subject.colorLight }}
      >
        {yaEnviado ? "Ver taller" : enviando ? "Generando…" : "Generar taller"}
        {!enviando && <IconChevron className="h-4 w-4" />}
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      whileTap={enviando ? undefined : TAP_PRESS}
      disabled={enviando}
      onClick={accion}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-70"
      style={{ backgroundColor: yaEnviado ? "#0ca30c" : subject.colorLight }}
    >
      {yaEnviado ? (
        <>
          <IconCheck className="h-3.5 w-3.5" /> Ver taller
        </>
      ) : enviando ? (
        "Generando…"
      ) : (
        "Generar taller"
      )}
    </motion.button>
  );
}

function TarjetaDestacada({ bloque, subject, enviando, yaEnviado, onGenerar, onVerTaller, onNavegar, variante }) {
  const { Ilustracion, frase } = pickIllustration(bloque.materiaId);
  const conFondoTintado = variante === "secundaria";

  return (
    <Card
      className="relative overflow-hidden"
      style={
        conFondoTintado
          ? { background: `linear-gradient(160deg, ${conAlfa(subject.colorLight, 0.16)}, ${conAlfa(subject.colorLight, 0.05)})` }
          : undefined
      }
    >
      <Ilustracion
        className="pointer-events-none absolute -right-3 -bottom-4 h-28 w-32 opacity-[0.14]"
        style={{ color: subject.colorLight }}
      />
      <div className="relative z-[1] flex flex-col gap-3">
        <motion.button
          type="button"
          whileTap={onNavegar ? TAP_PRESS : undefined}
          onClick={onNavegar}
          className="flex items-center gap-3 text-left"
        >
          <SubjectIconBadge materiaId={bloque.materiaId} tone={conFondoTintado ? "tintada" : "oscura"} />
          <div className="min-w-0">
            <p className="truncate text-[16px] font-semibold">
              {subject.nombre !== SUBJECT_FALLBACK.nombre ? subject.nombre : bloque.materiaNombre}
            </p>
            <p className="text-[12px] text-ink-muted">
              {bloque.temas.length} {bloque.temas.length === 1 ? "tema" : "temas"} por repasar
            </p>
          </div>
        </motion.button>

        {bloque.temas.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {bloque.temas.map((tema, idx) => (
              <li key={tema}>
                <TagChip index={idx}>{tema}</TagChip>
              </li>
            ))}
          </ul>
        )}

        <p className="font-script text-[15px] leading-none text-ink-secondary dark:text-ink-dark-secondary">
          {frase}
        </p>

        <BotonGenerar
          bloque={bloque}
          subject={subject}
          enviando={enviando}
          yaEnviado={yaEnviado}
          onGenerar={onGenerar}
          onVerTaller={onVerTaller}
          variant={conFondoTintado ? "outline" : "bloque"}
        />
      </div>
    </Card>
  );
}

export default function Inicio({ onNavegar }) {
  const { usuario } = useAuth();
  const { materias } = useMaterias();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(null);
  const [enviados, setEnviados] = useState(new Set());
  const [tallerIds, setTallerIds] = useState({});
  const [actualizando, setActualizando] = useState(false);
  const [conteos, setConteos] = useState({ fichas: null, talleres: null });

  function cargarRepaso() {
    return api.repaso().then(setData).catch((err) => setError(err.message));
  }

  useEffect(() => {
    cargarRepaso();
    api.fichas().then((f) => setConteos((c) => ({ ...c, fichas: f.length }))).catch(() => {});
    api.talleres().then((t) => setConteos((c) => ({ ...c, talleres: t.length }))).catch(() => {});
  }, []);

  async function actualizar() {
    setActualizando(true);
    await cargarRepaso();
    setActualizando(false);
  }

  const bloques = useMemo(() => {
    const lista = normalizeRepaso(data, materias);
    // La materia con mas urgencia (y mas temas) sube primero -- prioridad
    // visual real, no solo una lista pareja.
    return [...lista].sort((a, b) => {
      if (a.urgencia !== b.urgencia) return a.urgencia === "alta" ? -1 : 1;
      return b.temas.length - a.temas.length;
    });
  }, [data, materias]);

  const totalTemas = useMemo(() => bloques.reduce((sum, b) => sum + b.temas.length, 0), [bloques]);
  const fraccionUrgente = bloques.length ? bloques.filter((b) => b.urgencia === "alta").length / bloques.length : 0;

  async function generarTaller(bloque) {
    setEnviando(bloque.key);
    try {
      const resultado = await api.generarTallerInteractivo(bloque.materiaId, bloque.temas);
      setEnviados((prev) => new Set(prev).add(bloque.key));
      setTallerIds((prev) => ({ ...prev, [bloque.key]: resultado.id }));
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(null);
    }
  }

  const primerNombre = (usuario?.nombre || "").split(" ")[0];

  // Solo las 2 materias con mas urgencia reciben la tarjeta grande con
  // ilustracion+frase -- mostrar esa misma tarjeta pesada para 4-5 materias
  // pendientes en un mismo dia se vuelve una pared repetitiva, no un
  // "vistoso" real. El resto cae en la grilla compacta de abajo.
  const [destacadas, resto] = [bloques.slice(0, 2), bloques.slice(2)];

  return (
    <div className="flex flex-col gap-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#fff2dd] via-[#ffe6cf] to-[#ffd8ba] p-5 dark:from-[#1c2620] dark:via-[#172019] dark:to-[#121a15]">
        <svg className="pointer-events-none absolute -right-8 -top-10 h-44 w-44 opacity-40" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.4" />
          <circle cx="100" cy="100" r="65" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.4" />
        </svg>

        <div className="relative z-[1] flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-ink-secondary dark:text-ink-dark-secondary">
              ¡Buenas vibras, {primerNombre || "estudiante"}!
            </p>
            <h1 className="mt-1 text-[22px] font-bold leading-[1.15] tracking-tight text-balance">
              Hoy también se construye lo que{" "}
              <span className="relative inline-block font-script text-[27px] font-normal text-[#0f6d5c] dark:text-[#5fd3ac]">
                quieres
                <svg
                  className="absolute -bottom-1 left-0 h-2 w-full text-[#0f6d5c] dark:text-[#5fd3ac]"
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                >
                  <path d="M1 5.5C20 2 55 1 99 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              .
            </h1>
          </div>

          <motion.button
            type="button"
            whileTap={TAP_PRESS}
            onClick={actualizar}
            disabled={actualizando}
            aria-label="Actualizar repaso de hoy"
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-[12px] font-medium text-ink shadow-sm dark:bg-black/25 dark:text-ink-dark"
          >
            <motion.span animate={actualizando ? { rotate: 360 } : {}} transition={{ repeat: actualizando ? Infinity : 0, duration: 0.8, ease: "linear" }}>
              <IconRepaso className="h-3.5 w-3.5" />
            </motion.span>
            Repaso
          </motion.button>
        </div>

        <div className="relative z-[1] mt-5 flex items-end justify-between gap-3">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full -rotate-90">
              <circle cx="40" cy="40" r="34" fill="none" strokeWidth="6" stroke="#ffffff" strokeOpacity="0.5" />
              <motion.circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                strokeWidth="6"
                strokeLinecap="round"
                stroke="#0f6d5c"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: bloques.length ? Math.max(fraccionUrgente, 0.06) : 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="dark:stroke-[#5fd3ac]"
              />
            </svg>
            <div className="flex flex-col items-center">
              <span className="text-[26px] font-bold leading-none tracking-tight">{totalTemas}</span>
              <span className="text-[9px] uppercase tracking-[0.1em] text-ink-muted">temas</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl bg-white/70 p-3 shadow-sm dark:bg-black/25">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#2a78d6] dark:bg-white/10">
                <IconMaterias className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-[13px] font-bold leading-none">{bloques.length}</p>
                <p className="text-[10px] text-ink-muted">{bloques.length === 1 ? "materia" : "materias"} pendientes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#c07d1a] dark:bg-white/10">
                <IconRepaso className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-[13px] font-bold leading-none">{totalTemas}</p>
                <p className="text-[10px] text-ink-muted">temas por repasar</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-center text-[13px] text-[#d03b3b]">{error}</p>}

      {!error && !data && <p className="px-1 text-[13px] text-ink-muted">Cargando repaso de hoy…</p>}

      {data && bloques.length === 0 && (
        <p className="px-1 text-[13px] text-ink-muted">No hay repaso programado para hoy.</p>
      )}

      {destacadas.map((bloque, idx) => {
        const subject = materias.find((m) => m.id === bloque.materiaId) || SUBJECT_FALLBACK;
        return (
          <TarjetaDestacada
            key={bloque.key}
            bloque={bloque}
            subject={subject}
            enviando={enviando === bloque.key}
            yaEnviado={enviados.has(bloque.key)}
            onGenerar={() => generarTaller(bloque)}
            onVerTaller={onNavegar ? () => onNavegar("talleres", { tallerId: tallerIds[bloque.key] }) : undefined}
            onNavegar={onNavegar ? () => onNavegar("materias") : undefined}
            variante={idx === 0 ? "principal" : "secundaria"}
          />
        );
      })}

      {resto.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          {resto.map((bloque) => {
            const subject = materias.find((m) => m.id === bloque.materiaId) || SUBJECT_FALLBACK;
            return (
              <Card key={bloque.key} className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <SubjectIconBadge materiaId={bloque.materiaId} className="h-8 w-8" />
                  <p className="min-w-0 truncate text-[12.5px] font-semibold">
                    {subject.nombre !== SUBJECT_FALLBACK.nombre ? subject.nombre : bloque.materiaNombre}
                  </p>
                </div>
                <p className="text-[11px] text-ink-muted">
                  {bloque.temas.length} {bloque.temas.length === 1 ? "tema" : "temas"}
                </p>
                <BotonGenerar
                  bloque={bloque}
                  subject={subject}
                  enviando={enviando === bloque.key}
                  yaEnviado={enviados.has(bloque.key)}
                  onGenerar={() => generarTaller(bloque)}
                  onVerTaller={onNavegar ? () => onNavegar("talleres", { tallerId: tallerIds[bloque.key] }) : undefined}
                  variant="pill"
                />
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatTile icon={IconMaterias} label="Materias" value={materias.length} color="#2a78d6" />
        <StatTile icon={IconFichas} label="Fichas" value={conteos.fichas ?? "—"} color="#1baf7a" />
        <StatTile icon={IconTalleres} label="Talleres" value={conteos.talleres ?? "—"} color="#7448c4" />
        <StatTile icon={IconRepaso} label="Hoy" value={totalTemas} color="#c07d1a" />
      </div>
    </div>
  );
}
