// Ilustraciones de linea (SVG a mano, sin fotos ni emoji) para acompañar las
// tarjetas destacadas de Inicio. Cada indice corresponde al mismo indice de
// ICONOS_MATERIA en Icons.jsx, con una frase corta emparejada -- asi la
// materia que recibe el icono de "red" siempre recibe la misma ilustracion
// y frase, en vez de una combinacion aleatoria en cada carga.
import { hashTexto } from "../lib/visual.js";

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 120 100",
};

function IlustracionRed({ className, style }) {
  return (
    <svg className={className} style={style} {...base}>
      <circle cx="30" cy="30" r="7" />
      <circle cx="88" cy="24" r="7" />
      <circle cx="60" cy="70" r="7" />
      <circle cx="98" cy="66" r="4.5" />
      <path d="M36 34 55 64M82 30 65 62M37 28 81 25" strokeDasharray="1 7" />
    </svg>
  );
}

function IlustracionBarras({ className, style }) {
  return (
    <svg className={className} style={style} {...base}>
      <path d="M14 82V56M40 82V40M66 82V60M92 82V22" />
      <path d="M14 58 40 42l26 20L92 24" />
      <circle cx="92" cy="24" r="4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IlustracionCodigo({ className, style }) {
  return (
    <svg className={className} style={style} {...base}>
      <path d="M46 26 26 50l20 24M74 26l20 24-20 24" />
      <path d="M62 20 58 80" strokeDasharray="1 6" />
    </svg>
  );
}

function IlustracionAtomo({ className, style }) {
  return (
    <svg className={className} style={style} {...base}>
      <circle cx="60" cy="50" r="5" fill="currentColor" stroke="none" />
      <ellipse cx="60" cy="50" rx="42" ry="16" />
      <ellipse cx="60" cy="50" rx="42" ry="16" transform="rotate(58 60 50)" />
      <ellipse cx="60" cy="50" rx="42" ry="16" transform="rotate(-58 60 50)" />
    </svg>
  );
}

function IlustracionBrujula({ className, style }) {
  return (
    <svg className={className} style={style} {...base}>
      <circle cx="60" cy="50" r="34" />
      <path d="M74 34 64 56l-24 12 12-24z" />
      <circle cx="60" cy="16" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="60" cy="84" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IlustracionLibro({ className, style }) {
  return (
    <svg className={className} style={style} {...base}>
      <path d="M60 32c-9-7-24-9-42-7v46c18-2 33 1 42 8 9-7 24-10 42-8V25c-18-2-33 0-42 7Z" />
      <path d="M60 32v46" />
    </svg>
  );
}

function IlustracionCapas({ className, style }) {
  return (
    <svg className={className} style={style} {...base}>
      <path d="M60 18 100 38 60 58 20 38Z" />
      <path d="M20 54l40 20 40-20M20 70l40 20 40-20" />
    </svg>
  );
}

const ILUSTRACIONES = [
  IlustracionRed,
  IlustracionBarras,
  IlustracionCodigo,
  IlustracionAtomo,
  IlustracionBrujula,
  IlustracionLibro,
  IlustracionCapas,
];

const FRASES = [
  "La lógica también es creatividad.",
  "Los datos también cuentan historias.",
  "Cada algoritmo esconde una idea simple.",
  "Lo abstracto se entiende mejor con ejemplos.",
  "Perderse un poco también es aprender.",
  "Leer despacio es leer mejor.",
  "Cada capa nueva se apoya en la anterior.",
];

export function pickIllustration(materiaId) {
  const idx = hashTexto(materiaId) % ILUSTRACIONES.length;
  return { Ilustracion: ILUSTRACIONES[idx], frase: FRASES[idx] };
}
