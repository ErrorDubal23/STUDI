// Utilidades de color/seleccion determinista compartidas por el sistema de
// diseño: mismo id de materia -> siempre el mismo icono/ilustracion/tono,
// sin necesidad de que el backend guarde esos campos.

export function hashTexto(texto) {
  let h = 0;
  const str = String(texto);
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function elegirPorHash(id, lista) {
  return lista[hashTexto(id) % lista.length];
}

export function tonoMasOscuro(hex, cantidad = 0.28) {
  const num = parseInt(hex.replace("#", ""), 16);
  const canal = (shift) => {
    const valor = (num >> shift) & 0xff;
    return Math.max(0, Math.round(valor * (1 - cantidad)));
  };
  const r = canal(16);
  const g = canal(8);
  const b = canal(0);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function conAlfa(hex, alfa) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alfa})`;
}

// Paleta pastel fija para los chips de temas -- rota por indice, no por
// materia, para que una misma tarjeta muestre variedad de colores como en
// la referencia (en vez de que todos los chips de una materia salgan del
// mismo tono).
export const PALETA_CHIPS = [
  "#2a78d6", // azul
  "#1baf7a", // verde
  "#7448c4", // violeta
  "#d03b3b", // rojo
  "#c07d1a", // ambar
  "#1a9fb0", // teal
];

// Colores por materia -- se asignan solos al crear (rotando por indice),
// en vez de pedirle al usuario que elija 2 tonos a mano cada vez.
export const PALETA_MATERIAS = [
  { light: "#2a78d6", dark: "#3987e5" }, // azul
  { light: "#1baf7a", dark: "#22c98c" }, // verde
  { light: "#eda100", dark: "#f5b52e" }, // amarillo
  { light: "#008300", dark: "#2ba82b" }, // verde oscuro
  { light: "#7448c4", dark: "#8a5fe0" }, // violeta
  { light: "#d03b3b", dark: "#e2554f" }, // rojo
  { light: "#1a9fb0", dark: "#30bdd0" }, // teal
  { light: "#c05a8f", dark: "#d876ab" }, // rosa
];

export function siguienteColorMateria(materiasExistentes) {
  return PALETA_MATERIAS[materiasExistentes.length % PALETA_MATERIAS.length];
}
