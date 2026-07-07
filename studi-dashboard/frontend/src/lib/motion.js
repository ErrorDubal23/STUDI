// Constantes de movimiento compartidas -- un solo lenguaje de animacion en
// toda la app en vez de duraciones/curvas inventadas por componente.

export const SPRING_SNAPPY = { type: "spring", stiffness: 500, damping: 32 };
export const SPRING_SOFT = { type: "spring", stiffness: 260, damping: 26 };

// Feedback de "prensado" universal para tarjetas y botones tocables.
export const TAP_PRESS = { scale: 0.97 };
