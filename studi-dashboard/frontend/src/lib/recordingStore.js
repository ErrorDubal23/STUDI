// Persistencia de grabaciones en curso usando IndexedDB.
//
// El MediaRecorder normal solo guarda los chunks de audio en una variable en
// RAM: si iOS suspende o mata la pestaña (pantalla bloqueada, poca memoria),
// todo lo grabado se pierde de golpe. Aqui cada fragmento de audio se escribe
// en IndexedDB apenas se genera, para poder recuperar lo grabado hasta el
// momento del corte aunque la app nunca vuelva a ejecutar el codigo que
// termina la grabacion.

const DB_NAME = "studi-grabaciones";
const DB_VERSION = 1;
const STORE_SESIONES = "sesiones";
const STORE_FRAGMENTOS = "fragmentos";

let dbPromise = null;

function abrirDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SESIONES)) {
        db.createObjectStore(STORE_SESIONES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_FRAGMENTOS)) {
        const store = db.createObjectStore(STORE_FRAGMENTOS, { keyPath: "seq", autoIncrement: true });
        store.createIndex("sessionId", "sessionId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function conTransaccion(nombres, modo, fn) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(nombres, modo);
    let resultado;
    tx.oncomplete = () => resolve(resultado);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
    Promise.resolve(fn(tx)).then((r) => {
      resultado = r;
    });
  });
}

export async function crearSesion(materiaId) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await conTransaccion([STORE_SESIONES], "readwrite", (tx) => {
    tx.objectStore(STORE_SESIONES).put({ id, materiaId, startedAt: Date.now() });
  });
  return id;
}

export async function agregarFragmento(sessionId, blob) {
  await conTransaccion([STORE_FRAGMENTOS], "readwrite", (tx) => {
    tx.objectStore(STORE_FRAGMENTOS).add({ sessionId, blob });
  });
}

function getAll(store, query) {
  return new Promise((resolve, reject) => {
    const req = store.getAll(query);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listarSesionesPendientes() {
  return conTransaccion([STORE_SESIONES], "readonly", (tx) => getAll(tx.objectStore(STORE_SESIONES)));
}

export async function obtenerFragmentos(sessionId) {
  const registros = await conTransaccion([STORE_FRAGMENTOS], "readonly", (tx) =>
    getAll(tx.objectStore(STORE_FRAGMENTOS).index("sessionId"), sessionId)
  );
  return registros.sort((a, b) => a.seq - b.seq).map((r) => r.blob);
}

export async function eliminarSesion(sessionId) {
  await conTransaccion([STORE_SESIONES, STORE_FRAGMENTOS], "readwrite", async (tx) => {
    tx.objectStore(STORE_SESIONES).delete(sessionId);
    const fragmentos = tx.objectStore(STORE_FRAGMENTOS);
    const index = fragmentos.index("sessionId");
    await new Promise((resolve, reject) => {
      const req = index.openCursor(sessionId);
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
  });
}
