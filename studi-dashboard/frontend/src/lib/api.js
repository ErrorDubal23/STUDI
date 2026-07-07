const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Error ${res.status} en ${path}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function requestJSON(path, options = {}) {
  return request(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
}

export const api = {
  status: () => request("/status"),
  fichas: (materiaId) => request(`/fichas${materiaId ? `?materia=${materiaId}` : ""}`),
  ficha: (id) => request(`/fichas/${encodeURIComponent(id)}`),
  repaso: () => request("/repaso"),
  brightspace: (materiaId) => request(`/brightspace${materiaId ? `?materia=${materiaId}` : ""}`),
  calendario: () => request("/calendario"),

  materias: () => request("/materias"),
  crearMateria: (payload) => requestJSON("/materias", { method: "POST", body: JSON.stringify(payload) }),
  editarMateria: (id, payload) =>
    requestJSON(`/materias/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) }),
  borrarMateria: (id) => request(`/materias/${encodeURIComponent(id)}`, { method: "DELETE" }),
  nuevoSemestre: (etiqueta) => requestJSON("/semestre/nuevo", { method: "POST", body: JSON.stringify({ etiqueta }) }),

  subirAudio: (blob, materiaId, onProgress) =>
    new Promise((resolve, reject) => {
      const form = new FormData();
      const filename = `grabacion-${Date.now()}.webm`;
      form.append("file", blob, filename);
      if (materiaId) form.append("materia", materiaId);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${BASE}/audio`);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Error ${xhr.status} subiendo el audio`));
        }
      };
      xhr.onerror = () => reject(new Error("Error de red subiendo el audio"));
      xhr.send(form);
    }),

  generarTallerInteractivo: (materiaId, temas) =>
    requestJSON("/talleres/generar-interactivo", {
      method: "POST",
      body: JSON.stringify({ materia_id: materiaId, temas: temas && temas.length ? temas : undefined }),
    }),
  talleres: () => request("/talleres"),
  taller: (id) => request(`/talleres/${encodeURIComponent(id)}`),
  responderTaller: (id, numero, respuesta) =>
    requestJSON(`/talleres/${encodeURIComponent(id)}/responder`, {
      method: "POST",
      body: JSON.stringify({ numero, respuesta }),
    }),
  generarTallerDescargable: (materiaId, corteId) =>
    requestJSON("/talleres/generar-descargable", {
      method: "POST",
      body: JSON.stringify({ materia_id: materiaId, corte_id: corteId }),
    }),
};
