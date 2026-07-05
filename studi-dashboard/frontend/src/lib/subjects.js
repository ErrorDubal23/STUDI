// Mirrors backend/main.py SUBJECTS — single source of truth for names/colors
// per subject. If you edit one, edit the other.
export const SUBJECTS = [
  {
    id: "algoritmos",
    codigo: "IST4310",
    nombre: "Algoritmos y Complejidad",
    colorLight: "#2a78d6",
    colorDark: "#3987e5",
    horario: "Lunes 9-11",
  },
  {
    id: "analisis-datos",
    codigo: "EST7042",
    nombre: "Análisis de Datos en Ingeniería I",
    colorLight: "#1baf7a",
    colorDark: "#199e70",
    horario: "Martes, Miércoles, Jueves",
  },
  {
    id: "diseno-digital",
    codigo: "IST7072",
    nombre: "Diseño Digital",
    colorLight: "#eda100",
    colorDark: "#c98500",
    horario: "Miércoles, Jueves",
  },
  {
    id: "estructuras-discretas",
    codigo: "IST4330",
    nombre: "Estructuras Discretas",
    colorLight: "#008300",
    colorDark: "#008300",
    horario: "Martes, Jueves",
  },
  {
    id: "teoria-codigos",
    codigo: "MAT4215",
    nombre: "Teoría de Códigos",
    colorLight: "#4a3aa7",
    colorDark: "#9085e9",
    horario: "Lunes, Miércoles",
  },
];

export const SUBJECT_FALLBACK = {
  id: "otra",
  codigo: "",
  nombre: "Otra materia",
  colorLight: "#898781",
  colorDark: "#898781",
  horario: "",
};

export function subjectById(id) {
  return SUBJECTS.find((s) => s.id === id) || SUBJECT_FALLBACK;
}

const prefersDark = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;

export function subjectColor(id) {
  const subject = subjectById(id);
  return prefersDark() ? subject.colorDark : subject.colorLight;
}
