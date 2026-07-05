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

export const api = {
  status: () => request("/status"),
  fichas: (materiaId) => request(`/fichas${materiaId ? `?materia=${materiaId}` : ""}`),
  ficha: (id) => request(`/fichas/${encodeURIComponent(id)}`),
  repaso: () => request("/repaso"),
  brightspace: (materiaId) => request(`/brightspace${materiaId ? `?materia=${materiaId}` : ""}`),
  calendario: () => request("/calendario"),

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

  generarTaller: (materiaId, temas) => {
    const form = new FormData();
    form.append("materia_id", materiaId);
    form.append("temas", (temas || []).join(", "));
    return request("/talleres/generar", { method: "POST", body: form });
  },
};
