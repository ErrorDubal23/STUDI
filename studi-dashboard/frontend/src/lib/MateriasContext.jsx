import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api.js";

export const SUBJECT_FALLBACK = {
  id: "otra",
  codigo: "",
  nrc: "",
  profesor: "",
  nombre: "Otra materia",
  colorLight: "#898781",
  colorDark: "#898781",
  horario: [],
  salones: [],
  cortes: [],
  esExtracurricular: false,
};

function normalize(materia) {
  return {
    id: materia.id,
    codigo: materia.codigo || "",
    nrc: materia.nrc || "",
    profesor: materia.profesor || "",
    nombre: materia.nombre,
    colorLight: materia.color_light || SUBJECT_FALLBACK.colorLight,
    colorDark: materia.color_dark || SUBJECT_FALLBACK.colorDark,
    horario: materia.horario || [],
    salones: materia.salones || [],
    cortes: materia.cortes || [],
    esExtracurricular: !!materia.es_extracurricular,
  };
}

const MateriasContext = createContext(null);

export function MateriasProvider({ children }) {
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(
    () =>
      api
        .materias()
        .then((res) => setMaterias(res.map(normalize)))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const crear = useCallback((payload) => api.crearMateria(payload).then((res) => refresh().then(() => res)), [refresh]);
  const editar = useCallback(
    (id, payload) => api.editarMateria(id, payload).then((res) => refresh().then(() => res)),
    [refresh]
  );
  const borrar = useCallback((id) => api.borrarMateria(id).then((res) => refresh().then(() => res)), [refresh]);
  const nuevoSemestre = useCallback(
    (etiqueta) => api.nuevoSemestre(etiqueta).then((res) => refresh().then(() => res)),
    [refresh]
  );

  return (
    <MateriasContext.Provider value={{ materias, loading, error, refresh, crear, editar, borrar, nuevoSemestre }}>
      {children}
    </MateriasContext.Provider>
  );
}

export function useMaterias() {
  const ctx = useContext(MateriasContext);
  if (!ctx) throw new Error("useMaterias debe usarse dentro de <MateriasProvider>");
  return ctx;
}

export function useSubjectById(id) {
  const { materias } = useMaterias();
  return materias.find((s) => s.id === id) || SUBJECT_FALLBACK;
}
